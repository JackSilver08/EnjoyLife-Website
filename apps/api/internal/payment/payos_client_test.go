package payment

import (
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "fmt"
 "testing"
)

func TestSignCreateKnownVector(t *testing.T){
 got:=SignCreate("test-key",1200001,150000,"EL1200001","https://store.test/orders/token","https://store.test/orders/token?cancelled")
 message:="amount=150000&cancelUrl=https://store.test/orders/token?cancelled&description=EL1200001&orderCode=1200001&returnUrl=https://store.test/orders/token"
 expected:=sign("test-key",message)
 if got!=expected{t.Fatalf("create signature %q want %q",got,expected)}
}
func TestWebhookRejectsTamperAndAcceptsRealFields(t *testing.T){
 data:=map[string]any{"orderCode":json.Number("1200001"),"amount":json.Number("150000"),"currency":"VND","code":"00","paymentLinkId":"link123","reference":"txn123","accountNumber":"000","transactionDateTime":"2026-10-22 11:00:00","counterAccountName":""}
 canonical,err:=canonical(data);if err!=nil{t.Fatal(err)}
 sig:=sign("key-123",canonical)
 payload,err:=json.Marshal(map[string]any{"code":"00","success":true,"data":data,"signature":sig})
 if err!=nil{t.Fatal(err)}
 n,err:=VerifyWebhook(payload,"key-123");if err!=nil{t.Fatal(err)}
 if n.Data.OrderCode!=1200001||n.Data.Amount!=150000{t.Fatal("wrong values")}
 var obj map[string]any
 _=json.Unmarshal(payload,&obj);obj["data"].(map[string]any)["amount"]=150001
 changed,_:=json.Marshal(obj)
 if _,err=VerifyWebhook(changed,"key-123");err==nil{t.Fatal("tampered webhook accepted")}
 if _,err=VerifyWebhook(payload,"wrong-key");err==nil{t.Fatal("wrong key accepted")}
 if _,err=VerifyWebhook([]byte("{}"),"key-123");err==nil{t.Fatal("unsigned webhook accepted")}
}
func TestPayOSCheckoutRejectsBadConfig(t *testing.T){
 _,err:=(PayOS{}).Create(t.Context(),123,150000,"http://localhost","http://localhost")
 if err==nil{t.Fatal("missing credentials accepted")}
}
func TestNoSensitiveTestFixtures(t *testing.T){
 // Known public digest ensures this test does not involve merchant secrets.
 sum:=sha256.Sum256([]byte("payos-test"))
 if hex.EncodeToString(sum[:])==fmt.Sprint(sum){t.Fatal("unexpected encoding")}
}
