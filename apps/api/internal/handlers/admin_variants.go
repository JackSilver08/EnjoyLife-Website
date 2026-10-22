package handlers

import (
 "context"
 "errors"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)
type variantInput struct{
 SKU string `json:"sku"`
 Color string `json:"color"`
 Size string `json:"size"`
 Price int64 `json:"price_vnd"`
 Stock int `json:"opening_stock"`
}
func validVariant(v variantInput)bool{return (v.SKU==""||skuPattern.MatchString(v.SKU))&&len(strings.TrimSpace(v.Color))>0&&len(v.Color)<=40&&len(strings.TrimSpace(v.Size))>0&&len(v.Size)<=20&&v.Price>0&&v.Price<1000000000&&v.Stock>=0&&v.Stock<=100000}
func(a *App) adminVariants(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT v.id::text,v.sku,v.color,v.size,v.price_vnd,v.active,i.on_hand,i.reserved,i.unavailable,v.low_stock_threshold FROM product_variants v JOIN inventory i ON v.id=i.variant_id WHERE v.product_id::text=$1 AND EXISTS(SELECT 1 FROM products p WHERE p.id=v.product_id AND p.archived_at IS NULL) ORDER BY v.color,v.size`,c.Param("id"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,sku,color,size string;var price int64;var active bool;var hand,reserved,unavailable,threshold int
  if err=rows.Scan(&id,&sku,&color,&size,&price,&active,&hand,&reserved,&unavailable,&threshold);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"sku":sku,"color":color,"size":size,"price_vnd":price,"active":active,"on_hand":hand,"reserved":reserved,"available":hand-reserved-unavailable,"low_stock_threshold":threshold})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) adminCreateVariant(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in variantInput
 if c.ShouldBindJSON(&in)!=nil||!validVariant(in){c.JSON(400,gin.H{"error":"SKU, màu, size, giá hoặc số lượng không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var pid string
 err=tx.QueryRow(ctx,`SELECT id::text FROM products WHERE id::text=$1 AND archived_at IS NULL`,c.Param("id")).Scan(&pid)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy sản phẩm."});return}
 if err!=nil{serverError(c,err);return}
 if in.SKU==""{
  in.SKU,err=nextProductSKU(ctx,tx)
  if err!=nil{serverError(c,err);return}
 }
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO product_variants(id,product_id,sku,color,size,price_vnd) VALUES($1,$2,$3,$4,$5,$6)`,id,pid,in.SKU,strings.TrimSpace(in.Color),strings.TrimSpace(in.Size),in.Price)
 if err!=nil{c.JSON(409,gin.H{"error":"SKU hoặc cặp màu-size đã tồn tại."});return}
 _,err=tx.Exec(ctx,`INSERT INTO inventory(variant_id,on_hand) VALUES($1,$2)`,id,in.Stock)
 if err!=nil{serverError(c,err);return}
 if in.Stock>0{
  _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta) VALUES($1,'INITIAL_STOCK',$2)`,id,in.Stock)
  if err!=nil{serverError(c,err);return}
 }
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'VARIANT_CREATE',$2,$3)`,actor.ID,id,in.SKU)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"variant_id":id,"sku":in.SKU})
}
func(a *App) adminUpdateVariant(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in struct{Price int64 `json:"price_vnd"`;Active bool `json:"active"`;Color string `json:"color"`;Size string `json:"size"`;Threshold *int `json:"low_stock_threshold"`}
 if c.ShouldBindJSON(&in)!=nil||in.Price<=0||in.Price>=1000000000||(in.Threshold!=nil&&(*in.Threshold<0||*in.Threshold>100000)){c.JSON(400,gin.H{"error":"Giá không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var reserved int
 var oldColor,oldSize string
 err=tx.QueryRow(ctx,`SELECT i.reserved,v.color,v.size FROM inventory i JOIN product_variants v ON v.id=i.variant_id
 WHERE v.id::text=$1 AND EXISTS(SELECT 1 FROM products p WHERE p.id=v.product_id AND p.archived_at IS NULL) FOR UPDATE OF i,v`,c.Param("id")).Scan(&reserved,&oldColor,&oldSize)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy SKU."});return}
 if err!=nil{serverError(c,err);return}
 if !in.Active&&reserved>0{c.JSON(409,gin.H{"error":"Không thể ngừng bán SKU khi còn đơn đang giữ hàng."});return}
 color,size:=strings.TrimSpace(in.Color),strings.TrimSpace(in.Size)
 // Existing callers that only update price/active are still supported.
 if color==""{color=oldColor};if size==""{size=oldSize}
 if len(color)>40||len(size)>20{c.JSON(400,gin.H{"error":"Màu hoặc size quá dài."});return}
 if (color!=oldColor||size!=oldSize){
  if reserved>0{c.JSON(409,gin.H{"error":"Không thể sửa màu/size khi có đơn đang giữ hàng."});return}
  var used bool
  if err=tx.QueryRow(ctx,`SELECT EXISTS(SELECT 1 FROM order_items WHERE variant_id::text=$1)`,c.Param("id")).Scan(&used);err!=nil{serverError(c,err);return}
  if used{c.JSON(409,gin.H{"error":"SKU từng phát sinh đơn; hãy ngừng bán và tạo biến thể mới để giữ lịch sử."});return}
 }
 _,err=tx.Exec(ctx,`UPDATE product_variants SET price_vnd=$1,active=$2,color=$3,size=$4,low_stock_threshold=COALESCE($6,low_stock_threshold) WHERE id::text=$5`,in.Price,in.Active,color,size,c.Param("id"),in.Threshold)
 if err!=nil{c.JSON(409,gin.H{"error":"Màu/size trùng hoặc dữ liệu không hợp lệ."});return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'VARIANT_EDIT',$2,$3)`,actor.ID,c.Param("id"),"price or active updated")
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok"})
}
