package handlers

import (
 "context"
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "net/http"
  "strings"
 "time"

 "github.com/enjoy-life/store-api/internal/payment"
 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

func (a *App) payOS() payment.PayOS {
 return payment.PayOS{ClientID:a.Config.PayOSClientID,APIKey:a.Config.PayOSAPIKey,ChecksumKey:a.Config.PayOSChecksumKey,BaseURL:a.Config.PayOSBaseURL}
}
func (a *App) payOSReady()bool{
 u:=strings.TrimSuffix(a.Config.WebOrigin,"/")
 return a.Config.PaymentEnabled && a.Config.PayOSClientID!="" && a.Config.PayOSAPIKey!="" && a.Config.PayOSChecksumKey!="" &&
 (strings.HasPrefix(u,"https://") || (strings.HasPrefix(u,"http://localhost:") && strings.TrimSpace(u)!=""))
}
func validToken(s string)bool{
 if len(s)!=48{return false}
 _,err:=hex.DecodeString(s);return err==nil
}
func (a *App) createPayOSLink(c *gin.Context){
 if !a.payOSReady(){c.JSON(http.StatusServiceUnavailable,gin.H{"error":"Chưa cấu hình kênh thanh toán payOS."});return}
 token:=c.Param("token");if !validToken(token){c.JSON(404,gin.H{"error":"Không tìm thấy đơn hàng."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),12*time.Second);defer cancel()
 var id,method,paymentState,orderState string;var amount int64
 err:=a.DB.QueryRow(ctx,`SELECT id::text,payment_method,payment_status,status,total_vnd FROM orders WHERE public_token=$1`,token).Scan(&id,&method,&paymentState,&orderState,&amount)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 if err!=nil{serverError(c,err);return}
 if method!="PAYOS"||paymentState!="UNPAID"||orderState=="CANCELLED"||amount<1000{
  c.JSON(409,gin.H{"error":"Đơn hàng không thể tạo thanh toán QR."});return
 }
 attemptID,err:=uuid();if err!=nil{serverError(c,err);return}
 // Unique order constraint prevents multiple links when customer retries.
 inserted,err:=a.DB.Exec(ctx,`INSERT INTO payment_attempts(id,order_id,provider,status,provider_order_code)
 VALUES($1,$2,'PAYOS','CREATING',nextval('payos_order_code_seq')) ON CONFLICT DO NOTHING`,attemptID,id)
 if err!=nil{serverError(c,err);return}
 created:=inserted.RowsAffected()>0
 var code int64;var checkout,qr,state string;var updated time.Time
 err=a.DB.QueryRow(ctx,`SELECT provider_order_code,COALESCE(checkout_url,''),COALESCE(qr_code,''),status,updated_at
 FROM payment_attempts WHERE order_id=$1 AND provider='PAYOS'`,id).Scan(&code,&checkout,&qr,&state,&updated)
 if err!=nil{serverError(c,err);return}
 if state=="ERROR"||state=="REVIEW_REQUIRED"{
  c.JSON(409,gin.H{"error":"Giao dịch cần được đối soát trước khi thử lại. Vui lòng liên hệ cửa hàng."});return
 }
 if checkout!=""{
  c.JSON(200,gin.H{"checkout_url":checkout,"qr_code":qr,"order_code":code,"payment_status":paymentState});return
 }
 if state=="CREATING"&&!created&&time.Since(updated)<20*time.Second{
  c.JSON(202,gin.H{"error":"Đang chuẩn bị mã QR. Vui lòng thử lại trong giây lát."});return
 }
 _,err=a.DB.Exec(ctx,`UPDATE payment_attempts SET status='CREATING',updated_at=now() WHERE order_id=$1 AND provider='PAYOS'`,id)
 if err!=nil{serverError(c,err);return}
 origin:=strings.TrimSuffix(a.Config.WebOrigin,"/")
 returnURL:=origin+"/orders/"+token
 cancelURL:=origin+"/orders/"+token+"?payment=cancelled"
 link,err:=a.payOS().Create(ctx,code,amount,returnURL,cancelURL)
 if err!=nil{
  // Do not create a different payOS order code: request may have succeeded upstream.
  _,_=a.DB.Exec(ctx,`UPDATE payment_attempts SET status='REVIEW_REQUIRED',updated_at=now() WHERE order_id=$1 AND provider='PAYOS' AND checkout_url IS NULL`,id)
  c.JSON(502,gin.H{"error":"Không tạo được link payOS. Đơn được giữ nguyên để kiểm tra, không tạo thanh toán thứ hai."});return
 }
 _,err=a.DB.Exec(ctx,`UPDATE payment_attempts SET status='PENDING',checkout_url=$2,qr_code=$3,provider_reference=$4,updated_at=now()
 WHERE order_id=$1 AND provider='PAYOS' AND provider_order_code=$5`,id,link.CheckoutURL,link.QR,link.PaymentLinkID,code)
 if err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"checkout_url":link.CheckoutURL,"qr_code":link.QR,"order_code":code,"payment_status":"UNPAID"})
}
func (a *App) payOSWebhook(c *gin.Context){
 if !a.payOSReady(){c.JSON(503,gin.H{"error":"Gateway disabled"});return}
 c.Request.Body=http.MaxBytesReader(c.Writer,c.Request.Body,32768)
 var raw json.RawMessage
 if err:=c.ShouldBindJSON(&raw);err!=nil{c.JSON(400,gin.H{"error":"Invalid webhook"});return}
 notice,err:=payment.VerifyWebhook(raw,a.Config.PayOSChecksumKey)
 if err!=nil{c.JSON(400,gin.H{"error":"Invalid signature"});return}
 // payOS sends a signed sample webhook to test the configured URL.
 if !notice.Success||notice.Code!="00"||notice.Data.Code!="00"||notice.Data.OrderCode<=0||notice.Data.Amount<=0{
  c.JSON(200,gin.H{"status":"ignored"});return
 }
 if notice.Data.Currency!="VND"{c.JSON(400,gin.H{"error":"Invalid currency"});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var attemptID,orderID,ref,oldStatus,orderState string;var amount int64
 err=tx.QueryRow(ctx,`SELECT pa.id::text,pa.order_id::text,COALESCE(pa.provider_reference,''),o.payment_status,o.status,o.total_vnd
 FROM payment_attempts pa JOIN orders o ON o.id=pa.order_id
 WHERE pa.provider='PAYOS' AND pa.provider_order_code=$1 FOR UPDATE OF pa,o`,notice.Data.OrderCode).Scan(&attemptID,&orderID,&ref,&oldStatus,&orderState,&amount)
 if errors.Is(err,pgx.ErrNoRows){
  // Unknown signed test events do not modify any real orders.
  c.JSON(200,gin.H{"status":"ignored"});return
 }
 if err!=nil{serverError(c,err);return}
 if ref=="" || ref!=notice.Data.PaymentLinkID{
  c.JSON(409,gin.H{"error":"Webhook/order mismatch"});return
 }
 // Persist every verified transfer (including partial or late funds) for audit.
 reference:=notice.Data.Reference
 if reference==""{sum:=sha256.Sum256(raw);reference=hex.EncodeToString(sum[:])}
 key:=fmt.Sprintf("PAYOS:%d:%s",notice.Data.OrderCode,reference)
 sanitized,_:=json.Marshal(gin.H{"order_code":notice.Data.OrderCode,"amount":notice.Data.Amount,"reference":notice.Data.Reference,"event":"VERIFIED_TRANSFER"})
 _,err=tx.Exec(ctx,`INSERT INTO payment_events(attempt_id,external_event_key,provider,signature_verified,payload)
 VALUES($1,$2,'PAYOS',true,$3) ON CONFLICT(external_event_key) DO NOTHING`,attemptID,key,sanitized)
 if err!=nil{serverError(c,err);return}
 if amount!=notice.Data.Amount {
  // Valid signed partial/overpayments require a manual refund/reconciliation.
  // Never mark an order PAID for a transfer of a different amount.
  _,err=tx.Exec(ctx,`UPDATE payment_attempts SET status='REVIEW_REQUIRED',updated_at=now() WHERE id=$1`,attemptID)
  if err!=nil{serverError(c,err);return}
  _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='REVIEW_REQUIRED' WHERE id=$1 AND payment_status='UNPAID'`,orderID)
  if err!=nil{serverError(c,err);return}
  if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
  c.JSON(200,gin.H{"status":"review_required"});return
 }
 if orderState=="CANCELLED"||oldStatus=="REVIEW_REQUIRED"{
  // Never silently resurrect an order whose reserved stock was already released.
  _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='REVIEW_REQUIRED' WHERE id=$1`,orderID)
  if err!=nil{serverError(c,err);return}
  _,err=tx.Exec(ctx,`UPDATE payment_attempts SET status='REVIEW_REQUIRED',updated_at=now() WHERE id=$1`,attemptID)
  if err!=nil{serverError(c,err);return}
  if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
  c.JSON(200,gin.H{"status":"review_required"});return
 }
 if oldStatus!="PAID"{
  _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='PAID' WHERE id=$1 AND payment_method='PAYOS' AND payment_status='UNPAID'`,orderID)
  if err!=nil{serverError(c,err);return}
 }
 _,err=tx.Exec(ctx,`UPDATE payment_attempts SET status='PAID',updated_at=now() WHERE id=$1`,attemptID)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok"})
}
func (a *App) payOSStatus(c *gin.Context){
 token:=c.Param("token");if !validToken(token){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 var code *int64;var state,attemptState string;var amount int64
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT pa.provider_order_code,o.payment_status,pa.status,o.total_vnd
 FROM payment_attempts pa JOIN orders o ON o.id=pa.order_id WHERE o.public_token=$1 AND pa.provider='PAYOS'`,token).Scan(&code,&state,&attemptState,&amount)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không có giao dịch payOS."});return}
 if err!=nil{serverError(c,err);return}
 if state=="PAID"{c.JSON(200,gin.H{"payment_status":"PAID"});return}
 if state=="REVIEW_REQUIRED"||attemptState=="REVIEW_REQUIRED"{c.JSON(200,gin.H{"payment_status":"REVIEW_REQUIRED"});return}
 if !a.payOSReady()||code==nil{c.JSON(503,gin.H{"error":"Kênh thanh toán chưa khả dụng."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 provider,err:=a.payOS().Get(ctx,*code)
 if err!=nil{c.JSON(503,gin.H{"payment_status":state,"error":"Chưa xác minh được trạng thái từ payOS."});return}
 if provider.Amount!=amount || provider.OrderCode!=*code {c.JSON(409,gin.H{"error":"Thông tin giao dịch không khớp."});return}
 if provider.Status=="PAID"&&provider.AmountPaid>=amount{
  // Lock both order and attempt: cancellation may race this provider check.
  finalState,err:=a.recordProviderPaid(ctx,*code,amount)
  if err!=nil{serverError(c,err);return}
  c.JSON(200,gin.H{"payment_status":finalState});return
 }
 if (provider.Status=="CANCELLED"||provider.Status=="EXPIRED")&&provider.AmountPaid==0 {
  if err=a.finalizePayOSCancellation(ctx,*code);err!=nil{
   c.JSON(503,gin.H{"payment_status":state,"error":"payOS đã kết thúc giao dịch nhưng hệ thống chưa đồng bộ được đơn."});return
  }
  c.JSON(200,gin.H{"payment_status":"UNPAID","provider_status":provider.Status,"order_status":"CANCELLED"});return
 }
 c.JSON(200,gin.H{"payment_status":state,"provider_status":provider.Status})
}
func (a *App) cancelPayOS(c *gin.Context){
 a.cancelPayOSOrder(c)
}

 // recordProviderPaid atomically reconciles a trusted payOS status response.
 // A canceled order can have its stock released; a late transfer needs a human,
 // never automatic reinstatement or fulfilment.
func (a *App) recordProviderPaid(ctx context.Context,code,amount int64)(string,error){
 tx,err:=a.DB.Begin(ctx);if err!=nil{return "",err};defer tx.Rollback(ctx)
 var attemptID,orderID,orderState,paymentState string;var storedAmount int64
 err=tx.QueryRow(ctx,`SELECT pa.id::text,o.id::text,o.status,o.payment_status,o.total_vnd
 FROM payment_attempts pa JOIN orders o ON o.id=pa.order_id
 WHERE pa.provider='PAYOS' AND pa.provider_order_code=$1 FOR UPDATE OF pa,o`,code).
 Scan(&attemptID,&orderID,&orderState,&paymentState,&storedAmount)
 if err!=nil{return "",err}
 if storedAmount!=amount{return "",errors.New("payOS amount mismatch")}
 result:="PAID"
 if orderState=="CANCELLED"||paymentState=="REVIEW_REQUIRED"{
  result="REVIEW_REQUIRED"
  _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='REVIEW_REQUIRED' WHERE id=$1`,orderID)
  if err!=nil{return "",err}
 }else if paymentState=="UNPAID"{
  _,err=tx.Exec(ctx,`UPDATE orders SET payment_status='PAID' WHERE id=$1`,orderID)
  if err!=nil{return "",err}
 }else if paymentState!="PAID"{
  return "",errors.New("unexpected payment state")
 }
 _,err=tx.Exec(ctx,`UPDATE payment_attempts SET status=$2,updated_at=now() WHERE provider='PAYOS' AND provider_order_code=$1`,code,result)
 if err!=nil{return "",err}
 // Explicitly record authenticated provider checks. Unlike a verified webhook
 // signature, this evidence is server-to-server and signature_verified=false.
 audit,_:=json.Marshal(gin.H{"order_code":code,"amount":amount,"event":"PROVIDER_STATUS_PAID","result":result})
 _,err=tx.Exec(ctx,`INSERT INTO payment_events(attempt_id,external_event_key,provider,signature_verified,payload)
 VALUES($1,$2,'PAYOS',false,$3) ON CONFLICT(external_event_key) DO NOTHING`,attemptID,fmt.Sprintf("PAYOS:%d:PROVIDER_STATUS_PAID",code),audit)
 if err!=nil{return "",err}
 if err=tx.Commit(ctx);err!=nil{return "",err}
 return result,nil
}
