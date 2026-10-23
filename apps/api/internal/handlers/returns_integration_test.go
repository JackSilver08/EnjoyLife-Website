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
func TestSprint11ReturnsIntegration(t *testing.T){
 url:=os.Getenv("INTEGRATION_DATABASE_URL")
 if url==""{t.Skip("requires isolated PostgreSQL")}
 t.Setenv("GIN_MODE","debug");t.Setenv("APP_ENV","development");t.Setenv("ENABLE_DEV_ADMIN","true")
 ctx,cancel:=context.WithTimeout(context.Background(),65*time.Second);defer cancel()
 db,err:=pgxpool.New(ctx,url);if err!=nil{t.Fatal(err)};defer db.Close()
 for _,migration:=range []func(context.Context,*pgxpool.Pool)error{
  EnsurePaymentSchema,EnsureAccountSchema,EnsureAdminAudit,EnsureProductCatalogSchema,EnsureWarehouseSchema,EnsureReturnsSchema,
 }{if err=migration(ctx,db);err!=nil{t.Fatal(err)}}
 router:=Router(&App{DB:db,Config:config.Config{}})
 send:=func(method,path string,body any,cookie *http.Cookie)*httptest.ResponseRecorder{
  t.Helper();data,_:=json.Marshal(body)
  request:=httptest.NewRequest(method,path,bytes.NewReader(data))
  request.Header.Set("Content-Type","application/json")
  if cookie!=nil{request.AddCookie(cookie)}
  recorder:=httptest.NewRecorder();router.ServeHTTP(recorder,request);return recorder
 }
 login:=send("POST","/api/v1/auth/admin-demo",map[string]any{"username":"admin","password":"admin"},nil)
 if login.Code!=200{t.Fatalf("admin login %d %s",login.Code,login.Body)}
 var cookie *http.Cookie
 for _,c:=range login.Result().Cookies(){if c.Name==sessionCookie{cookie=c}}
 if cookie==nil{t.Fatal("no admin cookie")}
 post:=func(method,path string,body any)*httptest.ResponseRecorder{return send(method,path,body,cookie)}
 fixture:=fmt.Sprintf("rma-%d",time.Now().UnixNano())
 product:=post("POST","/api/v1/admin/products",map[string]any{
  "name":"Sprint11 ladies dress","slug":fixture,"category":"ao",
  "color":"Trắng","size":"M","price_vnd":250000,"opening_stock":12,"published":true,
 })
 if product.Code!=201{t.Fatalf("product %d %s",product.Code,product.Body)}
 var p struct{Variant string `json:"variant_id"`}
 _=json.Unmarshal(product.Body.Bytes(),&p)
 if p.Variant==""{t.Fatal("missing product SKU")}
 stock:=func()(int,int,int){
  t.Helper();var onHand,reserved,quarantine int
  if e:=db.QueryRow(ctx,`SELECT on_hand,reserved,unavailable FROM inventory WHERE variant_id::text=$1`,p.Variant).
   Scan(&onHand,&reserved,&quarantine);e!=nil{t.Fatal(e)}
  return onHand,reserved,quarantine
 }
 counter:=0
 createOrder:=func(qty int)string{
  counter++
  created:=send("POST","/api/v1/orders",map[string]any{
   "client_order_key":fmt.Sprintf("return-ci-%d-%d",time.Now().UnixNano(),counter),
   "customer_name":"Returns CI Shopper","customer_phone":"0901234567",
   "shipping_address":"CI Test Street 1, Vietnam","payment_method":"COD",
   "items":[]map[string]any{{"variant_id":p.Variant,"quantity":qty}},
  },nil)
  if created.Code!=201{t.Fatalf("order %d %s",created.Code,created.Body)}
  var payload struct{Number string `json:"order_no"`}
  _=json.Unmarshal(created.Body.Bytes(),&payload)
  if payload.Number==""{t.Fatalf("no order_no: %s",created.Body)}
  return payload.Number
 }
 advance:=func(no,status string){
  rec:=post("PATCH","/api/v1/admin/orders/"+no+"/status",map[string]any{"status":status})
  if rec.Code!=200{t.Fatalf("%s -> %s: %d %s",no,status,rec.Code,rec.Body)}
 }
 first:=createOrder(3)
 for _,next:=range []string{"CONFIRMED","PREPARING","SHIPPING","DELIVERED","COMPLETED"}{advance(first,next)}
 if rec:=post("POST","/api/v1/admin/orders/"+first+"/paid",nil);rec.Code!=200{t.Fatalf("COD paid %d %s",rec.Code,rec.Body)}
 hand,reserved,hold:=stock()
 if hand!=9||reserved!=0||hold!=0{t.Fatalf("shipped stock mismatch %d/%d/%d",hand,reserved,hold)}
 lookup:=post("GET","/api/v1/admin/orders/"+first+"/returnable",nil)
 if lookup.Code!=200{t.Fatalf("returnable %d %s",lookup.Code,lookup.Body)}
 var sale struct{Items []struct{ID int64 `json:"order_item_id"`;Returnable int `json:"returnable"`} `json:"items"`}
 _=json.Unmarshal(lookup.Body.Bytes(),&sale)
 if len(sale.Items)!=1||sale.Items[0].Returnable!=3{t.Fatalf("bad sale snapshot: %s",lookup.Body)}
 itemID:=sale.Items[0].ID
 request:=map[string]any{"order_no":first,"kind":"CUSTOMER_RETURN","reason":"Size too small at fitting",
  "items":[]map[string]any{{"order_item_id":itemID,"quantity":2}}}
 if response:=send("POST","/api/v1/admin/returns",request,nil);response.Code!=401{t.Fatalf("public RMA mutation permitted %d",response.Code)}
 newReturn:=post("POST","/api/v1/admin/returns",request)
 if newReturn.Code!=201{t.Fatalf("create RMA %d %s",newReturn.Code,newReturn.Body)}
 var rma struct{ID string `json:"id"`;Number string `json:"rma_no"`;Refund int64 `json:"refund_amount_vnd"`}
 _=json.Unmarshal(newReturn.Body.Bytes(),&rma)
 if rma.ID==""||!strings.HasPrefix(rma.Number,"RMA-")||rma.Refund!=500000{t.Fatalf("incorrect refund snapshot: %s",newReturn.Body)}
 if rec:=post("POST","/api/v1/admin/returns",request);rec.Code!=409{t.Fatalf("duplicate/over return request accepted %d",rec.Code)}
 if h,_,_:=stock();h!=9{t.Fatalf("creating RMA changed stock: %d",h)}
 if rec:=post("POST","/api/v1/admin/returns/"+rma.ID+"/receive",map[string]any{"request_key":"too-early","lines":[]any{} });rec.Code!=400&&rec.Code!=409{t.Fatalf("unapproved return received %d",rec.Code)}
 decision:=post("POST","/api/v1/admin/returns/"+rma.ID+"/decision",map[string]any{"action":"APPROVE","note":"Accepted after inspection"})
 if decision.Code!=200{t.Fatalf("approve %d %s",decision.Code,decision.Body)}
 if rec:=post("POST","/api/v1/admin/returns/"+rma.ID+"/decision",map[string]any{"action":"APPROVE","note":"Double approval"});rec.Code!=409{t.Fatalf("duplicate approval accepted %d",rec.Code)}
 detail:=post("GET","/api/v1/admin/returns/"+rma.ID,nil)
 if detail.Code!=200{t.Fatalf("RMA detail %d %s",detail.Code,detail.Body)}
 var d struct{Items []struct{ID string `json:"id"`} `json:"items"`}
 _=json.Unmarshal(detail.Body.Bytes(),&d)
 if len(d.Items)!=1{t.Fatalf("RMA items missing: %s",detail.Body)}
 receive:=map[string]any{"request_key":"receive-sprint11-one","note":"Checked seam; one defect",
  "lines":[]map[string]any{{"item_id":d.Items[0].ID,"good":1,"quarantined":1}}}
 receipt:=post("POST","/api/v1/admin/returns/"+rma.ID+"/receive",receive)
 if receipt.Code!=201{t.Fatalf("receive %d %s",receipt.Code,receipt.Body)}
 repeat:=post("POST","/api/v1/admin/returns/"+rma.ID+"/receive",receive)
 if repeat.Code!=200||!bytes.Contains(repeat.Body.Bytes(),[]byte("true")){t.Fatalf("duplicate receipt: %d %s",repeat.Code,repeat.Body)}
 hand,reserved,hold=stock()
 if hand!=11||reserved!=0||hold!=1{t.Fatalf("return receipt double-credit or bad QC: %d/%d/%d",hand,reserved,hold)}
 if rec:=post("POST","/api/v1/admin/returns/"+rma.ID+"/refund",map[string]any{"reference":"ci-refund-wrong","amount_vnd":250000});rec.Code!=409{t.Fatalf("incorrect refund value accepted %d",rec.Code)}
 refund:=post("POST","/api/v1/admin/returns/"+rma.ID+"/refund",map[string]any{"reference":"ci-refund-"+fixture,"amount_vnd":500000})
 if refund.Code!=200{t.Fatalf("refund record %d %s",refund.Code,refund.Body)}
 if rec:=post("POST","/api/v1/admin/returns/"+rma.ID+"/refund",map[string]any{"reference":"ci-refund-"+fixture,"amount_vnd":500000});rec.Code!=409{t.Fatalf("second refund accepted %d",rec.Code)}
 var payment string
 if e:=db.QueryRow(ctx,`SELECT payment_status FROM orders WHERE order_no=$1`,first).Scan(&payment);e!=nil||payment!="PAID"{t.Fatalf("RMA overwrote original payment status %q %v",payment,e)}
 var shipped,returned int
 if e:=db.QueryRow(ctx,`SELECT count(*) FILTER(WHERE movement_type='SHIP'),
 count(*) FILTER(WHERE movement_type IN ('RETURN_GOOD','RETURN_QC_HOLD'))
 FROM stock_movements WHERE order_id=(SELECT id FROM orders WHERE order_no=$1)`,first).Scan(&shipped,&returned);e!=nil||shipped!=1||returned!=2{t.Fatalf("return movements %d %d %v",shipped,returned,e)}
 // Delivery failure: never restore a shipping reservation; physical return
 // restores units, with quarantined pieces excluded from sellable stock.
 second:=createOrder(2)
 for _,next:=range []string{"CONFIRMED","PREPARING","SHIPPING"}{advance(second,next)}
 sale2:=post("GET","/api/v1/admin/orders/"+second+"/returnable",nil)
 _=json.Unmarshal(sale2.Body.Bytes(),&sale);item2:=sale.Items[0].ID
 failReq:=map[string]any{"order_no":second,"kind":"DELIVERY_FAILED","reason":"Customer unreachable at delivery",
  "items":[]map[string]any{{"order_item_id":item2,"quantity":2}}}
 failed:=post("POST","/api/v1/admin/returns",failReq)
 if failed.Code!=201{t.Fatalf("create delivery fail %d %s",failed.Code,failed.Body)}
 var failRMA struct{ID string `json:"id"`}
 _=json.Unmarshal(failed.Body.Bytes(),&failRMA)
 if rec:=post("PATCH","/api/v1/admin/orders/"+second+"/status",map[string]any{"status":"DELIVERED"});rec.Code!=409{t.Fatalf("marked delivered while return pending: %d",rec.Code)}
 if rec:=post("POST","/api/v1/admin/returns/"+failRMA.ID+"/decision",map[string]any{"action":"APPROVE","note":"Carrier confirmed failed delivery"});rec.Code!=200{t.Fatalf("approve delivery fail %d",rec.Code)}
 desc:=post("GET","/api/v1/admin/returns/"+failRMA.ID,nil)
 _=json.Unmarshal(desc.Body.Bytes(),&d)
 receipt2:=post("POST","/api/v1/admin/returns/"+failRMA.ID+"/receive",map[string]any{
  "request_key":"receive-sprint11-failed","note":"Package arrived from carrier",
  "lines":[]map[string]any{{"item_id":d.Items[0].ID,"good":2,"quarantined":0}},
 })
 if receipt2.Code!=201||!bytes.Contains(receipt2.Body.Bytes(),[]byte("CLOSED")){t.Fatalf("failed-delivery receipt %d %s",receipt2.Code,receipt2.Body)}
 var state string
 if e:=db.QueryRow(ctx,`SELECT status FROM orders WHERE order_no=$1`,second).Scan(&state);e!=nil||state!="RETURNED"{t.Fatalf("delivery return status %s %v",state,e)}
 hand,reserved,hold=stock()
 if hand!=11||reserved!=0||hold!=1{t.Fatalf("failed delivery stock discrepancy %d/%d/%d",hand,reserved,hold)}
}
