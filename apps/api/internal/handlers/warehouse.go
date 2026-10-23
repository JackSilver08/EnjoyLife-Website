package handlers

import (
 "context"
 "errors"
 "fmt"
 "math"
 "net/http"
 "net/mail"
 "regexp"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

type newPurchaseItem struct {
 VariantID string `json:"variant_id"`
 Quantity int `json:"quantity"`
 UnitCost int64 `json:"unit_cost_vnd"`
}
type receivingLine struct {
 ItemID string `json:"item_id"`
 Accepted int `json:"accepted"`
 Quarantined int `json:"quarantined"`
}
var warehouseKeyPattern=regexp.MustCompile(`^[A-Za-z0-9_-]{8,100}$`)

func (a *App) warehouseSuppliers(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT id::text,name,contact,lead_days,active FROM warehouse_suppliers ORDER BY name LIMIT 200`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,name,contact string;var days int;var active bool
  if err=rows.Scan(&id,&name,&contact,&days,&active);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"name":name,"contact":contact,"lead_days":days,"active":active})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) warehouseSupplierCreate(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{Name string `json:"name"`;Contact string `json:"contact"`;LeadDays int `json:"lead_days"`}
 if c.ShouldBindJSON(&in)!=nil{c.JSON(400,gin.H{"error":"Thông tin nhà cung cấp không hợp lệ."});return}
 in.Name=strings.TrimSpace(in.Name);in.Contact=strings.TrimSpace(in.Contact)
 if len(in.Name)<2||len(in.Name)>120||len(in.Contact)>150||in.LeadDays<1||in.LeadDays>365{c.JSON(400,gin.H{"error":"Tên từ 2-120 ký tự, thời gian nhập từ 1-365 ngày."});return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 if _,err=tx.Exec(ctx,`INSERT INTO warehouse_suppliers(id,name,contact,lead_days) VALUES($1,$2,$3,$4)`,id,in.Name,in.Contact,in.LeadDays);err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'SUPPLIER_CREATE',$2,$3)`,actor.ID,id,in.Name);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"id":id,"name":in.Name})
}
func(a *App) warehousePurchaseList(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT po.id::text,po.po_no,s.name,po.status,po.note,
 COALESCE(po.expected_date::text,''),po.created_at,
 COALESCE(sum(pi.quantity),0)::int,COALESCE(sum(pi.received),0)::int
 FROM warehouse_purchase_orders po JOIN warehouse_suppliers s ON s.id=po.supplier_id
 JOIN warehouse_purchase_items pi ON pi.po_id=po.id
 GROUP BY po.id,s.name ORDER BY po.created_at DESC LIMIT 150`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,number,supplier,status,note,expected string;var date time.Time;var quantity,received int
  if err=rows.Scan(&id,&number,&supplier,&status,&note,&expected,&date,&quantity,&received);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"po_no":number,"supplier":supplier,"status":status,"note":note,"expected_date":expected,"created_at":date,"quantity":quantity,"received":received})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) warehousePurchaseCreate(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{SupplierID string `json:"supplier_id"`;ExpectedDate string `json:"expected_date"`;Note string `json:"note"`;Items []newPurchaseItem `json:"items"`}
 if c.ShouldBindJSON(&in)!=nil||len(in.Items)<1||len(in.Items)>30||len(in.Note)>300{c.JSON(400,gin.H{"error":"Phiếu đặt nhập phải có từ 1 đến 30 SKU."});return}
 if in.ExpectedDate!=""{if _,err:=time.Parse("2006-01-02",in.ExpectedDate);err!=nil{c.JSON(400,gin.H{"error":"Ngày dự kiến không hợp lệ."});return}}
 seen:=map[string]bool{}
 for _,item:=range in.Items {
  if item.Quantity<1||item.Quantity>10000||item.UnitCost<1||item.UnitCost>=1000000000||seen[item.VariantID]{
   c.JSON(400,gin.H{"error":"SKU trùng hoặc số lượng/giá vốn không hợp lệ."});return
  }
  seen[item.VariantID]=true
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),10*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var supplierExists bool
 if err=tx.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM warehouse_suppliers WHERE id::text=$1 AND active)`,in.SupplierID).Scan(&supplierExists);err!=nil{serverError(c,err);return}
 if !supplierExists{c.JSON(400,gin.H{"error":"Nhà cung cấp không khả dụng."});return}
 for _,item:=range in.Items {
  var exists bool
  if err=tx.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id::text=$1 AND p.archived_at IS NULL)`,item.VariantID).Scan(&exists);err!=nil{serverError(c,err);return}
  if !exists{c.JSON(400,gin.H{"error":"SKU không tồn tại hoặc đã lưu trữ."});return}
 }
 poID,err:=uuid();if err!=nil{serverError(c,err);return}
 var seq int64
 if err=tx.QueryRow(ctx,`SELECT nextval('warehouse_po_seq')`).Scan(&seq);err!=nil{serverError(c,err);return}
 number:=fmt.Sprintf("PO-%06d",seq)
 var expected any
 if in.ExpectedDate!=""{expected=in.ExpectedDate}
 _,err=tx.Exec(ctx,`INSERT INTO warehouse_purchase_orders(id,po_no,supplier_id,expected_date,note,created_by)
 VALUES($1,$2,$3,$4,$5,$6)`,poID,number,in.SupplierID,expected,strings.TrimSpace(in.Note),actor.ID)
 if err!=nil{serverError(c,err);return}
 for _,item:=range in.Items {
  lineID,idErr:=uuid();if idErr!=nil{serverError(c,idErr);return}
  if _,err=tx.Exec(ctx,`INSERT INTO warehouse_purchase_items(id,po_id,variant_id,quantity,unit_cost_vnd)
 VALUES($1,$2,$3,$4,$5)`,lineID,poID,item.VariantID,item.Quantity,item.UnitCost);err!=nil{serverError(c,err);return}
 }
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PO_CREATE',$2,$3)`,actor.ID,poID,number);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"id":poID,"po_no":number,"status":"ORDERED"})
}
func(a *App) warehousePurchaseDetail(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 var number,status,supplier,note,expected string
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT po.po_no,po.status,s.name,po.note,COALESCE(po.expected_date::text,'')
 FROM warehouse_purchase_orders po JOIN warehouse_suppliers s ON s.id=po.supplier_id
 WHERE po.id::text=$1`,c.Param("id")).Scan(&number,&status,&supplier,&note,&expected)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy phiếu."});return}
 if err!=nil{serverError(c,err);return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT pi.id::text,pi.variant_id::text,p.name,v.sku,v.color,v.size,
 pi.quantity,pi.received,pi.unit_cost_vnd FROM warehouse_purchase_items pi
 JOIN product_variants v ON v.id=pi.variant_id JOIN products p ON p.id=v.product_id
 WHERE pi.po_id::text=$1 ORDER BY v.sku`,c.Param("id"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,variant,name,sku,color,size string;var quantity,received int;var cost int64
  if err=rows.Scan(&id,&variant,&name,&sku,&color,&size,&quantity,&received,&cost);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"variant_id":variant,"name":name,"sku":sku,"color":color,"size":size,"quantity":quantity,"received":received,"remaining":quantity-received,"unit_cost_vnd":cost})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"id":c.Param("id"),"po_no":number,"status":status,"supplier":supplier,"note":note,"expected_date":expected,"items":items})
}
func(a *App) warehousePurchaseCancel(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var status string;var received int
 err=tx.QueryRow(ctx,`SELECT status FROM warehouse_purchase_orders WHERE id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&status)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy phiếu."});return};if err!=nil{serverError(c,err);return}
 if err=tx.QueryRow(ctx,`SELECT COALESCE(sum(received),0)::int FROM warehouse_purchase_items WHERE po_id::text=$1`,c.Param("id")).Scan(&received);err!=nil{serverError(c,err);return}
 if status!="ORDERED"||received>0{c.JSON(409,gin.H{"error":"Chỉ hủy phiếu chưa nhận bất kỳ sản phẩm nào."});return}
 if _,err=tx.Exec(ctx,`UPDATE warehouse_purchase_orders SET status='CANCELLED' WHERE id::text=$1`,c.Param("id"));err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PO_CANCEL',$2,'Cancelled before goods receipt')`,actor.ID,c.Param("id"));err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"CANCELLED"})
}
func(a *App) warehouseReceipt(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{RequestKey string `json:"request_key"`;Note string `json:"note"`;Lines []receivingLine `json:"lines"`}
 if c.ShouldBindJSON(&in)!=nil||!warehouseKeyPattern.MatchString(in.RequestKey)||len(in.Note)>300||len(in.Lines)<1||len(in.Lines)>30{
  c.JSON(400,gin.H{"error":"Phiếu nhận hàng không hợp lệ."});return
 }
 requested:=map[string]receivingLine{}
 for _,line:=range in.Lines{
  if line.Accepted<0||line.Quarantined<0||line.Accepted+line.Quarantined<1||line.Accepted+line.Quarantined>10000||requested[line.ItemID].ItemID!=""{
   c.JSON(400,gin.H{"error":"Số nhận đạt/lỗi không hợp lệ hoặc dòng bị trùng."});return
  }
  requested[line.ItemID]=line
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),12*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var state string
 err=tx.QueryRow(ctx,`SELECT status FROM warehouse_purchase_orders WHERE id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&state)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy phiếu đặt nhập."});return}
 if err!=nil{serverError(c,err);return}
 var previous string
 err=tx.QueryRow(ctx,`SELECT id::text FROM warehouse_receipts WHERE po_id::text=$1 AND request_key=$2`,c.Param("id"),in.RequestKey).Scan(&previous)
 if err==nil{c.JSON(200,gin.H{"receipt_id":previous,"idempotent":true,"status":state});return}
 if !errors.Is(err,pgx.ErrNoRows){serverError(c,err);return}
 if state=="RECEIVED"||state=="CANCELLED"{c.JSON(409,gin.H{"error":"Phiếu đã hoàn tất hoặc đã hủy."});return}
 type row struct{id,variant string;remaining int}
 lines:=[]row{}
 rows,err:=tx.Query(ctx,`SELECT id::text,variant_id::text,quantity-received
 FROM warehouse_purchase_items WHERE po_id::text=$1 ORDER BY variant_id FOR UPDATE`,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 for rows.Next(){var v row;if err=rows.Scan(&v.id,&v.variant,&v.remaining);err!=nil{break};lines=append(lines,v)}
 if err==nil{err=rows.Err()};rows.Close()
 if err!=nil{serverError(c,err);return}
 allowed:=map[string]bool{}
 for _,line:=range lines{allowed[line.id]=true}
 for id,line:=range requested{
  if !allowed[id]{c.JSON(400,gin.H{"error":"Dòng không thuộc phiếu đặt nhập."});return}
  for _,item:=range lines{if item.id==id && line.Accepted+line.Quarantined>item.remaining {
   c.JSON(409,gin.H{"error":"Số nhận vượt lượng chưa nhận của phiếu."});return
  }}
 }
 receiptID,err:=uuid();if err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO warehouse_receipts(id,po_id,request_key,received_by,note)
 VALUES($1,$2,$3,$4,$5)`,receiptID,c.Param("id"),in.RequestKey,actor.ID,strings.TrimSpace(in.Note));err!=nil{serverError(c,err);return}
 for _,item:=range lines{
  line,ok:=requested[item.id];if !ok{continue}
  total:=line.Accepted+line.Quarantined
  var left int
  err=tx.QueryRow(ctx,`UPDATE inventory
 SET on_hand=on_hand+$1,unavailable=unavailable+$2 WHERE variant_id::text=$3 AND on_hand+$1<=100000
 RETURNING on_hand-reserved-unavailable`,total,line.Quarantined,item.variant).Scan(&left)
  if err!=nil{c.JSON(409,gin.H{"error":"Không thể cộng tồn, cần kiểm tra giới hạn số lượng."});return}
  if _,err=tx.Exec(ctx,`UPDATE warehouse_purchase_items SET received=received+$1 WHERE id::text=$2`,total,item.id);err!=nil{serverError(c,err);return}
  if _,err=tx.Exec(ctx,`INSERT INTO warehouse_receipt_lines(receipt_id,purchase_item_id,accepted,quarantined) VALUES($1,$2,$3,$4)`,receiptID,item.id,line.Accepted,line.Quarantined);err!=nil{serverError(c,err);return}
  if line.Accepted>0{
   if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta,reason,actor_id)
    VALUES($1,'PO_RECEIVE',$2,$3,$4)`,item.variant,line.Accepted,"Receipt "+receiptID,actor.ID);err!=nil{serverError(c,err);return}
  }
  if line.Quarantined>0{
   if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta,reason,actor_id)
    VALUES($1,'QC_HOLD',$2,$3,$4)`,item.variant,line.Quarantined,"QC hold receipt "+receiptID,actor.ID);err!=nil{serverError(c,err);return}
  }
 }
 var remaining int
 if err=tx.QueryRow(ctx,`SELECT COALESCE(sum(quantity-received),0)::int FROM warehouse_purchase_items WHERE po_id::text=$1`,c.Param("id")).Scan(&remaining);err!=nil{serverError(c,err);return}
 next:="PARTIAL";if remaining==0{next="RECEIVED"}
 if _,err=tx.Exec(ctx,`UPDATE warehouse_purchase_orders SET status=$1 WHERE id::text=$2`,next,c.Param("id"));err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PO_RECEIPT',$2,$3)`,actor.ID,c.Param("id"),receiptID);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"receipt_id":receiptID,"status":next,"remaining":remaining,"idempotent":false})
}
func(a *App) warehouseQC(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{Action string `json:"action"`;Quantity int `json:"quantity"`;Reason string `json:"reason"`}
 if c.ShouldBindJSON(&in)!=nil||in.Quantity<1||in.Quantity>10000||len(strings.TrimSpace(in.Reason))<6||len(in.Reason)>300||
  (in.Action!="RELEASE"&&in.Action!="SCRAP"){
  c.JSON(400,gin.H{"error":"Cần chọn duyệt bán hoặc loại bỏ hàng lỗi, số lượng và lý do."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var hand,reserved,unavailable int
 err=tx.QueryRow(ctx,`SELECT on_hand,reserved,unavailable FROM inventory WHERE variant_id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&hand,&reserved,&unavailable)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy SKU."});return};if err!=nil{serverError(c,err);return}
 if in.Quantity>unavailable{c.JSON(409,gin.H{"error":"Số lượng vượt hàng đang cách ly."});return}
 if in.Action=="RELEASE" {
  _,err=tx.Exec(ctx,`UPDATE inventory SET unavailable=unavailable-$1 WHERE variant_id::text=$2`,in.Quantity,c.Param("id"))
 }else{
  _,err=tx.Exec(ctx,`UPDATE inventory SET unavailable=unavailable-$1,on_hand=on_hand-$1 WHERE variant_id::text=$2`,in.Quantity,c.Param("id"))
 }
 if err!=nil{serverError(c,err);return}
 change:=0;typ:="QC_RELEASE";if in.Action=="SCRAP"{change= -in.Quantity;typ="QC_SCRAP"}
 if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta,reason,actor_id)
 VALUES($1,$2,$3,$4,$5)`,c.Param("id"),typ,change,strings.TrimSpace(in.Reason),actor.ID);err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,$2,$3,$4)`,actor.ID,typ,c.Param("id"),in.Reason);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 available:=hand-reserved-unavailable+in.Quantity
 c.JSON(200,gin.H{"status":"ok","available":available,"unavailable":unavailable-in.Quantity})
}
func(a *App) warehouseInsights(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 // Fulfilled (SHIP) ledger entries: not draft orders, not saved carts and
 // not counted again for payments. Simple 30-day demand heuristic, not an AI forecast.
 rows,err:=a.DB.Query(c.Request.Context(),`WITH sales AS (
  SELECT variant_id,COALESCE(sum(-on_hand_delta),0)::int qty
  FROM stock_movements WHERE movement_type='SHIP' AND created_at>=now()-interval '30 days'
  GROUP BY variant_id)
 SELECT v.sku,p.name,v.color,v.size,(i.on_hand-i.reserved-i.unavailable)::int,v.low_stock_threshold,
 COALESCE(s.qty,0),COALESCE(sp.lead_days,7)
 FROM inventory i JOIN product_variants v ON v.id=i.variant_id
 JOIN products p ON p.id=v.product_id LEFT JOIN sales s ON s.variant_id=v.id
 LEFT JOIN LATERAL(
   SELECT ws.lead_days FROM warehouse_purchase_items pi
   JOIN warehouse_purchase_orders po ON po.id=pi.po_id
   JOIN warehouse_suppliers ws ON ws.id=po.supplier_id
   WHERE pi.variant_id=v.id AND po.status!='CANCELLED'
   ORDER BY po.created_at DESC LIMIT 1
 ) sp ON true
 WHERE p.archived_at IS NULL AND p.published AND v.active
 ORDER BY (i.on_hand-i.reserved-i.unavailable) ASC,p.name,v.color,v.size LIMIT 250`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var sku,name,color,size string;var available,threshold,sold,lead int
  if err=rows.Scan(&sku,&name,&color,&size,&available,&threshold,&sold,&lead);err!=nil{serverError(c,err);return}
  demand:=float64(sold)/30.0
  point:=int(math.Ceil(demand*float64(lead)))+threshold
  suggested:=0
  if sold>0&&available<=point{suggested=point-available}
  daysCover:=any(nil)
  if sold>0{daysCover=math.Round(float64(available)/demand*10)/10}
  tier:="NORMAL";if available==0{tier="OUT_OF_STOCK"}else if available<=threshold{tier="LOW_STOCK"}else if sold==0{tier="NO_SALES_30D"}
  items=append(items,gin.H{"sku":sku,"name":name,"color":color,"size":size,
   "available":available,"threshold":threshold,"sold_30d":sold,"daily_average":math.Round(demand*100)/100,
   "lead_days_estimate":lead,"days_cover":daysCover,"reorder_point":point,
   "suggested_order":suggested,"status":tier})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items,"method":"30-day SHIP stock movements; supplier lead time if available, otherwise 7-day assumption; safety stock=SKU threshold; no AI prediction"})
}
func(a *App) stockWaitlistJoin(c *gin.Context){
 var in struct{VariantID string `json:"variant_id"`;Email string `json:"email"`;Consent bool `json:"consent"`}
 if c.ShouldBindJSON(&in)!=nil||!in.Consent{c.JSON(400,gin.H{"error":"Vui lòng xác nhận đồng ý nhận liên hệ khi có hàng."});return}
 email:=strings.ToLower(strings.TrimSpace(in.Email))
 addr,err:=mail.ParseAddress(email)
 if err!=nil||addr.Address!=email||len(email)<5||len(email)>254||strings.ContainsAny(email,"<> "){
  c.JSON(400,gin.H{"error":"Email không hợp lệ."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),4*time.Second);defer cancel()
 var allowed bool
 err=a.DB.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM product_variants v JOIN products p ON p.id=v.product_id
 JOIN inventory i ON i.variant_id=v.id WHERE v.id::text=$1 AND p.published AND p.archived_at IS NULL
 AND v.active AND i.on_hand-i.reserved-i.unavailable<=0)`,in.VariantID).Scan(&allowed)
 if err!=nil{serverError(c,err);return}
 if !allowed{c.JSON(409,gin.H{"error":"Sản phẩm chưa hết hàng hoặc không còn mở đăng ký."});return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 _,err=a.DB.Exec(ctx,`INSERT INTO stock_waitlist(id,variant_id,email,status) VALUES($1,$2,$3,'WAITING')
 ON CONFLICT(variant_id,email) DO UPDATE SET status='WAITING',consented_at=now()`,id,in.VariantID,email)
 if err!=nil{serverError(c,err);return}
 c.JSON(202,gin.H{"status":"WAITING","message":"Đã ghi nhận yêu cầu. Cửa hàng sẽ liên hệ khi có hàng; chưa phải đơn đặt trước."})
}
func(a *App) warehouseWaitlist(c *gin.Context){
 if a.requireAdminOnly(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT w.id::text,p.name,v.color,v.size,w.email,w.status,w.created_at
 FROM stock_waitlist w JOIN product_variants v ON v.id=w.variant_id JOIN products p ON p.id=v.product_id
 ORDER BY w.created_at DESC LIMIT 200`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,name,color,size,email,status string;var date time.Time
  if err=rows.Scan(&id,&name,&color,&size,&email,&status,&date);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"name":name,"color":color,"size":size,"email":email,"status":status,"created_at":date})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) warehouseWaitlistUpdate(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{Status string `json:"status"`}
 if c.ShouldBindJSON(&in)!=nil||(in.Status!="CONTACTED"&&in.Status!="CLOSED"){c.JSON(400,gin.H{"error":"Trạng thái không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 tag,err:=tx.Exec(ctx,`UPDATE stock_waitlist SET status=$1 WHERE id::text=$2 AND status='WAITING'`,in.Status,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 if tag.RowsAffected()!=1{c.JSON(409,gin.H{"error":"Yêu cầu không còn đang chờ."});return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'STOCK_WAITLIST_UPDATE',$2,$3)`,actor.ID,c.Param("id"),in.Status);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":in.Status})
}
