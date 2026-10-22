package handlers

import (
 "context"
 "errors"
 "net/http"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

// Release stock only AFTER payOS confirms that no transfer was collected.
// Repeated calls are safe and cannot release a reservation twice.
func (a *App) finalizePayOSCancellation(ctx context.Context,code int64) error {
 tx,err:=a.DB.Begin(ctx);if err!=nil{return err};defer tx.Rollback(ctx)
 var orderID,orderState,paymentState string
 err=tx.QueryRow(ctx,`SELECT o.id::text,o.status,o.payment_status
 FROM payment_attempts pa JOIN orders o ON o.id=pa.order_id
 WHERE pa.provider='PAYOS' AND pa.provider_order_code=$1 FOR UPDATE OF pa,o`,code).Scan(&orderID,&orderState,&paymentState)
 if err!=nil{return err}
 if orderState=="CANCELLED"{return nil}
 if paymentState=="PAID"{return errors.New("payment already received")}
 if orderState!="PENDING_CONFIRMATION"&&orderState!="CONFIRMED"&&orderState!="PREPARING"{return errors.New("order cannot be cancelled at this stage")}
 rows,err:=tx.Query(ctx,`SELECT variant_id::text,quantity FROM order_items WHERE order_id=$1 ORDER BY variant_id FOR UPDATE`,orderID)
 if err!=nil{return err}
 type line struct{id string;qty int};items:=[]line{}
 for rows.Next(){var v line;if err=rows.Scan(&v.id,&v.qty);err!=nil{break};items=append(items,v)}
 if err==nil{err=rows.Err()};rows.Close();if err!=nil{return err}
 for _,v:=range items{
  var remaining int
  err=tx.QueryRow(ctx,`UPDATE inventory SET reserved=reserved-$1 WHERE variant_id=$2 AND reserved>=$1 RETURNING reserved`,v.qty,v.id).Scan(&remaining)
  if err!=nil{return err}
  _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,order_id,movement_type,reserved_delta) VALUES($1,$2,'RELEASE',$3)`,v.id,orderID,-v.qty)
  if err!=nil{return err}
 }
 _,err=tx.Exec(ctx,`UPDATE orders SET status='CANCELLED' WHERE id=$1`,orderID);if err!=nil{return err}
 _,err=tx.Exec(ctx,`UPDATE payment_attempts SET status='CANCELLED',updated_at=now() WHERE provider='PAYOS' AND provider_order_code=$1`,code)
 if err!=nil{return err}
 return tx.Commit(ctx)
}

func (a *App) cancelPayOSOrder(c *gin.Context){
 token:=c.Param("token");if !validToken(token){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),14*time.Second);defer cancel()
 var method,paymentState,orderState string;var code *int64;var amount int64
 err:=a.DB.QueryRow(ctx,`SELECT o.payment_method,o.payment_status,o.status,o.total_vnd,pa.provider_order_code
 FROM orders o LEFT JOIN payment_attempts pa ON pa.order_id=o.id AND pa.provider='PAYOS' WHERE o.public_token=$1`,token).
 Scan(&method,&paymentState,&orderState,&amount,&code)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 if err!=nil{serverError(c,err);return}
 if method!="PAYOS"{c.JSON(409,gin.H{"error":"Đây không phải đơn payOS."});return}
 if orderState=="CANCELLED"{c.JSON(200,gin.H{"status":"CANCELLED"});return}
 if paymentState=="PAID"{c.JSON(409,gin.H{"error":"Đơn đã thanh toán; vui lòng liên hệ cửa hàng để xử lý."});return}
 if orderState!="PENDING_CONFIRMATION"||code==nil{c.JSON(409,gin.H{"error":"Đơn đang được xử lý hoặc chưa có link thanh toán; hãy liên hệ cửa hàng."});return}
 if !a.payOSReady(){c.JSON(503,gin.H{"error":"Chưa kết nối được payOS."});return}
 status,err:=a.payOS().Get(ctx,*code)
 if err!=nil||status.OrderCode!=*code||status.Amount!=amount{
  c.JSON(503,gin.H{"error":"Không xác minh được tình trạng thanh toán. Không hủy để tránh mất tiền."});return
 }
 if status.Status=="PAID"&&status.AmountPaid>=amount{
  _,err=a.DB.Exec(ctx,`UPDATE orders SET payment_status='PAID' WHERE public_token=$1 AND payment_status='UNPAID'`,token)
  if err!=nil{serverError(c,err);return}
  c.JSON(409,gin.H{"error":"Thanh toán đã được ngân hàng xác nhận, không thể hủy."});return
 }
 if status.AmountPaid>0{c.JSON(409,gin.H{"error":"Giao dịch đã có tiền được ghi nhận. Cần đối soát thủ công."});return}
 if status.Status!="CANCELLED"&&status.Status!="EXPIRED"{
  cancelled,e:=a.payOS().Cancel(ctx,*code)
  if e!=nil||cancelled.Status!="CANCELLED"||cancelled.Amount!=amount{
   c.JSON(503,gin.H{"error":"payOS chưa xác nhận hủy link, đơn vẫn được giữ nguyên."});return
  }
 }
 if err=a.finalizePayOSCancellation(ctx,*code);err!=nil{
  c.JSON(409,gin.H{"error":"Đã hủy link, nhưng chưa giải phóng được hàng. Vui lòng liên hệ cửa hàng."});return
 }
 c.JSON(http.StatusOK,gin.H{"status":"CANCELLED"})
}
