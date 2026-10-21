package handlers

import (
 "context"
 "errors"
 "net/http"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

var orderTransitions=map[string]map[string]bool{
 "PENDING_CONFIRMATION":{"CONFIRMED":true,"CANCELLED":true},
 "CONFIRMED":{"PREPARING":true,"CANCELLED":true},
 "PREPARING":{"SHIPPING":true,"CANCELLED":true},
 "SHIPPING":{"DELIVERED":true},
 "DELIVERED":{"COMPLETED":true},
}
func canTransition(current,next string)bool{return orderTransitions[current][next]}

func(a *App) adminChangeOrderStatus(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var req struct{Status string `json:"status"`}
 if c.ShouldBindJSON(&req)!=nil {c.JSON(400,gin.H{"error":"Trạng thái không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),8*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var id,current string
 err=tx.QueryRow(ctx,`SELECT id::text,status FROM orders WHERE order_no=$1 FOR UPDATE`,c.Param("no")).Scan(&id,&current)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(http.StatusNotFound,gin.H{"error":"Không tìm thấy đơn hàng."});return}
 if err!=nil{serverError(c,err);return}
 if !canTransition(current,req.Status){c.JSON(409,gin.H{"error":"Chuyển trạng thái không hợp lệ."});return}
 // Keep the original reservations until packing/shipping or cancellation.
 if req.Status=="CANCELLED"||req.Status=="SHIPPING"{
  rows,queryErr:=tx.Query(ctx,`SELECT variant_id::text,quantity FROM order_items WHERE order_id=$1 ORDER BY variant_id FOR UPDATE`,id)
  if queryErr!=nil{serverError(c,queryErr);return}
  type line struct{id string;qty int}
  lines:=[]line{}
  for rows.Next(){var item line;if queryErr=rows.Scan(&item.id,&item.qty);queryErr!=nil{break};lines=append(lines,item)}
  if queryErr==nil{queryErr=rows.Err()};rows.Close()
  if queryErr!=nil{serverError(c,queryErr);return}
  for _,item:=range lines {
   // A single UPDATE atomically locks the inventory row and prevents negatives.
   var result pgx.Row
   if req.Status=="CANCELLED"{
    result=tx.QueryRow(ctx,`UPDATE inventory SET reserved=reserved-$1 WHERE variant_id=$2 AND reserved >= $1 RETURNING reserved`,item.qty,item.id)
   }else{
    result=tx.QueryRow(ctx,`UPDATE inventory SET reserved=reserved-$1,on_hand=on_hand-$1 WHERE variant_id=$2 AND reserved >= $1 AND on_hand >= $1 RETURNING reserved`,item.qty,item.id)
   }
   var left int
   if queryErr=result.Scan(&left);queryErr!=nil{c.JSON(409,gin.H{"error":"Tồn kho không nhất quán, cần kiểm tra trước khi đổi trạng thái."});return}
   move:="RELEASE";onHandDelta:=0
   if req.Status=="SHIPPING"{move="SHIP";onHandDelta= -item.qty}
   _,queryErr=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,order_id,movement_type,on_hand_delta,reserved_delta) VALUES($1,$2,$3,$4,$5)`,item.id,id,move,onHandDelta,-item.qty)
   if queryErr!=nil{serverError(c,queryErr);return}
  }
 }
 _,err=tx.Exec(ctx,`UPDATE orders SET status=$1 WHERE id=$2`,req.Status,id)
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'ORDER_STATUS',$2,$3)`,actor.ID,id,current+" -> "+req.Status)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"order_no":c.Param("no"),"status":req.Status})
}

func(a *App) adminMarkCODPaid(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var id,method,payment,status string
 err=tx.QueryRow(ctx,`SELECT id::text,payment_method,payment_status,status FROM orders WHERE order_no=$1 FOR UPDATE`,c.Param("no")).Scan(&id,&method,&payment,&status)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 if err!=nil{serverError(c,err);return}
 if method!="COD"||payment!="UNPAID"||(status!="DELIVERED"&&status!="COMPLETED"){c.JSON(409,gin.H{"error":"Chỉ xác nhận thu COD sau khi đơn đã giao."});return}
 _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='PAID' WHERE id=$1`,id)
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'COD_PAID',$2,'Admin confirmed COD collection')`,actor.ID,id)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok","payment_status":"PAID"})
}
