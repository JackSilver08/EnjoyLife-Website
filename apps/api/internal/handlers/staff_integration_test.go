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

func TestAdminIntegrationStaff(t *testing.T) {
 url:=os.Getenv("INTEGRATION_DATABASE_URL")
 if url=="" {t.Skip("No disposable PostgreSQL configured")}
 t.Setenv("APP_ENV","development")
 t.Setenv("GIN_MODE","debug")
 t.Setenv("ENABLE_DEV_ADMIN","true")
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
 cookieOf:=func(rec *httptest.ResponseRecorder)*http.Cookie {
  t.Helper()
  for _,v:=range rec.Result().Cookies(){if v.Name==sessionCookie{return v}}
  t.Fatal("missing session cookie");return nil
 }
 if rec:=send("GET","/api/v1/admin/orders",nil,nil);rec.Code!=401{t.Fatalf("guest=%d",rec.Code)}
 adminLogin:=send("POST","/api/v1/auth/admin-demo",map[string]string{"username":"admin","password":"admin"},nil)
 if adminLogin.Code!=200{t.Fatalf("admin login=%d %s",adminLogin.Code,adminLogin.Body.String())}
 admin:=cookieOf(adminLogin)
 email:="staff-integration-"+time.Now().Format("20060102150405.000000000")+"@example.test"
 created:=send("POST","/api/v1/admin/staff",map[string]string{"email":email,"name":"Warehouse Staff","password":"integrationPassword2026!"},admin)
 if created.Code!=201{t.Fatalf("create staff=%d %s",created.Code,created.Body.String())}
 var staff struct{ID string `json:"id"`;Role string `json:"role"`}
 if err=json.Unmarshal(created.Body.Bytes(),&staff);err!=nil{t.Fatal(err)}
 if staff.Role!="STAFF"||staff.ID==""{t.Fatalf("bad staff response: %s",created.Body.String())}
 login:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"integrationPassword2026!"},nil)
 if login.Code!=200{t.Fatalf("staff login=%d %s",login.Code,login.Body.String())}
 staffCookie:=cookieOf(login)
 for _,path:=range []string{"/api/v1/admin/orders","/api/v1/admin/products","/api/v1/admin/inventory"} {
  if rec:=send("GET",path,nil,staffCookie);rec.Code!=200{t.Fatalf("staff read %s=%d %s",path,rec.Code,rec.Body.String())}
 }
 for _,test:=range []struct{method,path string}{
  {"GET","/api/v1/admin/users"},{"GET","/api/v1/admin/staff"},{"GET","/api/v1/admin/dashboard"},
  {"POST","/api/v1/admin/products"},{"POST","/api/v1/admin/staff"},
 } {
  if rec:=send(test.method,test.path,nil,staffCookie);rec.Code!=403{t.Fatalf("staff %s %s=%d",test.method,test.path,rec.Code)}
 }
 reg:=send("POST","/api/v1/auth/register",map[string]string{"email":"customer-"+time.Now().Format("150405.000000000")+"@example.test","name":"Test Customer","password":"customerPassword2026!"},nil)
 if reg.Code!=200{t.Fatalf("customer register=%d %s",reg.Code,reg.Body.String())}
 if rec:=send("GET","/api/v1/admin/orders",nil,cookieOf(reg));rec.Code!=403{t.Fatalf("customer admin access=%d",rec.Code)}

 // Staff operations must be enforced by the API and write an audit trail.
 if err=EnsureProductCatalogSchema(ctx,db);err!=nil{t.Fatal(err)}
 product:=send("POST","/api/v1/admin/products",map[string]any{
  "name":"Sprint 7 staff item","slug":"sprint7-"+time.Now().Format("150405000000000"),
  "description":"Integration","category":"ao","collection":"Test",
  "image_url":"","color":"Black","size":"M","price_vnd":199000,"opening_stock":6,"published":true,
 },admin)
 if product.Code!=201{t.Fatalf("staff fixture product=%d %s",product.Code,product.Body.String())}
 var item struct{VariantID string `json:"variant_id"`}
 if err=json.Unmarshal(product.Body.Bytes(),&item);err!=nil{t.Fatal(err)}
 stock:=send("PATCH","/api/v1/admin/inventory/"+item.VariantID,map[string]any{"action":"RECEIVE","quantity":3,"reason":"Sprint 7 staff restock"},staffCookie)
 if stock.Code!=200{t.Fatalf("staff stock update=%d %s",stock.Code,stock.Body.String())}
 order:=send("POST","/api/v1/orders",map[string]any{
  "client_order_key":"staff-test-"+time.Now().Format("150405.000000000"),
  "customer_name":"Staff Test Customer","customer_phone":"0901234567",
  "shipping_address":"Valid integration test address","payment_method":"COD",
  "items":[]map[string]any{{"variant_id":item.VariantID,"quantity":1}},
 },nil)
 if order.Code!=201{t.Fatalf("staff fixture order=%d %s",order.Code,order.Body.String())}
 var orderData struct{OrderNo string `json:"order_no"`}
 if err=json.Unmarshal(order.Body.Bytes(),&orderData);err!=nil{t.Fatal(err)}
 confirmed:=send("PATCH","/api/v1/admin/orders/"+orderData.OrderNo+"/status",map[string]string{"status":"CONFIRMED"},staffCookie)
 if confirmed.Code!=200{t.Fatalf("staff order status=%d %s",confirmed.Code,confirmed.Body.String())}
 if rec:=send("POST","/api/v1/admin/orders/"+orderData.OrderNo+"/paid",nil,staffCookie);rec.Code!=403{t.Fatalf("staff can mark COD paid: %d",rec.Code)}

 disabled:=true
 change:=send("PATCH","/api/v1/admin/staff/"+staff.ID,map[string]bool{"disabled":disabled},admin)
 if change.Code!=200{t.Fatalf("disable=%d %s",change.Code,change.Body.String())}
 if rec:=send("GET","/api/v1/admin/orders",nil,staffCookie);rec.Code!=401{t.Fatalf("disabled session=%d",rec.Code)}
 if rec:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"integrationPassword2026!"},nil);rec.Code!=401{t.Fatalf("disabled login=%d",rec.Code)}
 change=send("PATCH","/api/v1/admin/staff/"+staff.ID,map[string]bool{"disabled":false},admin)
 if change.Code!=200{t.Fatalf("restore=%d",change.Code)}
 restored:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"integrationPassword2026!"},nil)
 if restored.Code!=200{t.Fatalf("restored login=%d",restored.Code)}
 changePassword:=send("POST","/api/v1/auth/change-password",map[string]string{
  "current_password":"integrationPassword2026!","new_password":"staffNewPassword2026!",
 },cookieOf(restored))
 if changePassword.Code!=200{t.Fatalf("staff password change=%d %s",changePassword.Code,changePassword.Body.String())}
 if rec:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"integrationPassword2026!"},nil);rec.Code!=401{t.Fatalf("old password accepted after change: %d",rec.Code)}
 newLogin:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"staffNewPassword2026!"},nil)
 if newLogin.Code!=200{t.Fatalf("new password login=%d %s",newLogin.Code,newLogin.Body.String())}
 adminReset:=send("POST","/api/v1/admin/staff/"+staff.ID+"/reset-password",map[string]string{"password":"resetByAdmin2026!"},admin)
 if adminReset.Code!=200{t.Fatalf("admin password reset=%d %s",adminReset.Code,adminReset.Body.String())}
 if rec:=send("GET","/api/v1/admin/orders",nil,cookieOf(newLogin));rec.Code!=401{t.Fatalf("reset failed to revoke session: %d",rec.Code)}
 if rec:=send("POST","/api/v1/auth/login",map[string]string{"email":email,"password":"resetByAdmin2026!"},nil);rec.Code!=200{t.Fatalf("reset password login=%d",rec.Code)}
 lockedEmail:="invalid-"+time.Now().Format("150405.000000000")+"@example.test"
 for i:=0;i<5;i++{
  if rec:=send("POST","/api/v1/auth/login",map[string]string{"email":lockedEmail,"password":"incorrect password"},nil);rec.Code!=401{t.Fatalf("failed login #%d=%d",i,rec.Code)}
 }
 if rec:=send("POST","/api/v1/auth/login",map[string]string{"email":lockedEmail,"password":"incorrect password"},nil);rec.Code!=429{t.Fatalf("attempt lockout=%d",rec.Code)}

}
