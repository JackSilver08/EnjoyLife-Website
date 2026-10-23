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
func TestSprint9WarehouseIntegration(t *testing.T){
 url:=os.Getenv("INTEGRATION_DATABASE_URL")
 if url==""{t.Skip("no disposable PostgreSQL")}
 t.Setenv("APP_ENV","development");t.Setenv("GIN_MODE","debug");t.Setenv("ENABLE_DEV_ADMIN","true")
 ctx,cancel:=context.WithTimeout(context.Background(),50*time.Second);defer cancel()
 db,err:=pgxpool.New(ctx,url);if err!=nil{t.Fatal(err)};defer db.Close()
 for _,migration:=range []func(context.Context,*pgxpool.Pool)error{EnsureAccountSchema,EnsureAdminAudit,EnsureProductCatalogSchema,EnsureWarehouseSchema}{
  if err=migration(ctx,db);err!=nil{t.Fatal(err)}
 }
 r:=Router(&App{DB:db,Config:config.Config{}})
 send:=func(method,path string,body any,cookie *http.Cookie)*httptest.ResponseRecorder{
  t.Helper();data,_:=json.Marshal(body)
  req:=httptest.NewRequest(method,path,bytes.NewReader(data));req.Header.Set("Content-Type","application/json")
  if cookie!=nil{req.AddCookie(cookie)}
  rec:=httptest.NewRecorder();r.ServeHTTP(rec,req);return rec
 }
 login:=send("POST","/api/v1/auth/admin-demo",map[string]any{"username":"admin","password":"admin"},nil)
 if login.Code!=200{t.Fatalf("login %d %s",login.Code,login.Body)}
 var cookie *http.Cookie
 for _,v:=range login.Result().Cookies(){if v.Name=="enjoy_life_session"{cookie=v}}
 if cookie==nil{t.Fatal("missing admin cookie")}
 fixture:="wh-"+fmt.Sprint(time.Now().UnixNano())
 product:=send("POST","/api/v1/admin/products",map[string]any{"name":"Warehouse Women Dress", "slug":fixture,"description":"warehouse test","category":"ao","color":"Đen","size":"M","price_vnd":250000,"opening_stock":0,"published":true},cookie)
 if product.Code!=201{t.Fatalf("product %d %s",product.Code,product.Body)}
 var p struct{VariantID string `json:"variant_id"`}
 if err=json.Unmarshal(product.Body.Bytes(),&p);err!=nil||p.VariantID==""{t.Fatalf("product variant %v %s",err,product.Body)}
 unsubscribed:=send("POST","/api/v1/stock-alerts",map[string]any{"variant_id":p.VariantID,"email":"shopper@example.com","consent":false},nil)
 if unsubscribed.Code!=400{t.Fatalf("waitlist without consent accepted: %d",unsubscribed.Code)}
 join:=map[string]any{"variant_id":p.VariantID,"email":"shopper@example.com","consent":true}
 if rec:=send("POST","/api/v1/stock-alerts",join,nil);rec.Code!=202{t.Fatalf("waitlist %d %s",rec.Code,rec.Body)}
 if rec:=send("POST","/api/v1/stock-alerts",join,nil);rec.Code!=202{t.Fatalf("duplicate waitlist %d",rec.Code)}
 var waitCount int
 if err=db.QueryRow(ctx,"SELECT count(*) FROM stock_waitlist WHERE variant_id=$1",p.VariantID).Scan(&waitCount);err!=nil||waitCount!=1{t.Fatalf("duplicate waitlist %d %v",waitCount,err)}
 denied:=send("GET","/api/v1/admin/warehouse/waitlist",nil,nil)
 if denied.Code!=401{t.Fatalf("unprotected customer contacts: %d",denied.Code)}
 supplier:=send("POST","/api/v1/admin/warehouse/suppliers",map[string]any{"name":"Fashion supplier CI","contact":"internal-only","lead_days":5},cookie)
 if supplier.Code!=201{t.Fatalf("supplier %d %s",supplier.Code,supplier.Body)}
 var supp struct{ID string `json:"id"`}
 _=json.Unmarshal(supplier.Body.Bytes(),&supp)
 if supp.ID==""{t.Fatal("supplier id missing")}
 poBody:=map[string]any{"supplier_id":supp.ID,"expected_date":"2026-11-05","note":"CI clothing restock",
  "items":[]map[string]any{{"variant_id":p.VariantID,"quantity":6,"unit_cost_vnd":110000}}}
 purchase:=send("POST","/api/v1/admin/warehouse/purchases",poBody,cookie)
 if purchase.Code!=201{t.Fatalf("purchase %d %s",purchase.Code,purchase.Body)}
 var order struct{ID string `json:"id"`;No string `json:"po_no"`}
 _=json.Unmarshal(purchase.Body.Bytes(),&order)
 if order.ID==""||!strings.HasPrefix(order.No,"PO-"){t.Fatalf("bad PO metadata: %s",purchase.Body)}
 detail:=send("GET","/api/v1/admin/warehouse/purchases/"+order.ID,nil,cookie)
 if detail.Code!=200{t.Fatalf("detail %d %s",detail.Code,detail.Body)}
 var d struct{Items []struct{ID string `json:"id"`;Remaining int `json:"remaining"`} `json:"items"`}
 _=json.Unmarshal(detail.Body.Bytes(),&d)
 if len(d.Items)!=1||d.Items[0].Remaining!=6{t.Fatal("bad purchase detail")}
 itemID:=d.Items[0].ID
 receive:=map[string]any{"request_key":"test-receipt-one","note":"Checked packaging",
  "lines":[]map[string]any{{"item_id":itemID,"accepted":2,"quarantined":1}}}
 if rec:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/receipts",receive,nil);rec.Code!=401{t.Fatalf("unauthorized receipt accepted %d",rec.Code)}
 first:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/receipts",receive,cookie)
 if first.Code!=201||!bytes.Contains(first.Body.Bytes(),[]byte("PARTIAL")){t.Fatalf("partial receive %d %s",first.Code,first.Body)}
 repeated:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/receipts",receive,cookie)
 if repeated.Code!=200||!bytes.Contains(repeated.Body.Bytes(),[]byte("true")){t.Fatalf("idempotent receipt %d %s",repeated.Code,repeated.Body)}
 var hand,unavailable,held int
 queryStock:=func(){
  t.Helper()
  if err=db.QueryRow(ctx,"SELECT on_hand,unavailable,reserved FROM inventory WHERE variant_id=$1",p.VariantID).Scan(&hand,&unavailable,&held);err!=nil{t.Fatal(err)}
 }
 queryStock()
 if hand!=3||unavailable!=1||held!=0{t.Fatalf("duplicate receipt inflated stock: %d %d %d",hand,unavailable,held)}
 exceeds:=map[string]any{"request_key":"test-receipt-over","lines":[]map[string]any{{"item_id":itemID,"accepted":4,"quarantined":0}}}
 if rec:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/receipts",exceeds,cookie);rec.Code!=409{t.Fatalf("excess receipt allowed: %d %s",rec.Code,rec.Body)}
 queryStock();if hand!=3{t.Fatal("excess receive changed inventory")}
 complete:=map[string]any{"request_key":"test-receipt-final","lines":[]map[string]any{{"item_id":itemID,"accepted":3,"quarantined":0}}}
 if rec:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/receipts",complete,cookie);rec.Code!=201||!bytes.Contains(rec.Body.Bytes(),[]byte("RECEIVED")){t.Fatalf("final receipt %d %s",rec.Code,rec.Body)}
 queryStock();if hand!=6||unavailable!=1{t.Fatalf("wrong final stock %d %d",hand,unavailable)}
 if rec:=send("POST","/api/v1/admin/warehouse/purchases/"+order.ID+"/cancel",nil,cookie);rec.Code!=409{t.Fatalf("cancelled received PO: %d",rec.Code)}
 release:=send("POST","/api/v1/admin/warehouse/qc/"+p.VariantID,map[string]any{"action":"RELEASE","quantity":1,"reason":"Passed inspection"},cookie)
 if release.Code!=200{t.Fatalf("QC release %d %s",release.Code,release.Body)}
 queryStock();if hand!=6||unavailable!=0{t.Fatalf("QC stock mismatch: %d %d",hand,unavailable)}
 if rec:=send("POST","/api/v1/admin/warehouse/qc/"+p.VariantID,map[string]any{"action":"SCRAP","quantity":1,"reason":"Invalid disposal"},cookie);rec.Code!=409{t.Fatalf("unquarantined scrap allowed: %d",rec.Code)}
 if rec:=send("POST","/api/v1/stock-alerts",join,nil);rec.Code!=409{t.Fatalf("joined waitlist while in stock: %d",rec.Code)}
 waitlist:=send("GET","/api/v1/admin/warehouse/waitlist",nil,cookie)
 if waitlist.Code!=200||!bytes.Contains(waitlist.Body.Bytes(),[]byte("shopper@example.com")){t.Fatalf("waitlist admin %d %s",waitlist.Code,waitlist.Body)}
 insights:=send("GET","/api/v1/admin/warehouse/insights",nil,cookie)
 if insights.Code!=200||!bytes.Contains(insights.Body.Bytes(),[]byte("sold_30d")){t.Fatalf("warehouse insights %d %s",insights.Code,insights.Body)}
 var movementCount int
 if err=db.QueryRow(ctx,"SELECT count(*) FROM stock_movements WHERE variant_id=$1 AND movement_type IN ('PO_RECEIVE','QC_HOLD','QC_RELEASE')",p.VariantID).Scan(&movementCount);err!=nil||movementCount!=4{t.Fatalf("missing movement audit count=%d error=%v",movementCount,err)}
}
