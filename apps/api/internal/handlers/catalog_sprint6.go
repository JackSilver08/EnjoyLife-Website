package handlers

import (
 "context"
 "errors"
 "net/http"
 "strconv"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

type GalleryImage struct {
 URL string `json:"url"`
 Alt string `json:"alt"`
}
func (a *App) adminGetGallery(c *gin.Context) {
 if a.requireAdmin(c)==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),4*time.Second);defer cancel()
 var primary string
 if err:=a.DB.QueryRow(ctx,`SELECT image_url FROM products WHERE id::text=$1 AND archived_at IS NULL`,c.Param("id")).Scan(&primary);err!=nil{
  if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy sản phẩm."})}else{serverError(c,err)}
  return
 }
 rows,err:=a.DB.Query(ctx,`SELECT url,alt FROM product_images WHERE product_id::text=$1 ORDER BY position`,c.Param("id"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 images:=[]GalleryImage{}
 for rows.Next(){var img GalleryImage;if err=rows.Scan(&img.URL,&img.Alt);err!=nil{serverError(c,err);return};images=append(images,img)}
 if err=rows.Err();err!=nil{serverError(c,err);return}
 if len(images)==0&&primary!=""{images=append(images,GalleryImage{URL:primary})}
 c.JSON(200,gin.H{"images":images})
}
func (a *App) adminSaveGallery(c *gin.Context) {
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in struct{Images []GalleryImage `json:"images"`}
 if c.ShouldBindJSON(&in)!=nil||len(in.Images)>12{
  c.JSON(400,gin.H{"error":"Tối đa 12 ảnh trong một sản phẩm."});return
 }
 seen:=map[string]bool{}
 for i:=range in.Images{
  item:= &in.Images[i]
  item.URL=strings.TrimSpace(item.URL);item.Alt=strings.TrimSpace(item.Alt)
  if item.URL==""||len(item.URL)>500||!validManagedImageURL(item.URL)||seen[item.URL]||len(item.Alt)>160 {
   c.JSON(400,gin.H{"error":"URL ảnh không hợp lệ, ảnh trùng hoặc alt quá dài."});return
  }
  seen[item.URL]=true
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),9*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var id string
 err=tx.QueryRow(ctx,`SELECT id::text FROM products WHERE id::text=$1 AND archived_at IS NULL FOR UPDATE`,c.Param("id")).Scan(&id)
 if err!=nil{if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy sản phẩm."})}else{serverError(c,err)};return}
 if _,err=tx.Exec(ctx,`DELETE FROM product_images WHERE product_id=$1`,id);err!=nil{serverError(c,err);return}
 for position,img:=range in.Images{
  newID,e:=uuid();if e!=nil{serverError(c,e);return}
  if _,err=tx.Exec(ctx,`INSERT INTO product_images(id,product_id,url,alt,position) VALUES($1,$2,$3,$4,$5)`,
    newID,id,img.URL,img.Alt,position);err!=nil{serverError(c,err);return}
 }
 cover:=""
 if len(in.Images)>0{cover=in.Images[0].URL}
 if _,err=tx.Exec(ctx,`UPDATE products SET image_url=$1 WHERE id=$2`,cover,id);err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PRODUCT_GALLERY',$2,$3)`,actor.ID,id,strconv.Itoa(len(in.Images))+" images");err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"images":in.Images,"cover":cover})
}
func (a *App) publicCatalogFilters(c *gin.Context) {
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 rows,err:=a.DB.Query(ctx,`SELECT DISTINCT v.color,v.size FROM products p
 JOIN product_variants v ON v.product_id=p.id
 WHERE p.published AND p.archived_at IS NULL AND v.active
 ORDER BY v.color,v.size LIMIT 500`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 colors,sizes:=[]string{},[]string{};co,si:=map[string]bool{},map[string]bool{}
 for rows.Next(){
  var color,size string
  if err=rows.Scan(&color,&size);err!=nil{serverError(c,err);return}
  if !co[color]{colors=append(colors,color);co[color]=true}
  if !si[size]{sizes=append(sizes,size);si[size]=true}
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"colors":colors,"sizes":sizes})
}
func (a *App) publicCatalogSearch(c *gin.Context) {
 q:=strings.TrimSpace(c.Query("q"));if len(q)>100{q=q[:100]}
 category:=strings.TrimSpace(c.Query("category"))
 color:=strings.TrimSpace(c.Query("color"))
 size:=strings.TrimSpace(c.Query("size"))
 if len(category)>80||len(color)>40||len(size)>20{c.JSON(400,gin.H{"error":"Bộ lọc không hợp lệ."});return}
 minPrice,maxPrice:=int64(0),int64(1000000000)
 if val:=c.Query("min_price");val!=""{n,err:=strconv.ParseInt(val,10,64);if err!=nil||n<0||n>1000000000{c.JSON(400,gin.H{"error":"Giá từ không hợp lệ."});return};minPrice=n}
 if val:=c.Query("max_price");val!=""{n,err:=strconv.ParseInt(val,10,64);if err!=nil||n<0||n>1000000000{c.JSON(400,gin.H{"error":"Giá đến không hợp lệ."});return};maxPrice=n}
 if minPrice>maxPrice{c.JSON(400,gin.H{"error":"Khoảng giá không hợp lệ."});return}
 sortKey:=c.DefaultQuery("sort","newest")
 sorts:=map[string]string{"newest":"p.created_at DESC,p.id DESC","price-asc":"MIN(v.price_vnd) ASC,p.id ASC","price-desc":"MIN(v.price_vnd) DESC,p.id DESC"}
 order,ok:=sorts[sortKey];if !ok{c.JSON(400,gin.H{"error":"Sắp xếp không hợp lệ."});return}
 page,_:=strconv.Atoi(c.DefaultQuery("page","1"));if page<1{page=1};if page>1000{page=1000}
 const pageSize=12
 args:=[]any{q,category,color,size,minPrice,maxPrice}
 query:=`FROM products p JOIN categories c ON c.id=p.category_id
 JOIN product_variants v ON v.product_id=p.id AND v.active
 LEFT JOIN inventory i ON i.variant_id=v.id
 WHERE p.published AND p.archived_at IS NULL
 AND ($1='' OR p.name ILIKE '%'||$1||'%' OR p.description ILIKE '%'||$1||'%')
 AND ($2='' OR c.slug=$2)
 AND EXISTS(SELECT 1 FROM product_variants vf JOIN inventory iff ON iff.variant_id=vf.id
   WHERE vf.product_id=p.id AND vf.active
   AND ($3='' OR vf.color=$3) AND ($4='' OR vf.size=$4)
   AND vf.price_vnd BETWEEN $5 AND $6 AND iff.on_hand-iff.reserved-iff.unavailable>0)
 `
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 var total int64
 err:=a.DB.QueryRow(ctx,"SELECT COUNT(DISTINCT p.id) "+query,args...).Scan(&total)
 if err!=nil{serverError(c,err);return}
 list:=`SELECT p.id::text,p.slug,p.name,p.description,p.image_url,p.collection_name,c.slug,
  MIN(v.price_vnd),COALESCE(SUM(GREATEST(i.on_hand-i.reserved-i.unavailable,0)),0)::int,p.created_at
 `+query+` GROUP BY p.id,c.slug ORDER BY `+order+` LIMIT $7 OFFSET $8`
 rows,err:=a.DB.Query(ctx,list,append(args,pageSize,(page-1)*pageSize)...)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 products:=[]Product{}
 for rows.Next(){
  var p Product;var created time.Time
  if err=rows.Scan(&p.ID,&p.Slug,&p.Name,&p.Description,&p.ImageURL,&p.Collection,&p.CategorySlug,&p.PriceVND,&p.Available,&created);err!=nil{serverError(c,err);return}
  p.Variants=[]Variant{};products=append(products,p)
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(http.StatusOK,gin.H{"items":products,"total":total,"page":page,"page_size":pageSize})
}
func (a *App) adminInventoryHistory(c *gin.Context) {
 if a.requireAdmin(c)==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 rows,err:=a.DB.Query(ctx,`SELECT m.id,m.movement_type,m.on_hand_delta,m.reserved_delta,m.reason,m.created_at,
 COALESCE(o.order_no,'') FROM stock_movements m
 JOIN product_variants v ON v.id=m.variant_id LEFT JOIN orders o ON o.id=m.order_id
 WHERE v.id::text=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 100`,c.Param("id"))
 if err!=nil{serverError(c,err);return};defer rows.Close()
 entries:=[]gin.H{}
 for rows.Next(){var id int64;var typ,reason,order string;var hand,reserve int;var when time.Time
  if err=rows.Scan(&id,&typ,&hand,&reserve,&reason,&when,&order);err!=nil{serverError(c,err);return}
  entries=append(entries,gin.H{"id":id,"type":typ,"on_hand_delta":hand,"reserved_delta":reserve,"reason":reason,"created_at":when,"order_no":order})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":entries})
}
