package handlers

import (
 "bytes"
 "context"
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "os"
 "testing"
 "time"

 "github.com/enjoy-life/store-api/internal/config"
 "github.com/jackc/pgx/v5/pgxpool"
)

func TestAdminIntegration(t *testing.T){
 url:=os.Getenv("INTEGRATION_DATABASE_URL")
 if url==""{t.Skip("No disposable database configured")}
 t.Setenv("APP_ENV","development");t.Setenv("GIN_MODE","debug");t.Setenv("ENABLE_DEV_ADMIN","true")
 ctx,cancel:=context.WithTimeout(context.Background(),20*time.Second);defer cancel()
 db,err:=pgxpool.New(ctx,url);if err!=nil{t.Fatal(err)};defer db.Close()
 if err=EnsureAccountSchema(ctx,db);err!=nil{t.Fatal(err)}
 if err=EnsureAdminAudit(ctx,db);err!=nil{t.Fatal(err)}
 r:=Router(&App{DB:db,Config:config.Config{}})
 send:=func(method,path string,body any,cookie *http.Cookie)*httptest.ResponseRecorder{
  t.Helper()
  data,_:=json.Marshal(body)
  req:=httptest.NewRequest(method,path,bytes.NewReader(data))
  req.Header.Set("Content-Type","application/json")
  if cookie!=nil{req.AddCookie(cookie)}
  rec:=httptest.NewRecorder();r.ServeHTTP(rec,req);return rec
 }
 if r:=send("GET","/api/v1/admin/dashboard",nil,nil);r.Code!=401{t.Fatalf("unauthorized request=%d",r.Code)}
 login:=send("POST","/api/v1/auth/admin-demo",map[string]any{"username":"admin","password":"admin"},nil)
 if login.Code!=200{t.Fatalf("login=%d %s",login.Code,login.Body.String())}
 var cookie *http.Cookie
 for _,c:=range login.Result().Cookies(){if c.Name=="enjoy_life_session"{cookie=c}}
 if cookie==nil||!cookie.HttpOnly{t.Fatal("missing secure session")}
 if r:=send("GET","/api/v1/admin/dashboard",nil,cookie);r.Code!=200{t.Fatalf("dashboard=%d %s",r.Code,r.Body.String())}
 product:=send("POST","/api/v1/admin/products",map[string]any{
  "name":"Integration tee","slug":"ci-integration-tee","description":"Test","category":"ao",
  "collection":"Tests","image_url":"","sku":"CI-INTEG-M","color":"Be","size":"M","price_vnd":99000,"opening_stock":6,"published":true,
 },cookie)
 if product.Code!=201{t.Fatalf("create product=%d %s",product.Code,product.Body.String())}
 var p struct{ID string `json:"id"`;VariantID string `json:"variant_id"`}
 if err=json.Unmarshal(product.Body.Bytes(),&p);err!=nil{t.Fatal(err)}
 variant:=send("POST","/api/v1/admin/products/"+p.ID+"/variants",map[string]any{"sku":"CI-INTEG-L","color":"Be","size":"L","price_vnd":99000,"opening_stock":2},cookie)
 if variant.Code!=201{t.Fatalf("variant=%d %s",variant.Code,variant.Body.String())}
 adjust:=send("PATCH","/api/v1/admin/inventory/"+p.VariantID,map[string]any{"delta":2,"reason":"CI Restock verification"},cookie)
 if adjust.Code!=200{t.Fatalf("adjust=%d %s",adjust.Code,adjust.Body.String())}
 order:=send("POST","/api/v1/orders",map[string]any{
  "client_order_key":"ci-admin-integration-order-001",
  "customer_name":"Test Customer","customer_phone":"0901234567","shipping_address":"123 Example Street Vietnam","payment_method":"COD",
  "items":[]map[string]any{{"variant_id":p.VariantID,"quantity":2}},
 },nil)
 if order.Code!=201{t.Fatalf("order=%d %s",order.Code,order.Body.String())}
 var o struct{OrderNo string `json:"order_no"`}
 if err=json.Unmarshal(order.Body.Bytes(),&o);err!=nil{t.Fatal(err)}
 for _,state:=range []string{"CONFIRMED","PREPARING","SHIPPING","DELIVERED","COMPLETED"}{
  rec:=send("PATCH","/api/v1/admin/orders/"+o.OrderNo+"/status",map[string]any{"status":state},cookie)
  if rec.Code!=200{t.Fatalf("%s=%d %s",state,rec.Code,rec.Body.String())}
 }
 paid:=send("POST","/api/v1/admin/orders/"+o.OrderNo+"/paid",map[string]any{},cookie)
 if paid.Code!=200{t.Fatalf("COD paid=%d %s",paid.Code,paid.Body.String())}
 var hand,reserved int
 if err=db.QueryRow(ctx,"SELECT on_hand,reserved FROM inventory WHERE variant_id=$1",p.VariantID).Scan(&hand,&reserved);err!=nil{t.Fatal(err)}
 if hand!=6||reserved!=0{t.Fatalf("incorrect stock hand=%d reserved=%d",hand,reserved)}
 if r:=send("POST","/api/v1/auth/logout",nil,cookie);r.Code!=204{t.Fatalf("logout=%d",r.Code)}
 if r:=send("GET","/api/v1/admin/dashboard",nil,cookie);r.Code!=401{t.Fatalf("session survived logout=%d",r.Code)}
}
