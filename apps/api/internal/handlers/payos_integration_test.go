package handlers

import (
 "bytes"
 "context"
 "crypto/hmac"
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "fmt"
 "net/http"
 "net/http/httptest"
 "os"
 "strings"
 "sync"
 "testing"
 "time"

 "github.com/enjoy-life/store-api/internal/config"
 "github.com/enjoy-life/store-api/internal/payment"
 "github.com/jackc/pgx/v5/pgxpool"
)

func TestPayOSIntegration(t *testing.T){
 dbURL:=os.Getenv("INTEGRATION_DATABASE_URL")
 if dbURL==""{t.Skip("Requires disposable PostgreSQL")}
 t.Setenv("GIN_MODE","debug")
 t.Setenv("APP_ENV","development")
 t.Setenv("ENABLE_DEV_ADMIN","true")
 ctx,cancel:=context.WithTimeout(context.Background(),30*time.Second);defer cancel()
 db,err:=pgxpool.New(ctx,dbURL);if err!=nil{t.Fatal(err)};defer db.Close()
 if err=EnsurePaymentSchema(ctx,db);err!=nil{t.Fatal(err)}
 if err=EnsureAccountSchema(ctx,db);err!=nil{t.Fatal(err)}
 var mu sync.Mutex
 amounts:=map[int64]int64{}
 statuses:=map[int64]string{}
 mock:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Content-Type","application/json")
  var code,amount int64
  if r.Method=="POST"&&r.URL.Path=="/v2/payment-requests" {
   var body struct{OrderCode int64 `json:"orderCode"`;Amount int64 `json:"amount"`;Description string `json:"description"`;ReturnURL string `json:"returnUrl"`;CancelURL string `json:"cancelUrl"`;Signature string `json:"signature"`}
   if json.NewDecoder(r.Body).Decode(&body)!=nil {w.WriteHeader(400);return}
   expected:=payment.SignCreate("fake-checksum",body.OrderCode,body.Amount,body.Description,body.ReturnURL,body.CancelURL)
   if body.Signature!=expected||r.Header.Get("x-client-id")!="fake-client"{w.WriteHeader(401);return}
   mu.Lock();amounts[body.OrderCode]=body.Amount;statuses[body.OrderCode]="PENDING";mu.Unlock()
   _=json.NewEncoder(w).Encode(map[string]any{"code":"00","data":map[string]any{"orderCode":body.OrderCode,"amount":body.Amount,"checkoutUrl":fmt.Sprintf("https://pay.payos.vn/web/link-%d",body.OrderCode),"paymentLinkId":fmt.Sprintf("link-%d",body.OrderCode),"qrCode":"000201010212","status":"PENDING"}})
   return
  }
  _,_ =fmt.Sscanf(r.URL.Path,"/v2/payment-requests/%d",&code)
  mu.Lock();amount=amounts[code];state:=statuses[code]
  if strings.HasSuffix(r.URL.Path,"/cancel"){statuses[code]="CANCELLED";state="CANCELLED"}
  mu.Unlock()
  if amount==0 {w.WriteHeader(404);return}
  paid:=int64(0);if state=="PAID"{paid=amount}
  _=json.NewEncoder(w).Encode(map[string]any{"code":"00","data":map[string]any{"orderCode":code,"amount":amount,"amountPaid":paid,"status":state}})
 }))
 defer mock.Close()
 app:=&App{DB:db,Config:config.Config{PaymentEnabled:true,PayOSClientID:"fake-client",PayOSAPIKey:"fake-api-key",PayOSChecksumKey:"fake-checksum",PayOSBaseURL:mock.URL,WebOrigin:"http://localhost:3000"}}
 router:=Router(app)
 send:=func(method,path string,body any)*httptest.ResponseRecorder{
  t.Helper();b,_:=json.Marshal(body)
  rec:=httptest.NewRecorder();req:=httptest.NewRequest(method,path,bytes.NewReader(b))
  req.Header.Set("Content-Type","application/json");router.ServeHTTP(rec,req);return rec
 }
 newOrder:=func()*httptest.ResponseRecorder{
  key,_:=randomHex(16)
  return send("POST","/api/v1/orders",map[string]any{
   "client_order_key":"payos-"+key,"customer_name":"PayOS Test","customer_phone":"0901234567",
   "shipping_address":"Address for disposable CI database","payment_method":"PAYOS",
   "items":[]map[string]any{{"variant_id":"30000000-0000-4000-8000-000000000001","quantity":1}},
  })
 }
 adminLogin:=send("POST","/api/v1/auth/admin-demo",map[string]any{"username":"admin","password":"admin"})
 if adminLogin.Code!=200{t.Fatalf("test admin login: %d %s",adminLogin.Code,adminLogin.Body.String())}
 var adminCookie *http.Cookie
 for _,cookie:=range adminLogin.Result().Cookies(){if cookie.Name==sessionCookie{adminCookie=cookie}}
 if adminCookie==nil{t.Fatal("missing admin session")}
 asAdmin:=func(method,path string,body any)*httptest.ResponseRecorder{
  b,_:=json.Marshal(body);req:=httptest.NewRequest(method,path,bytes.NewReader(b));req.Header.Set("Content-Type","application/json");req.AddCookie(adminCookie)
  rec:=httptest.NewRecorder();router.ServeHTTP(rec,req);return rec
 }
 created:=newOrder()
 if created.Code!=201{t.Fatalf("create PayOS order: %d %s",created.Code,created.Body.String())}
 var order struct{Token string `json:"order_token"`;Total int64 `json:"total_vnd"`;OrderNo string `json:"order_no"`}
 if err=json.Unmarshal(created.Body.Bytes(),&order);err!=nil{t.Fatal(err)}
 if order.Total!=329000||len(order.Token)!=48{t.Fatalf("amount must come from DB: %s",created.Body.String())}
 blocked:=asAdmin("PATCH","/api/v1/admin/orders/"+order.OrderNo+"/status",map[string]string{"status":"CONFIRMED"})
 if blocked.Code!=409{t.Fatalf("unpaid payOS order advanced by Admin: %d %s",blocked.Code,blocked.Body.String())}
 link:=send("POST","/api/v1/orders/"+order.Token+"/payment-link",nil)
 if link.Code!=200{t.Fatalf("create checkout: %d %s",link.Code,link.Body.String())}
 var checkout struct{Code int64 `json:"order_code"`;URL string `json:"checkout_url"`;QR string `json:"qr_code"`}
 if err=json.Unmarshal(link.Body.Bytes(),&checkout);err!=nil{t.Fatal(err)}
 if checkout.Code==0||checkout.QR==""||!strings.HasPrefix(checkout.URL,"https://pay.payos.vn/"){t.Fatalf("invalid QR: %s",link.Body.String())}
 second:=send("POST","/api/v1/orders/"+order.Token+"/payment-link",nil)
 if second.Code!=200||second.Body.String()!=link.Body.String(){t.Fatalf("retry created a different link: %d %s",second.Code,second.Body.String())}
 redirect:=send("GET","/api/v1/orders/"+order.Token+"?status=PAID",nil)
 if !bytes.Contains(redirect.Body.Bytes(),[]byte(`"payment_status":"UNPAID"`)){t.Fatal("browser return spoofed payment success")}
 data:=map[string]any{"orderCode":checkout.Code,"amount":order.Total,"currency":"VND","code":"00","paymentLinkId":fmt.Sprintf("link-%d",checkout.Code),"reference":"ci-test-transfer"}
 stringToSign:=fmt.Sprintf("amount=%d&code=00&currency=VND&orderCode=%d&paymentLinkId=link-%d&reference=ci-test-transfer",order.Total,checkout.Code,checkout.Code)
 m:=hmac.New(sha256.New,[]byte("fake-checksum"));m.Write([]byte(stringToSign))
 signature:=hex.EncodeToString(m.Sum(nil))
 invalid:=send("POST","/api/v1/payments/payos/webhook",map[string]any{"code":"00","success":true,"data":data,"signature":"bad"})
 if invalid.Code!=400{t.Fatalf("unsigned webhook accepted: %d",invalid.Code)}
 tampered:=map[string]any{};for k,v:=range data{tampered[k]=v};tampered["amount"]=order.Total+1
 if rec:=send("POST","/api/v1/payments/payos/webhook",map[string]any{"code":"00","success":true,"data":tampered,"signature":signature});rec.Code!=400{t.Fatalf("tampered amount accepted: %d",rec.Code)}
 webhook:=map[string]any{"code":"00","success":true,"data":data,"signature":signature}
 for i:=0;i<2;i++{if rec:=send("POST","/api/v1/payments/payos/webhook",webhook);rec.Code!=200{t.Fatalf("webhook %d: %d %s",i,rec.Code,rec.Body.String())}}
 verified:=send("GET","/api/v1/orders/"+order.Token,nil)
 if !bytes.Contains(verified.Body.Bytes(),[]byte(`"payment_status":"PAID"`)){t.Fatal("valid signed event did not mark paid")}
 confirmed:=asAdmin("PATCH","/api/v1/admin/orders/"+order.OrderNo+"/status",map[string]string{"status":"CONFIRMED"})
 if confirmed.Code!=200{t.Fatalf("verified paid order cannot advance: %d %s",confirmed.Code,confirmed.Body.String())}
 var count int
 if err=db.QueryRow(ctx,`SELECT count(*) FROM payment_events WHERE provider='PAYOS' AND external_event_key=$1`,fmt.Sprintf("PAYOS:%d:ci-test-transfer",checkout.Code)).Scan(&count);err!=nil||count!=1{t.Fatalf("duplicate webhook replay count=%d error=%v",count,err)}
 canceled:=newOrder()
 if canceled.Code!=201{t.Fatalf("second order: %d %s",canceled.Code,canceled.Body.String())}
 var next struct{Token string `json:"order_token"`}
 _=json.Unmarshal(canceled.Body.Bytes(),&next)
 if rec:=send("POST","/api/v1/orders/"+next.Token+"/payment-link",nil);rec.Code!=200{t.Fatalf("second checkout: %s",rec.Body.String())}
 var reservedBefore,reservedAfter int
 if err=db.QueryRow(ctx,`SELECT reserved FROM inventory WHERE variant_id=$1`,"30000000-0000-4000-8000-000000000001").Scan(&reservedBefore);err!=nil{t.Fatal(err)}
 if rec:=send("POST","/api/v1/orders/"+next.Token+"/cancel-payment",nil);rec.Code!=200{t.Fatalf("safe cancellation: %d %s",rec.Code,rec.Body.String())}
 if err=db.QueryRow(ctx,`SELECT reserved FROM inventory WHERE variant_id=$1`,"30000000-0000-4000-8000-000000000001").Scan(&reservedAfter);err!=nil{t.Fatal(err)}
 if reservedAfter!=reservedBefore-1{t.Fatalf("canceled order did not release reserved unit: before=%d after=%d",reservedBefore,reservedAfter)}
 if rec:=send("POST","/api/v1/orders/"+next.Token+"/payment-link",nil);rec.Code!=409{t.Fatalf("canceled order can still create checkout: %d",rec.Code)}
 var state string
 if err=db.QueryRow(ctx,"SELECT status FROM orders WHERE public_token=$1",next.Token).Scan(&state);err!=nil||state!="CANCELLED"{t.Fatalf("cancel did not release order state: %s %v",state,err)}
 // CI should never use real merchant credentials or touch a real bank account.
}
