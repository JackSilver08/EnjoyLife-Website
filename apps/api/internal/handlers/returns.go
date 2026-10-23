package handlers

import (
 "context"
 "errors"
 "fmt"
 "net/http"
 "regexp"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

var rmaIDPattern=regexp.MustCompile(`^[a-fA-F0-9-]{36}$`)

type returnItemRequest struct {
 OrderItemID int64 `json:"order_item_id"`
 Quantity int `json:"quantity"`
}
type returnReceiptLine struct {
 ItemID string `json:"item_id"`
 Good int `json:"good"`
 Quarantined int `json:"quarantined"`
}
type orderReturnLine struct{ id int64; variant string; sold int; price int64 }

// adminOrderReturnItems provides original snapshots; never infer return limits
// from current product prices/variants or from a public order-token URL.
func(a *App) adminOrderReturnItems(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT oi.id,oi.sku_snapshot,oi.name_snapshot,oi.color_snapshot,oi.size_snapshot,
 oi.quantity,oi.unit_price_vnd,COALESCE((
 SELECT sum(ri.quantity)::int FROM return_case_items ri
 JOIN return_cases rc ON rc.id=ri.return_id
 WHERE ri.order_item_id=oi.id AND rc.status<>'REJECTED'),0)::int
 FROM order_items oi JOIN orders o ON o.id=oi.order_id
 WHERE o.order_no=$1 ORDER BY oi.id`,c.Param("no"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id int64;var sku,name,color,size string;var purchased,claimed int;var price int64
  if err=rows.Scan(&id,&sku,&name,&color,&size,&purchased,&price,&claimed);err!=nil{serverError(c,err);return}
  available:=purchased-claimed
  items=append(items,gin.H{"order_item_id":id,"sku":sku,"name":name,"color":color,"size":size,
   "quantity":purchased,"returnable":available,"unit_price_vnd":price})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) adminReturnList(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT r.id::text,r.rma_no,o.order_no,r.kind,r.status,r.refund_status,
 r.refund_amount_vnd,r.reason,r.created_at
 FROM return_cases r JOIN orders o ON o.id=r.order_id
 ORDER BY r.created_at DESC,r.id DESC LIMIT 150`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 list:=[]gin.H{}
 for rows.Next(){
  var id,no,order,kind,state,refund,reason string;var amount int64;var at time.Time
  if err=rows.Scan(&id,&no,&order,&kind,&state,&refund,&amount,&reason,&at);err!=nil{serverError(c,err);return}
  list=append(list,gin.H{"id":id,"rma_no":no,"order_no":order,"kind":kind,"status":state,
   "refund_status":refund,"refund_amount_vnd":amount,"reason":reason,"created_at":at})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":list})
}
func(a *App) adminReturnDetail(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 if !rmaIDPattern.MatchString(c.Param("id")){c.JSON(404,gin.H{"error":"Không tìm thấy phiếu RMA."});return}
 var number,order,kind,status,refund,reason,decision,received,reference string
 var amount int64;var at time.Time
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT r.rma_no,o.order_no,r.kind,r.status,r.refund_status,r.refund_amount_vnd,
 r.reason,r.decision_note,r.received_note,r.refund_reference,r.created_at
 FROM return_cases r JOIN orders o ON o.id=r.order_id WHERE r.id::text=$1`,c.Param("id")).
 Scan(&number,&order,&kind,&status,&refund,&amount,&reason,&decision,&received,&reference,&at)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy RMA."});return}
 if err!=nil{serverError(c,err);return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT ri.id::text,ri.order_item_id,oi.sku_snapshot,oi.name_snapshot,
 oi.color_snapshot,oi.size_snapshot,ri.quantity,ri.good_received,ri.quarantine_received,ri.unit_price_vnd
 FROM return_case_items ri JOIN order_items oi ON oi.id=ri.order_item_id
 WHERE ri.return_id::text=$1 ORDER BY ri.variant_id,ri.id`,c.Param("id"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,sku,name,color,size string;var orderItem int64;var qty,good,hold int;var price int64
  if err=rows.Scan(&id,&orderItem,&sku,&name,&color,&size,&qty,&good,&hold,&price);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"order_item_id":orderItem,"sku":sku,"name":name,"color":color,"size":size,
   "quantity":qty,"good_received":good,"quarantined_received":hold,"unit_price_vnd":price})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"id":c.Param("id"),"rma_no":number,"order_no":order,"kind":kind,"status":status,
  "refund_status":refund,"refund_amount_vnd":amount,"reason":reason,"decision_note":decision,
  "received_note":received,"refund_reference":reference,"created_at":at,"items":items})
}
func(a *App) adminReturnCreate(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct {
  OrderNo string `json:"order_no"`
  Kind string `json:"kind"`
  Reason string `json:"reason"`
  Items []returnItemRequest `json:"items"`
 }
 if c.ShouldBindJSON(&in)!=nil||len(in.Items)<1||len(in.Items)>30||
  len(strings.TrimSpace(in.Reason))<8||len(in.Reason)>500||
  (in.Kind!="CUSTOMER_RETURN"&&in.Kind!="DELIVERY_FAILED"){
  c.JSON(400,gin.H{"error":"Loại phiếu, lý do hoặc danh sách sản phẩm không hợp lệ."});return
 }
 claims:=map[int64]int{}
 for _,item:=range in.Items{
  if item.OrderItemID<=0||item.Quantity<1||item.Quantity>100||claims[item.OrderItemID]>0{
   c.JSON(400,gin.H{"error":"Dòng hàng trùng hoặc số lượng trả không hợp lệ."});return
  }
  claims[item.OrderItemID]=item.Quantity
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),9*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var orderID,state,payment,method string
 err=tx.QueryRow(ctx,`SELECT id::text,status,payment_status,payment_method
 FROM orders WHERE order_no=$1 FOR UPDATE`,in.OrderNo).Scan(&orderID,&state,&payment,&method)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy đơn."});return}
 if err!=nil{serverError(c,err);return}
 if (in.Kind=="CUSTOMER_RETURN"&&state!="DELIVERED"&&state!="COMPLETED")||
  (in.Kind=="DELIVERY_FAILED"&&state!="SHIPPING"){
  c.JSON(409,gin.H{"error":"Đổi trả cần đơn đã giao; giao thất bại cần đơn đang giao."});return
 }
 if in.Kind=="CUSTOMER_RETURN"&&payment!="PAID"{
  c.JSON(409,gin.H{"error":"Cần xác nhận đã thu tiền COD hoặc payOS trước khi lập phiếu khách đổi/trả."});return
 }
 if payment=="REVIEW_REQUIRED"{
  c.JSON(409,gin.H{"error":"Đơn đang đối soát thanh toán, chưa thể quyết định hoàn tiền."});return
 }
 if payment!="PAID"&&payment!="UNPAID"{
  c.JSON(409,gin.H{"error":"Trạng thái thanh toán chưa được hỗ trợ."});return
 }
 var existingFail bool
 if in.Kind=="DELIVERY_FAILED"{
  if err=tx.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM return_cases WHERE order_id=$1 AND kind='DELIVERY_FAILED' AND status<>'REJECTED')`,orderID).Scan(&existingFail);err!=nil{serverError(c,err);return}
  if existingFail{c.JSON(409,gin.H{"error":"Đơn đã có phiếu giao thất bại."});return}
 }
 rows,err:=tx.Query(ctx,`SELECT id,variant_id::text,quantity,unit_price_vnd FROM order_items
 WHERE order_id=$1 ORDER BY variant_id,id`,orderID)
 if err!=nil{serverError(c,err);return}
 lines:=[]orderReturnLine{}
 for rows.Next(){var l orderReturnLine;if err=rows.Scan(&l.id,&l.variant,&l.sold,&l.price);err!=nil{break};lines=append(lines,l)}
 if err==nil{err=rows.Err()};rows.Close()
 if err!=nil{serverError(c,err);return}
 matched:=0;var amount int64
 for _,line:=range lines{
  qty,ok:=claims[line.id];if !ok{
   if in.Kind=="DELIVERY_FAILED"{c.JSON(400,gin.H{"error":"Giao thất bại phải hoàn toàn bộ sản phẩm đã xuất."});return}
   continue
  }
  matched++
  if in.Kind=="DELIVERY_FAILED"&&qty!=line.sold{
   c.JSON(400,gin.H{"error":"Giao thất bại phải trả đủ từng SKU."});return
  }
  var claimed int
  err=tx.QueryRow(ctx,`SELECT COALESCE(sum(ri.quantity),0)::int FROM return_case_items ri
  JOIN return_cases rc ON rc.id=ri.return_id WHERE ri.order_item_id=$1 AND rc.status<>'REJECTED'`,line.id).Scan(&claimed)
  if err!=nil{serverError(c,err);return}
  if qty+claimed>line.sold{c.JSON(409,gin.H{"error":"Số trả vượt số lượng đã bán hoặc đã tạo RMA."});return}
  amount+=int64(qty)*line.price
 }
 if matched!=len(claims)||matched==0||in.Kind=="DELIVERY_FAILED"&&matched!=len(lines){
  c.JSON(400,gin.H{"error":"Sản phẩm trả không thuộc đơn hoặc chưa đủ số lượng."});return
 }
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 var seq int64
 if err=tx.QueryRow(ctx,`SELECT nextval('returns_rma_seq')`).Scan(&seq);err!=nil{serverError(c,err);return}
 number:=fmt.Sprintf("RMA-%06d",seq)
 refundState:="NOT_REQUIRED";if payment=="PAID"{refundState="PENDING"}
 _,err=tx.Exec(ctx,`INSERT INTO return_cases(id,rma_no,order_id,kind,refund_status,refund_amount_vnd,reason,created_by)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,id,number,orderID,in.Kind,refundState,amount,strings.TrimSpace(in.Reason),actor.ID)
 if err!=nil{serverError(c,err);return}
 for _,line:=range lines{
  qty,ok:=claims[line.id];if !ok{continue}
  itemID,e:=uuid();if e!=nil{serverError(c,e);return}
  if _,err=tx.Exec(ctx,`INSERT INTO return_case_items(id,return_id,order_item_id,variant_id,quantity,unit_price_vnd)
  VALUES($1,$2,$3,$4,$5,$6)`,itemID,id,line.id,line.variant,qty,line.price);err!=nil{serverError(c,err);return}
 }
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
 VALUES($1,'RMA_REQUEST',$2,$3)`,actor.ID,id,number+" "+in.Kind+" "+method);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(http.StatusCreated,gin.H{"id":id,"rma_no":number,"status":"REQUESTED","refund_status":refundState,"refund_amount_vnd":amount})
}
func(a *App) adminReturnDecision(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 if !rmaIDPattern.MatchString(c.Param("id")){c.JSON(404,gin.H{"error":"RMA không hợp lệ."});return}
 var in struct{Action string `json:"action"`;Note string `json:"note"`}
 if c.ShouldBindJSON(&in)!=nil||(in.Action!="APPROVE"&&in.Action!="REJECT")||
  len(strings.TrimSpace(in.Note))<6||len(in.Note)>500{
  c.JSON(400,gin.H{"error":"Cần quyết định và lý do duyệt/từ chối rõ ràng."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var status,orderID string
 err=tx.QueryRow(ctx,`SELECT status,order_id::text FROM return_cases WHERE id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&status,&orderID)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy phiếu."});return}
 if err!=nil{serverError(c,err);return}
 if status!="REQUESTED"{c.JSON(409,gin.H{"error":"Phiếu đã được xử lý."});return}
 next:="APPROVED";if in.Action=="REJECT"{next="REJECTED"}
 if _,err=tx.Exec(ctx,`UPDATE return_cases SET status=$1,decision_note=$2,reviewed_by=$3,reviewed_at=now()
 WHERE id::text=$4`,next,strings.TrimSpace(in.Note),actor.ID,c.Param("id"));err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
 VALUES($1,'RMA_DECISION',$2,$3)`,actor.ID,c.Param("id"),next);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":next})
}
func(a *App) adminReturnReceive(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 if !rmaIDPattern.MatchString(c.Param("id")){c.JSON(404,gin.H{"error":"RMA không hợp lệ."});return}
 var in struct{RequestKey string `json:"request_key"`;Note string `json:"note"`;Lines []returnReceiptLine `json:"lines"`}
 if c.ShouldBindJSON(&in)!=nil||!warehouseKeyPattern.MatchString(in.RequestKey)||
  len(in.Note)>500||len(in.Lines)<1||len(in.Lines)>30{
  c.JSON(400,gin.H{"error":"Biên bản nhận hàng không hợp lệ."});return
 }
 received:=map[string]returnReceiptLine{}
 for _,l:=range in.Lines{
  if !rmaIDPattern.MatchString(l.ItemID)||l.Good<0||l.Quarantined<0||
   l.Good+l.Quarantined<1||l.Good+l.Quarantined>100||received[l.ItemID].ItemID!=""{
   c.JSON(400,gin.H{"error":"Số lượng hàng đạt/cách ly hoặc dòng trùng không hợp lệ."});return
  }
  received[l.ItemID]=l
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),10*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var status,kind,orderID,oldKey string
 err=tx.QueryRow(ctx,`SELECT status,kind,order_id::text,COALESCE(receipt_key,'')
 FROM return_cases WHERE id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&status,&kind,&orderID,&oldKey)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy RMA."});return}
 if err!=nil{serverError(c,err);return}
 if oldKey!=""&&oldKey==in.RequestKey{
  c.JSON(200,gin.H{"status":status,"idempotent":true});return
 }
 if status!="APPROVED"{c.JSON(409,gin.H{"error":"Phiếu chưa được duyệt hoặc đã nhận hàng."});return}
 type line struct{id,variant string;qty int}
 lines:=[]line{}
 rows,err:=tx.Query(ctx,`SELECT id::text,variant_id::text,quantity FROM return_case_items
 WHERE return_id::text=$1 ORDER BY variant_id,id FOR UPDATE`,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 for rows.Next(){var l line;if err=rows.Scan(&l.id,&l.variant,&l.qty);err!=nil{break};lines=append(lines,l)}
 if err==nil{err=rows.Err()};rows.Close()
 if err!=nil{serverError(c,err);return}
 if len(received)!=len(lines){c.JSON(400,gin.H{"error":"Phải kiểm tra tất cả dòng của phiếu đã duyệt."});return}
 for _,l:=range lines{
  v,ok:=received[l.id];if !ok||v.Good+v.Quarantined!=l.qty{
   c.JSON(409,gin.H{"error":"Số hàng nhận phải bằng số lượng từng dòng được duyệt."});return
  }
 }
 for _,l:=range lines{
  v:=received[l.id]
  var count int
  err=tx.QueryRow(ctx,`UPDATE inventory SET on_hand=on_hand+$1,unavailable=unavailable+$2
  WHERE variant_id::text=$3 AND on_hand+$1<=100000 RETURNING on_hand`,
   v.Good+v.Quarantined,v.Quarantined,l.variant).Scan(&count)
  if err!=nil{c.JSON(409,gin.H{"error":"Không thể cộng hàng hoàn vào tồn thực tế."});return}
  if _,err=tx.Exec(ctx,`UPDATE return_case_items SET good_received=$1,quarantine_received=$2 WHERE id::text=$3`,
   v.Good,v.Quarantined,l.id);err!=nil{serverError(c,err);return}
  if v.Good>0{
   if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,order_id,movement_type,on_hand_delta,reason,actor_id)
   VALUES($1,$2,'RETURN_GOOD',$3,$4,$5)`,l.variant,orderID,v.Good,"RMA "+c.Param("id"),actor.ID);err!=nil{serverError(c,err);return}
  }
  if v.Quarantined>0{
   if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,order_id,movement_type,on_hand_delta,reason,actor_id)
   VALUES($1,$2,'RETURN_QC_HOLD',$3,$4,$5)`,l.variant,orderID,v.Quarantined,"RMA "+c.Param("id"),actor.ID);err!=nil{serverError(c,err);return}
  }
 }
 // A failed delivery must only move to RETURNED when the shipment physically
 // comes back. Do not release reservations: they were consumed at SHIPPING.
 if kind=="DELIVERY_FAILED"{
  var state string
  if err=tx.QueryRow(ctx,`SELECT status FROM orders WHERE id=$1 FOR UPDATE`,orderID).Scan(&state);err!=nil{serverError(c,err);return}
  if state!="SHIPPING"{c.JSON(409,gin.H{"error":"Trạng thái đơn đã thay đổi khi đang hoàn hàng."});return}
  if _,err=tx.Exec(ctx,`UPDATE orders SET status='RETURNED' WHERE id=$1`,orderID);err!=nil{serverError(c,err);return}
 }
 next:="RECEIVED"
 var refund string
 if err=tx.QueryRow(ctx,`SELECT refund_status FROM return_cases WHERE id::text=$1`,c.Param("id")).Scan(&refund);err!=nil{serverError(c,err);return}
 if refund=="NOT_REQUIRED"{next="CLOSED"}
 if _,err=tx.Exec(ctx,`UPDATE return_cases SET status=$1,received_note=$2,receipt_key=$3,
 received_by=$4,received_at=now() WHERE id::text=$5`,next,strings.TrimSpace(in.Note),in.RequestKey,actor.ID,c.Param("id"));err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
 VALUES($1,'RMA_RECEIVED',$2,$3)`,actor.ID,c.Param("id"),"QC received");err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"status":next,"idempotent":false})
}
func(a *App) adminReturnRefund(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 if !rmaIDPattern.MatchString(c.Param("id")){c.JSON(404,gin.H{"error":"RMA không hợp lệ."});return}
 var in struct{Reference string `json:"reference"`;AmountVND int64 `json:"amount_vnd"`}
 if c.ShouldBindJSON(&in)!=nil||len(strings.TrimSpace(in.Reference))<8||len(in.Reference)>120||in.AmountVND<1{
  c.JSON(400,gin.H{"error":"Cần số tiền và mã đối soát hoàn tiền thực tế."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),8*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var status,refund string;var amount int64
 err=tx.QueryRow(ctx,`SELECT status,refund_status,refund_amount_vnd FROM return_cases
 WHERE id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&status,&refund,&amount)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy RMA."});return}
 if err!=nil{serverError(c,err);return}
 if status!="RECEIVED"||refund!="PENDING"||amount!=in.AmountVND{
  c.JSON(409,gin.H{"error":"Chỉ ghi nhận khoản hoàn đã thực hiện bên ngoài, sau khi nhận hàng và đúng số tiền."});return
 }
 _,err=tx.Exec(ctx,`UPDATE return_cases SET refund_status='CONFIRMED',status='CLOSED',
 refund_reference=$1,refunded_at=now(),refunded_by=$2 WHERE id::text=$3`,
  strings.TrimSpace(in.Reference),actor.ID,c.Param("id"))
 if err!=nil{
  c.JSON(409,gin.H{"error":"Mã tham chiếu hoàn tiền đã được sử dụng hoặc không hợp lệ."});return
 }
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
 VALUES($1,'RMA_REFUND_CONFIRMED',$2,$3)`,actor.ID,c.Param("id"),"Manual refund recorded; independent proof required");err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"CLOSED","refund_status":"CONFIRMED","note":"Chỉ ghi nhận chuyển tiền bên ngoài, hệ thống không tự chuyển tiền."})
}

// No Go provider refund call exists in Sprint 11. Never mark paid payOS funds
// as refunded merely because a user opens, approves or receives an RMA.
