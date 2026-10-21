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
 "github.com/jackc/pgx/v5/pgxpool"
)

const blogSelect = `SELECT a.id::text,a.slug,a.title,a.excerpt,COALESCE(cat.slug,''),
 ARRAY(SELECT t.slug FROM blog_article_tags at JOIN blog_tags t ON t.id=at.tag_id WHERE at.article_id=a.id ORDER BY t.slug),
 a.cover_image_url,a.cover_image_alt,a.seo_title,a.seo_description,a.og_image_url,
 a.status,a.version,a.author_id::text,a.published_at,a.created_at,a.updated_at`

func scanBlogArticle(rows interface{Scan(...any) error}) (blogArticle,error) {
 var a blogArticle
 var published *time.Time
 var created,updated time.Time
 err:=rows.Scan(&a.ID,&a.Slug,&a.Title,&a.Excerpt,&a.CategorySlug,&a.TagSlugs,
   &a.CoverURL,&a.CoverAlt,&a.SEOTitle,&a.SEODescription,&a.OGImageURL,
   &a.Status,&a.Version,&a.AuthorID,&published,&created,&updated)
 if err!=nil{return a,err}
 if a.TagSlugs==nil {a.TagSlugs=[]string{}}
 a.PublishedAt=published
 a.CreatedAt=created
 a.UpdatedAt=updated
 return a,nil
}
func blogPagination(c *gin.Context)(int,int,bool){
 parse:=func(key string,def,max int) (int,bool) {
  s:=c.Query(key)
  if s==""{return def,true}
  n,err:=strconv.Atoi(s)
  if err!=nil||n<0||n>max{return 0,false}
  return n,true
 }
 limit,ok1:=parse("limit",12,30)
 offset,ok2:=parse("offset",0,10000)
 return limit,offset,ok1&&ok2&&limit>0
}
func readBlogFeed(ctx context.Context,db *pgxpool.Pool,includeDraft bool,status,category,tag string,limit,offset int)([]blogArticle,int64,error){
 filters:=` FROM blog_articles a LEFT JOIN blog_categories cat ON cat.id=a.category_id
 WHERE a.deleted_at IS NULL
 AND ($1::boolean OR (a.status='PUBLISHED' AND a.published_at<=now()))
 AND ($2::text='' OR a.status=$2)
 AND ($3::text='' OR cat.slug=$3)
 AND ($4::text='' OR EXISTS(SELECT 1 FROM blog_article_tags att JOIN blog_tags t ON att.tag_id=t.id WHERE att.article_id=a.id AND t.slug=$4))`
 var count int64
 err:=db.QueryRow(ctx,`SELECT count(*)`+filters,includeDraft,status,category,tag).Scan(&count)
 if err!=nil{return nil,0,err}
 rows,err:=db.Query(ctx,blogSelect+filters+` ORDER BY a.published_at DESC NULLS LAST,a.updated_at DESC,a.id DESC LIMIT $5 OFFSET $6`,includeDraft,status,category,tag,limit,offset)
 if err!=nil{return nil,0,err}
 defer rows.Close()
 items:=make([]blogArticle,0,limit)
 for rows.Next(){
  item,e:=scanBlogArticle(rows)
  if e!=nil{return nil,0,e}
  items=append(items,item)
 }
 if err=rows.Err();err!=nil{return nil,0,err}
 return items,count,nil
}
func readBlogDetail(ctx context.Context,db *pgxpool.Pool,idOrSlug string,admin bool)(blogArticle,error){
 cond:=`a.slug=$1 AND a.status='PUBLISHED' AND a.published_at<=now()`
 if admin{cond=`a.id::text=$1`}
 query:=blogSelect+`,a.content_json::text FROM blog_articles a LEFT JOIN blog_categories cat ON cat.id=a.category_id WHERE a.deleted_at IS NULL AND `+cond
 var published *time.Time
 var created,updated time.Time
 var a blogArticle
 var document string
 err:=db.QueryRow(ctx,query,idOrSlug).Scan(&a.ID,&a.Slug,&a.Title,&a.Excerpt,&a.CategorySlug,&a.TagSlugs,
  &a.CoverURL,&a.CoverAlt,&a.SEOTitle,&a.SEODescription,&a.OGImageURL,
  &a.Status,&a.Version,&a.AuthorID,&published,&created,&updated,&document)
 if err!=nil{return a,err}
 a.Content=[]byte(document)
 if a.TagSlugs==nil{a.TagSlugs=[]string{}}
 a.PublishedAt=published;a.CreatedAt=created;a.UpdatedAt=updated
 return a,nil
}
func (a *App) blogFeed(c *gin.Context){
 limit,offset,ok:=blogPagination(c)
 if !ok{c.JSON(400,gin.H{"error":"limit phải từ 1–30; offset từ 0–10000."});return}
 category,tag:=strings.TrimSpace(c.Query("category")),strings.TrimSpace(c.Query("tag"))
 if (category!=""&&!validBlogSlug(category,80))||(tag!=""&&!validBlogSlug(tag,80)){c.JSON(400,gin.H{"error":"Bộ lọc không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 items,count,err:=readBlogFeed(ctx,a.DB,false,"",category,tag,limit,offset)
 if err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items,"total":count,"limit":limit,"offset":offset})
}
func(a *App) blogDetail(c *gin.Context){
 slug:=c.Param("slug")
 if !validBlogSlug(slug,140){c.JSON(404,gin.H{"error":"Không tìm thấy bài viết."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),4*time.Second);defer cancel()
 article,err:=readBlogDetail(ctx,a.DB,slug,false)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(http.StatusNotFound,gin.H{"error":"Không tìm thấy bài viết."});return}
 if err!=nil{serverError(c,err);return}
 c.JSON(200,article)
}
func(a *App) blogCategories(c *gin.Context){
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT slug,name,description FROM blog_categories ORDER BY name LIMIT 100`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){var slug,name,description string
  if err=rows.Scan(&slug,&name,&description);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"slug":slug,"name":name,"description":description})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) blogTags(c *gin.Context){
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT slug,name FROM blog_tags ORDER BY name LIMIT 150`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){var slug,name string
  if err=rows.Scan(&slug,&name);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"slug":slug,"name":name})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func (a *App) adminBlogFeed(c *gin.Context) {
 if a.requireAdmin(c)==nil{return}
 limit,offset,ok:=blogPagination(c)
 if !ok{c.JSON(400,gin.H{"error":"Phân trang không hợp lệ."});return}
 status:=c.DefaultQuery("status","ALL")
 if status!="ALL"&&status!="DRAFT"&&status!="PUBLISHED"{c.JSON(400,gin.H{"error":"Trạng thái không hợp lệ."});return}
 if status=="ALL"{status=""}
 category,tag:=strings.TrimSpace(c.Query("category")),strings.TrimSpace(c.Query("tag"))
 if (category!=""&&!validBlogSlug(category,80))||(tag!=""&&!validBlogSlug(tag,80)){c.JSON(400,gin.H{"error":"Bộ lọc không hợp lệ."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 items,total,err:=readBlogFeed(ctx,a.DB,true,status,category,tag,limit,offset)
 if err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items,"total":total,"limit":limit,"offset":offset})
}
func (a *App) adminBlogDetail(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 item,err:=readBlogDetail(ctx,a.DB,c.Param("id"),true)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy bài viết."});return}
 if err!=nil{serverError(c,err);return}
 c.JSON(200,item)
}
