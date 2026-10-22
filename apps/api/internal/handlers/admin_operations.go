package handlers

import (
 "context"
 "errors"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

func (a *App) adminDashboard(c *gin.Context) {
 if a.requireAdmin(c)==nil {return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),4*time.Second);defer cancel()
 var orders,pending int64
 var orderValue int64
 err:=a.DB.QueryRow(ctx,`SELECT count(*),count(*) FILTER (WHERE status='PENDING_CONFIRMATION'),COALESCE(sum(total_vnd) FILTER (WHERE status <> 'CANCELLED'),0) FROM orders`).Scan(&orders,&pending,&orderValue)
 if err!=nil {serverError(c,err);return}
 var lowStock int64
 err=a.DB.QueryRow(ctx,`SELECT count(*) FROM inventory i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id WHERE p.archived_at IS NULL AND v.active AND (i.on_hand-i.reserved-i.unavailable)<=3`).Scan(&lowStock)
 if err!=nil {serverError(c,err);return}
 var products int64
 err=a.DB.QueryRow(ctx,`SELECT count(*) FROM products WHERE archived_at IS NULL`).Scan(&products)
 if err!=nil {serverError(c,err);return}
 c.JSON(200,gin.H{"orders":orders,"pending_orders":pending,"order_value_vnd":orderValue,"low_stock_skus":lowStock,"products":products,"revenue_note":"Giá trị đơn chưa hủy, KHÔNG phải doanh thu đã thu."})
}

func (a *App) adminInventory(c *gin.Context) {
 if a.requireAdmin(c)==nil {return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT v.id::text,v.sku,p.id::text,p.slug,p.name,v.color,v.size,v.active,
 (p.archived_at IS NOT NULL),i.on_hand,i.reserved,i.unavailable,(i.on_hand-i.reserved-i.unavailable)::int
 FROM inventory i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id
 ORDER BY p.name,v.color,v.size LIMIT 500`)
 if err!=nil {serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,sku,productID,slug,name,color,size string
  var active,archived bool
  var onHand,reserved,unavailable,available int
  if err=rows.Scan(&id,&sku,&productID,&slug,&name,&color,&size,&active,&archived,&onHand,&reserved,&unavailable,&available);err!=nil {serverError(c,err);return}
  items=append(items,gin.H{"variant_id":id,"sku":sku,"product_id":productID,"product_slug":slug,
    "name":name,"color":color,"size":size,"active":active,"archived":archived,
    "on_hand":onHand,"reserved":reserved,"unavailable":unavailable,"available":available})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}

func (a *App) adminAdjustInventory(c *gin.Context) {
 actor:=a.requireAdmin(c);if actor==nil{return}
 var req struct {
  Delta int `json:"delta"`
  Action string `json:"action"`
  Quantity int `json:"quantity"`
  Reason string `json:"reason"`
 }
 if c.ShouldBindJSON(&req)!=nil||len(strings.TrimSpace(req.Reason))<6||len(req.Reason)>300{
  c.JSON(400,gin.H{"error":"Hãy nhập số lượng và lý do hợp lệ (ít nhất 6 ký tự)."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var onHand,reserved,unavailable int
 err=tx.QueryRow(ctx,`SELECT on_hand,reserved,unavailable FROM inventory WHERE variant_id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&onHand,&reserved,&unavailable)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy mã hàng."});return}
 if err!=nil{serverError(c,err);return}
 delta:=req.Delta
 movement:="ADJUST"
 switch req.Action {
 case "": // backwards compatible with Sprint 5 Admin adjustment API
 case "RECEIVE","ISSUE":
  if req.Quantity<1||req.Quantity>10000{c.JSON(400,gin.H{"error":"Số lượng nhập/xuất phải từ 1 đến 10000."});return}
  movement=req.Action;delta=req.Quantity
  if req.Action=="ISSUE"{delta= -delta}
 case "COUNT":
  if req.Quantity<0||req.Quantity>100000{c.JSON(400,gin.H{"error":"Số kiểm kê không hợp lệ."});return}
  movement="COUNT";delta=req.Quantity-onHand
 default:
  c.JSON(400,gin.H{"error":"Loại thao tác kho không hợp lệ."});return
 }
 if (delta==0&&req.Action!="COUNT")||delta>10000||delta< -10000{
  c.JSON(400,gin.H{"error":"Chênh lệch kho phải từ -10000 đến 10000 và khác 0."});return
 }
 if onHand+delta<reserved+unavailable||onHand+delta>100000{
  c.JSON(409,gin.H{"error":"Tồn kiểm kê không được thấp hơn số hàng đang giữ hoặc vượt giới hạn."});return
 }
 if delta!=0 {
  _,err=tx.Exec(ctx,`UPDATE inventory SET on_hand=on_hand+$1 WHERE variant_id::text=$2`,delta,c.Param("id"))
  if err!=nil{serverError(c,err);return}
 }
 _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta,reason,actor_id) VALUES($1,$2,$3,$4,$5)`,c.Param("id"),movement,delta,strings.TrimSpace(req.Reason),actor.ID)
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'INVENTORY_ADJUST',$2,$3)`,actor.ID,c.Param("id"),movement+": "+req.Reason)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok","available":onHand+delta-reserved-unavailable,"on_hand":onHand+delta})
}
