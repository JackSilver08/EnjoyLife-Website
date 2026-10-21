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
 err=a.DB.QueryRow(ctx,`SELECT count(*) FROM inventory i JOIN product_variants v ON v.id=i.variant_id WHERE v.active AND (i.on_hand-i.reserved-i.unavailable)<=3`).Scan(&lowStock)
 if err!=nil {serverError(c,err);return}
 var products int64
 err=a.DB.QueryRow(ctx,`SELECT count(*) FROM products`).Scan(&products)
 if err!=nil {serverError(c,err);return}
 c.JSON(200,gin.H{"orders":orders,"pending_orders":pending,"order_value_vnd":orderValue,"low_stock_skus":lowStock,"products":products,"revenue_note":"Giá trị đơn chưa hủy, KHÔNG phải doanh thu đã thu."})
}

func (a *App) adminInventory(c *gin.Context) {
 if a.requireAdmin(c)==nil {return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT v.id::text,v.sku,p.name,v.color,v.size,i.on_hand,i.reserved,i.unavailable,(i.on_hand-i.reserved-i.unavailable)::int
 FROM inventory i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id
 WHERE v.active ORDER BY p.name,v.color,v.size LIMIT 200`)
 if err!=nil {serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,sku,name,color,size string
  var onHand,reserved,unavailable,available int
  if err=rows.Scan(&id,&sku,&name,&color,&size,&onHand,&reserved,&unavailable,&available);err!=nil {serverError(c,err);return}
  items=append(items,gin.H{"variant_id":id,"sku":sku,"name":name,"color":color,"size":size,"on_hand":onHand,"reserved":reserved,"unavailable":unavailable,"available":available})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}

func (a *App) adminAdjustInventory(c *gin.Context) {
 actor:=a.requireAdmin(c);if actor==nil{return}
 var req struct{Delta int `json:"delta"`;Reason string `json:"reason"`}
 if c.ShouldBindJSON(&req)!=nil||req.Delta==0||req.Delta>10000||req.Delta< -10000||len(strings.TrimSpace(req.Reason))<6||len(req.Reason)>300 {
  c.JSON(400,gin.H{"error":"Cần số lượng thay đổi và lý do hợp lệ (ít nhất 6 ký tự)."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var onHand,reserved,unavailable int
 err=tx.QueryRow(ctx,`SELECT on_hand,reserved,unavailable FROM inventory WHERE variant_id::text=$1 FOR UPDATE`,c.Param("id")).Scan(&onHand,&reserved,&unavailable)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy SKU"});return}
 if err!=nil {serverError(c,err);return}
 if onHand+req.Delta<reserved+unavailable {c.JSON(409,gin.H{"error":"Không thể giảm tồn kho thấp hơn số lượng đang giữ chỗ và không khả dụng."});return}
 _,err=tx.Exec(ctx,`UPDATE inventory SET on_hand=on_hand+$1 WHERE variant_id::text=$2`,req.Delta,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta) VALUES($1,$2,$3)`,c.Param("id"),"ADJUST",req.Delta)
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'INVENTORY_ADJUST',$2,$3)`,actor.ID,c.Param("id"),req.Reason)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok","available":onHand+req.Delta-reserved-unavailable})
}
