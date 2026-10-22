package handlers

import (
 "context"
 "net/http"
 "errors"
 "regexp"
 "strings"
 "time"
 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

// A CSV image_url may contain the original image filename, as long as the admin
// previously uploaded that file into the Media Manager. The database resolves
// it to a safely generated local media URL; no filesystem paths are accepted.
var importImageName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._() -]{0,190}\.(?i:jpg|jpeg|png|webp)$`)

// Batch import is atomic. Imported products always start unpublished so pricing
// and stock can be reviewed before the customer can purchase them.
func(a *App) adminImportProducts(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 c.Request.Body=http.MaxBytesReader(c.Writer,c.Request.Body,300_000)
 var input struct{Rows []productForm `json:"rows"`}
 if c.ShouldBindJSON(&input)!=nil||len(input.Rows)<1||len(input.Rows)>100{
  c.JSON(400,gin.H{"error":"Chọn từ 1 đến 100 sản phẩm trong một lần import."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),20*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 seenSlug:=map[string]bool{};seenSKU:=map[string]bool{}
 for index:=range input.Rows{
  row:= &input.Rows[index]
  row.Published=false
  row.Name=strings.TrimSpace(row.Name)
  row.ImageURL=strings.TrimSpace(row.ImageURL)
  if row.ImageURL!=""&&!validManagedImageURL(row.ImageURL){
   if !importImageName.MatchString(row.ImageURL){
    c.JSON(400,gin.H{"error":"Tên file ảnh không hợp lệ. Hãy upload ảnh vào Media Manager trước.","row":index+1});return
   }
   var filename string
   err=tx.QueryRow(ctx,`SELECT filename FROM media_assets WHERE original_name=$1 ORDER BY created_at DESC,id DESC LIMIT 1`,row.ImageURL).Scan(&filename)
   if errors.Is(err,pgx.ErrNoRows){
    c.JSON(400,gin.H{"error":"Chưa tìm thấy ảnh đã tải lên với tên file: "+row.ImageURL,"row":index+1});return
   }
   if err!=nil{serverError(c,err);return}
   row.ImageURL="/media/"+filename
  }
  if !validProduct(*row)||seenSlug[row.Slug]||(row.SKU!=""&&seenSKU[row.SKU]){
   c.JSON(400,gin.H{"error":"Dòng import sai thông tin hoặc trùng slug/SKU.","row":index+1});return
  }
  seenSlug[row.Slug]=true
  if row.SKU!=""{seenSKU[row.SKU]=true}
 }
 for index,row:=range input.Rows{
  if row.SKU==""{
   row.SKU,err=nextProductSKU(ctx,tx)
   if err!=nil{serverError(c,err);return}
  }
  id,err:=uuid();if err!=nil{serverError(c,err);return}
  variant,err:=uuid();if err!=nil{serverError(c,err);return}
  tag,err:=tx.Exec(ctx,`INSERT INTO products(id,category_id,slug,name,description,image_url,collection_name,published)
    SELECT $1,id,$2,$3,$4,$5,$6,false FROM categories WHERE slug=$7`,
   id,row.Slug,row.Name,row.Description,row.ImageURL,row.Collection,row.Category)
  if err!=nil{c.JSON(409,gin.H{"error":"Slug đã tồn tại hoặc dữ liệu không hợp lệ.","row":index+1});return}
  if tag.RowsAffected()!=1{c.JSON(400,gin.H{"error":"Danh mục sản phẩm không tồn tại.","row":index+1});return}
  if _,err=tx.Exec(ctx,`INSERT INTO product_variants(id,product_id,sku,color,size,price_vnd)
   VALUES($1,$2,$3,$4,$5,$6)`,variant,id,row.SKU,row.Color,row.Size,row.Price);err!=nil{
   c.JSON(409,gin.H{"error":"SKU đã tồn tại.","row":index+1});return
  }
  if _,err=tx.Exec(ctx,`INSERT INTO inventory(variant_id,on_hand) VALUES($1,$2)`,variant,row.Stock);err!=nil{serverError(c,err);return}
  if row.Stock>0{
   if _,err=tx.Exec(ctx,`INSERT INTO stock_movements(variant_id,movement_type,on_hand_delta)
   VALUES($1,'INITIAL_STOCK',$2)`,variant,row.Stock);err!=nil{serverError(c,err);return}
  }
  if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
   VALUES($1,'PRODUCT_IMPORT',$2,$3)`,actor.ID,id,row.SKU);err!=nil{serverError(c,err);return}
 }
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(http.StatusCreated,gin.H{"created":len(input.Rows),"published":false})
}
