package handlers

import (
 "context"
 "errors"
 "net/http"
 "strings"
 "time"
 "unicode/utf8"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
 "github.com/jackc/pgx/v5/pgconn"
)

func blogWriteError(c *gin.Context,err error){
 var pgErr *pgconn.PgError
 if errors.As(err,&pgErr) {
  if pgErr.Code=="23505"{c.JSON(409,gin.H{"error":"Slug đã tồn tại; hãy chọn slug khác."});return}
  if pgErr.Code=="23503"||pgErr.Code=="23514"||pgErr.Code=="22P02"{c.JSON(400,gin.H{"error":"Dữ liệu bài viết không hợp lệ."});return}
 }
 serverError(c,err)
}
func blogCategoryID(ctx context.Context,tx pgx.Tx,slug string)(any,error){
 if slug==""{return nil,nil}
 var id string
 err:=tx.QueryRow(ctx,`SELECT id::text FROM blog_categories WHERE slug=$1`,slug).Scan(&id)
 return id,err
}
func blogReplaceTags(ctx context.Context,tx pgx.Tx,articleID string,tags []string)error {
 if _,err:=tx.Exec(ctx,`DELETE FROM blog_article_tags WHERE article_id=$1`,articleID);err!=nil{return err}
 for _,slug:=range tags {
  var tagID string
  if err:=tx.QueryRow(ctx,`SELECT id::text FROM blog_tags WHERE slug=$1`,slug).Scan(&tagID);err!=nil{return err}
  if _,err:=tx.Exec(ctx,`INSERT INTO blog_article_tags(article_id,tag_id) VALUES($1,$2)`,articleID,tagID);err!=nil{return err}
 }
 return nil
}
func(a *App) adminBlogCreate(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in blogInput
 if c.ShouldBindJSON(&in)!=nil{c.JSON(400,gin.H{"error":"JSON bài viết không hợp lệ."});return}
 if err:=normalizeBlogInput(&in);err!=nil{c.JSON(400,gin.H{"error":err.Error()});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 categoryID,err:=blogCategoryID(ctx,tx,in.CategorySlug)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(400,gin.H{"error":"Danh mục không tồn tại."});return}
 if err!=nil{serverError(c,err);return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO blog_articles
 (id,slug,title,excerpt,content_json,category_id,cover_image_url,cover_image_alt,seo_title,seo_description,og_image_url,status,author_id,updated_by,published_at)
 VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13,$13,CASE WHEN $12='PUBLISHED' THEN now() ELSE NULL END)`,
 id,in.Slug,in.Title,in.Excerpt,string(in.Content),categoryID,in.CoverURL,in.CoverAlt,in.SEOTitle,in.SEODescription,in.OGImageURL,in.Status,actor.ID)
 if err!=nil{blogWriteError(c,err);return}
 if err=blogReplaceTags(ctx,tx,id,in.TagSlugs);err!=nil{
  if errors.Is(err,pgx.ErrNoRows){c.JSON(400,gin.H{"error":"Một hoặc nhiều thẻ không tồn tại."});return}
  blogWriteError(c,err);return
 }
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'BLOG_CREATE',$2,$3)`,actor.ID,id,in.Status+" / "+in.Slug)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{blogWriteError(c,err);return}
 c.JSON(http.StatusCreated,gin.H{"id":id,"slug":in.Slug,"status":in.Status,"version":1})
}
func(a *App) adminBlogUpdate(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in blogInput
 if c.ShouldBindJSON(&in)!=nil||in.ExpectedVersion<1{c.JSON(400,gin.H{"error":"Cần đầy đủ dữ liệu và expected_version hợp lệ."});return}
 if err:=normalizeBlogInput(&in);err!=nil{c.JSON(400,gin.H{"error":err.Error()});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),7*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var version int
 err=tx.QueryRow(ctx,`SELECT version FROM blog_articles WHERE id::text=$1 AND deleted_at IS NULL FOR UPDATE`,c.Param("id")).Scan(&version)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy bài viết."});return}
 if err!=nil{blogWriteError(c,err);return}
 if version!=in.ExpectedVersion{c.JSON(409,gin.H{"error":"Bài viết đã thay đổi trên phiên khác. Tải lại trước khi lưu."});return}
 categoryID,err:=blogCategoryID(ctx,tx,in.CategorySlug)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(400,gin.H{"error":"Danh mục không tồn tại."});return}
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`UPDATE blog_articles SET
 slug=$1,title=$2,excerpt=$3,content_json=$4::jsonb,category_id=$5,cover_image_url=$6,cover_image_alt=$7,
 seo_title=$8,seo_description=$9,og_image_url=$10,status=$11,
 published_at=CASE WHEN $11='PUBLISHED' THEN COALESCE(published_at,now()) ELSE NULL END,
 updated_by=$12,updated_at=now(),version=version+1 WHERE id::text=$13`,
 in.Slug,in.Title,in.Excerpt,string(in.Content),categoryID,in.CoverURL,in.CoverAlt,in.SEOTitle,in.SEODescription,in.OGImageURL,in.Status,actor.ID,c.Param("id"))
 if err!=nil{blogWriteError(c,err);return}
 if err=blogReplaceTags(ctx,tx,c.Param("id"),in.TagSlugs);err!=nil{
  if errors.Is(err,pgx.ErrNoRows){c.JSON(400,gin.H{"error":"Một hoặc nhiều thẻ không tồn tại."});return}
  blogWriteError(c,err);return
 }
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'BLOG_UPDATE',$2,$3)`,actor.ID,c.Param("id"),in.Status+" / "+in.Slug)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{blogWriteError(c,err);return}
 c.JSON(200,gin.H{"id":c.Param("id"),"slug":in.Slug,"status":in.Status,"version":version+1})
}
func(a *App) adminBlogStatus(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in struct{
  Status string `json:"status"`
  ExpectedVersion int `json:"expected_version"`
 }
 if c.ShouldBindJSON(&in)!=nil||in.ExpectedVersion<1||(in.Status!="DRAFT"&&in.Status!="PUBLISHED"){
  c.JSON(400,gin.H{"error":"Trạng thái hoặc version không hợp lệ."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var version int;var excerpt,doc string
 err=tx.QueryRow(ctx,`SELECT version,excerpt,content_json::text FROM blog_articles WHERE id::text=$1 AND deleted_at IS NULL FOR UPDATE`,c.Param("id")).Scan(&version,&excerpt,&doc)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy bài viết."});return}
 if err!=nil{blogWriteError(c,err);return}
 if version!=in.ExpectedVersion{c.JSON(409,gin.H{"error":"Version đã thay đổi; vui lòng tải lại."});return}
 if in.Status=="PUBLISHED" && (utf8.RuneCountInString(strings.TrimSpace(excerpt))<20||!blogDocHasText([]byte(doc))){
  c.JSON(400,gin.H{"error":"Chỉ có thể xuất bản bài đã có mô tả và nội dung hợp lệ."});return
 }
 _,err=tx.Exec(ctx,`UPDATE blog_articles SET status=$1,
 published_at=CASE WHEN $1='PUBLISHED' THEN COALESCE(published_at,now()) ELSE NULL END,
 updated_by=$2,updated_at=now(),version=version+1 WHERE id::text=$3`,in.Status,actor.ID,c.Param("id"))
 if err!=nil{blogWriteError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'BLOG_STATUS',$2,$3)`,actor.ID,c.Param("id"),in.Status)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{blogWriteError(c,err);return}
 c.JSON(200,gin.H{"status":in.Status,"version":version+1})
}
func(a *App) adminBlogArchive(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in struct{ExpectedVersion int `json:"expected_version"`}
 if c.ShouldBindJSON(&in)!=nil||in.ExpectedVersion<1{c.JSON(400,gin.H{"error":"expected_version là bắt buộc."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var version int
 err=tx.QueryRow(ctx,`SELECT version FROM blog_articles WHERE id::text=$1 AND deleted_at IS NULL FOR UPDATE`,c.Param("id")).Scan(&version)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy bài viết."});return}
 if err!=nil{blogWriteError(c,err);return}
 if version!=in.ExpectedVersion{c.JSON(409,gin.H{"error":"Phiên bản không khớp."});return}
 _,err=tx.Exec(ctx,`UPDATE blog_articles SET status='DRAFT',published_at=NULL,deleted_at=now(),updated_by=$1,updated_at=now(),version=version+1 WHERE id::text=$2`,actor.ID,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'BLOG_ARCHIVE',$2,'Soft delete; slug retained')`,actor.ID,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{blogWriteError(c,err);return}
 c.Status(http.StatusNoContent)
}

func(a *App) adminBlogCategoryCreate(c *gin.Context){a.adminBlogTaxonomyCreate(c,"category")}
func(a *App) adminBlogTagCreate(c *gin.Context){a.adminBlogTaxonomyCreate(c,"tag")}
func(a *App) adminBlogTaxonomyCreate(c *gin.Context,kind string){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var in struct {
  Slug string `json:"slug"`
  Name string `json:"name"`
  Description string `json:"description"`
 }
 if c.ShouldBindJSON(&in)!=nil{c.JSON(400,gin.H{"error":"Dữ liệu không hợp lệ."});return}
 in.Slug=strings.TrimSpace(strings.ToLower(in.Slug));in.Name=strings.TrimSpace(in.Name)
 if !validBlogSlug(in.Slug,80)||utf8.RuneCountInString(in.Name)<2||utf8.RuneCountInString(in.Name)>120||len(in.Description)>500{
  c.JSON(400,gin.H{"error":"Slug, tên hoặc mô tả không hợp lệ."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 if kind=="category" {
  _,err=tx.Exec(ctx,`INSERT INTO blog_categories(id,slug,name,description) VALUES($1,$2,$3,$4)`,id,in.Slug,in.Name,in.Description)
 }else{
  _,err=tx.Exec(ctx,`INSERT INTO blog_tags(id,slug,name) VALUES($1,$2,$3)`,id,in.Slug,in.Name)
 }
 if err!=nil{blogWriteError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,$2,$3,$4)`,actor.ID,"BLOG_"+strings.ToUpper(kind)+"_CREATE",id,in.Slug)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{blogWriteError(c,err);return}
 c.JSON(201,gin.H{"id":id,"slug":in.Slug,"name":in.Name})
}
