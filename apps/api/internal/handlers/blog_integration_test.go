package handlers

import (
 "bytes"
 "context"
 "encoding/json"
 "fmt"
 "net/http"
 "net/http/httptest"
 "os"
 "strings"
 "testing"
 "time"

 "github.com/enjoy-life/store-api/internal/config"
 "github.com/jackc/pgx/v5/pgxpool"
)

func TestBlogIntegration(t *testing.T){
 dsn:=os.Getenv("INTEGRATION_DATABASE_URL")
 if dsn==""{t.Skip("INTEGRATION_DATABASE_URL required")}
 t.Setenv("APP_ENV","development")
 t.Setenv("GIN_MODE","debug")
 t.Setenv("ENABLE_DEV_ADMIN","true")
 ctx,cancel:=context.WithTimeout(context.Background(),35*time.Second);defer cancel()
 db,err:=pgxpool.New(ctx,dsn);if err!=nil{t.Fatal(err)};defer db.Close()
 if err:=EnsureAccountSchema(ctx,db);err!=nil{t.Fatal(err)}
 if err:=EnsureAdminAudit(ctx,db);err!=nil{t.Fatal(err)}
 // Reentrant migration must support both new installs and persistent volumes.
 if err:=EnsureBlogSchema(ctx,db);err!=nil{t.Fatal(err)}
 if err:=EnsureBlogSchema(ctx,db);err!=nil{t.Fatal(err)}
 api:=Router(&App{DB:db,Config:config.Config{}})
 call:=func(method,path string,body any,cookie *http.Cookie)*httptest.ResponseRecorder{
  t.Helper()
  var data []byte
  if body!=nil{data,err=json.Marshal(body);if err!=nil{t.Fatal(err)}}
  req:=httptest.NewRequest(method,path,bytes.NewReader(data))
  req.Header.Set("Content-Type","application/json")
  if cookie!=nil{req.AddCookie(cookie)}
  rec:=httptest.NewRecorder();api.ServeHTTP(rec,req);return rec
 }
 check:=func(code int,r *httptest.ResponseRecorder){
  t.Helper()
  if r.Code!=code{t.Fatalf("wanted %d got %d: %s",code,r.Code,r.Body.String())}
 }
 parse:=func(r *httptest.ResponseRecorder)map[string]any{
  t.Helper();var value map[string]any
  if err=json.Unmarshal(r.Body.Bytes(),&value);err!=nil{t.Fatal(err)}
  return value
 }
 sessionCookieFrom:=func(r *httptest.ResponseRecorder)*http.Cookie{
  t.Helper()
  for _,c:=range r.Result().Cookies(){if c.Name==sessionCookie{return c}}
  t.Fatal("session cookie missing");return nil
 }
 login:=call("POST","/api/v1/auth/admin-demo",map[string]any{"username":"admin","password":"admin"},nil)
 check(200,login);admin:=sessionCookieFrom(login)
 suffix:=fmt.Sprintf("%d",time.Now().UnixNano())
 visitor:=call("POST","/api/v1/auth/register",map[string]any{"name":"Sample Customer","email":"journal-"+suffix+"@example.test","password":"customer-strong-password"},nil)
 check(201,visitor);customer:=sessionCookieFrom(visitor)
 articleEndpoint:="/api/v1/admin/blog/articles"
 check(401,call("POST",articleEndpoint,map[string]any{},nil))
 check(403,call("GET",articleEndpoint,nil,customer))
 check(403,call("POST",articleEndpoint,map[string]any{},customer))

 category:="style-"+suffix
 tag:="minimal-"+suffix
 check(201,call("POST","/api/v1/admin/blog/categories",map[string]any{"slug":category,"name":"Phong cách","description":"Fashion style"},admin))
 check(201,call("POST","/api/v1/admin/blog/tags",map[string]any{"slug":tag,"name":"Tối giản"},admin))
 check(200,call("GET","/api/v1/blog/categories",nil,nil))
 check(200,call("GET","/api/v1/blog/tags",nil,nil))
 slug:="enjoy-post-"+suffix
 article:=map[string]any{
  "slug":slug,"title":"Lựa chọn một phong cách giản dị","excerpt":"Cảm hứng phối trang phục tối giản cho những ngày bận rộn.",
  "content_json":map[string]any{"type":"doc","content":[]any{map[string]any{"type":"paragraph","content":[]any{map[string]any{"type":"text","text":"Một bài viết đủ dài giúp bạn khám phá phong cách thường ngày."}}}}},
  "category_slug":category,"tag_slugs":[]string{tag},"cover_image_url":"","cover_image_alt":"","seo_title":"Phong cách tối giản",
  "seo_description":"Hướng dẫn chọn trang phục đơn giản, tự nhiên và phù hợp với mỗi người.","og_image_url":"","status":"DRAFT",
 }
 created:=call("POST",articleEndpoint,article,admin)
 check(201,created)
 id,ok:=parse(created)["id"].(string)
 if !ok||id==""{t.Fatal("create article ID missing")}
 read:=call("GET",articleEndpoint+"/"+id,nil,admin);check(200,read)
 draft:=parse(read)
 if draft["status"]!="DRAFT"{t.Fatalf("draft status=%v",draft["status"])}
 if draft["content_json"]==nil{t.Fatal("editor content missing")}
 publicDetail:="/api/v1/blog/articles/"+slug
 check(404,call("GET",publicDetail,nil,nil))
 feed:=call("GET","/api/v1/blog/articles?limit=10",nil,nil);check(200,feed)
 if strings.Contains(feed.Body.String(),slug){t.Fatal("DRAFT leaked to public feed")}

 check(400,call("POST",articleEndpoint,map[string]any{"slug":"bad post!"},admin))
 check(409,call("POST",articleEndpoint,article,admin))
 statusURL:=articleEndpoint+"/"+id+"/status"
 check(409,call("PATCH",statusURL,map[string]any{"status":"PUBLISHED","expected_version":99},admin))
 check(200,call("PATCH",statusURL,map[string]any{"status":"PUBLISHED","expected_version":1},admin))
 detail:=call("GET",publicDetail,nil,nil);check(200,detail)
 published:=parse(detail)
 if published["status"]!="PUBLISHED"||published["content_json"]==nil{t.Fatal("published article missing")}
 filtered:=call("GET","/api/v1/blog/articles?category="+category+"&tag="+tag,nil,nil);check(200,filtered)
 if !strings.Contains(filtered.Body.String(),slug){t.Fatal("Published article missing from filtered feed")}
 check(400,call("GET","/api/v1/blog/articles?limit=999",nil,nil))
 article["expected_version"]=1
 check(409,call("PUT",articleEndpoint+"/"+id,article,admin))
 article["expected_version"]=2
 article["seo_title"]="Phong cách nhẹ nhàng cho mỗi ngày"
 article["status"]="PUBLISHED"
 update:=call("PUT",articleEndpoint+"/"+id,article,admin);check(200,update)
 if parse(update)["version"]!=float64(3){t.Fatal("Version was not incremented")}
 check(409,call("PATCH",statusURL,map[string]any{"status":"DRAFT","expected_version":2},admin))
 check(200,call("PATCH",statusURL,map[string]any{"status":"DRAFT","expected_version":3},admin))
 check(404,call("GET",publicDetail,nil,nil))
 check(200,call("PATCH",statusURL,map[string]any{"status":"PUBLISHED","expected_version":4},admin))
 check(204,call("DELETE",articleEndpoint+"/"+id,map[string]any{"expected_version":5},admin))
 check(404,call("GET",publicDetail,nil,nil))
 check(404,call("GET",articleEndpoint+"/"+id,nil,admin))
 var audit int
 if err:=db.QueryRow(ctx,`SELECT count(*) FROM admin_audit_logs WHERE target_id=$1 AND action LIKE 'BLOG_%'`,id).Scan(&audit);err!=nil{t.Fatal(err)}
 if audit<5{t.Fatalf("expected audit trail, got %d entries",audit)}
}
