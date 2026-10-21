package handlers

import (
 "context"
 "regexp"
 "strings"
 "time"
 
 "github.com/gin-gonic/gin"
)

var slugPattern=regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var skuPattern=regexp.MustCompile(`^[A-Za-z0-9_-]{3,50}$`)
type productForm struct{
 Name string `json:"name"`
 Slug string `json:"slug"`
 Description string `json:"description"`
 ImageURL string `json:"image_url"`
 Collection string `json:"collection"`
 Category string `json:"category"`
 SKU string `json:"sku"`
 Color string `json:"color"`
 Size string `json:"size"`
 Price int64 `json:"price_vnd"`
 Stock int `json:"opening_stock"`
 Published bool `json:"published"`
}
func validProduct(v productForm)bool{
 return len(strings.TrimSpace(v.Name))>=3&&len(v.Name)<=140&&len(v.Slug)<=100&&slugPattern.MatchString(v.Slug)&&len(v.Description)<=3000&&len(v.Collection)<=100&&len(v.ImageURL)<=500&&(v.ImageURL==""||strings.HasPrefix(v.ImageURL,"https://images.unsplash.com/"))&&skuPattern.MatchString(v.SKU)&&len(v.Color)>0&&len(v.Color)<=40&&len(v.Size)>0&&len(v.Size)<=20&&v.Price>0&&v.Price<1000000000&&v.Stock>=0&&v.Stock<=100000&&len(v.Category)>0
}
func(a *App) adminProducts(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT p.id::text,p.slug,p.name,p.description,p.image_url,p.collection_name,p.published,c.slug,
 COALESCE(MIN(v.price_vnd),0),COALESCE(SUM(GREATEST(i.on_hand-i.reserved-i.unavailable,0)),0)::int
 FROM products p LEFT JOIN categories c ON p.category_id=c.id
 LEFT JOIN product_variants v ON p.id=v.product_id AND v.active LEFT JOIN inventory i ON i.variant_id=v.id
 GROUP BY p.id,c.slug ORDER BY p.created_at DESC LIMIT 200`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,slug,name,description,image,collection string;var published bool;var cat *string;var price int64;var stock int
  if err=rows.Scan(&id,&slug,&name,&description,&image,&collection,&published,&cat,&price,&stock);err!=nil{serverError(c,err);return}
  category:="";if cat!=nil{category=*cat}
  items=append(items,gin.H{"id":id,"slug":slug,"name":name,"description":description,"image_url":image,"collection":collection,"category":category,"published":published,"price_vnd":price,"available":stock})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) adminCreateProduct(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var input productForm
 if c.ShouldBindJSON(&input)!=nil||!validProduct(input){c.JSON(400,gin.H{"error":"Sản phẩm không hợp lệ; kiểm tra tên, slug, SKU, giá và tồn."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 productID,err:=uuid();if err!=nil{serverError(c,err);return}
 variantID,err:=uuid();if err!=nil{serverError(c,err);return}
 tag,err:=tx.Exec(ctx,`INSERT INTO products(id,category_id,slug,name,description,image_url,collection_name,published)
 SELECT $1,id,$2,$3,$4,$5,$6,$7 FROM categories WHERE slug=$8`,productID,input.Slug,strings.TrimSpace(input.Name),input.Description,input.ImageURL,input.Collection,input.Published,input.Category)
 if err!=nil{c.JSON(409,gin.H{"error":"Slug đã tồn tại hoặc dữ liệu không hợp lệ."});return}
 if tag.RowsAffected()!=1{c.JSON(400,gin.H{"error":"Danh mục không tồn tại."});return}
 _,err=tx.Exec(ctx,`INSERT INTO product_variants(id,product_id,sku,color,size,price_vnd) VALUES($1,$2,$3,$4,$5,$6)`,variantID,productID,input.SKU,input.Color,input.Size,input.Price)
 if err!=nil{c.JSON(409,gin.H{"error":"SKU đã tồn tại hoặc không hợp lệ."});return}
 _,err=tx.Exec(ctx,`INSERT INTO inventory(variant_id,on_hand) VALUES($1,$2)`,variantID,input.Stock)
 if err!=nil{serverError(c,err);return}
 if input.Stock>0{
  _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta) VALUES($1,'INITIAL_STOCK',$2)`,variantID,input.Stock)
  if err!=nil{serverError(c,err);return}
 }
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PRODUCT_CREATE',$2,$3)`,actor.ID,productID,input.SKU)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(201,gin.H{"id":productID,"slug":input.Slug,"variant_id":variantID})
}
func(a *App) adminUpdateProduct(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var input struct {
  Name string `json:"name"`
  Description string `json:"description"`
  Collection string `json:"collection"`
  Published bool `json:"published"`
 }
 if c.ShouldBindJSON(&input)!=nil||len(strings.TrimSpace(input.Name))<3||len(input.Name)>140||len(input.Description)>3000||len(input.Collection)>100{
  c.JSON(400,gin.H{"error":"Dữ liệu không hợp lệ."});return
 }
 cmd,err:=a.DB.Exec(c.Request.Context(),`UPDATE products SET name=$1,description=$2,collection_name=$3,published=$4 WHERE id::text=$5`,strings.TrimSpace(input.Name),input.Description,input.Collection,input.Published,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 if cmd.RowsAffected()==0{c.JSON(404,gin.H{"error":"Không tìm thấy sản phẩm."});return}
 _,_ = a.DB.Exec(c.Request.Context(),`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PRODUCT_EDIT',$2,$3)`,actor.ID,c.Param("id"),input.Name)
 c.JSON(200,gin.H{"status":"ok"})
}
func(a *App) adminReports(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),4*time.Second);defer cancel()
 var paid,recentOrders,unpaid int64
 err:=a.DB.QueryRow(ctx,`SELECT COALESCE(sum(total_vnd) FILTER(WHERE payment_status='PAID' AND status <> 'CANCELLED'),0),count(*) FILTER(WHERE created_at>=now()-interval '30 days'),count(*) FILTER(WHERE payment_status='UNPAID' AND status <> 'CANCELLED') FROM orders`).Scan(&paid,&recentOrders,&unpaid)
 if err!=nil{serverError(c,err);return}
 rows,err:=a.DB.Query(ctx,`SELECT to_char(created_at::date,'YYYY-MM-DD'),count(*),COALESCE(sum(total_vnd),0) FROM orders WHERE created_at>=now()-interval '7 days' AND status <> 'CANCELLED' GROUP BY created_at::date ORDER BY created_at::date`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 daily:=[]gin.H{}
 for rows.Next(){var day string;var count,total int64;if err=rows.Scan(&day,&count,&total);err!=nil{serverError(c,err);return};daily=append(daily,gin.H{"day":day,"orders":count,"order_value_vnd":total})}
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"recorded_payment_vnd":paid,"orders_last_30_days":recentOrders,"unpaid_orders":unpaid,"daily":daily,"note":"Tổng tiền đơn PAID, không thay cho đối soát kế toán."})
}