package payment

import (
 "bytes"
 "context"
 "crypto/hmac"
 "crypto/sha256"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "io"
 "net/http"
 "net/url"
 "sort"
 "strconv"
 "strings"
 "time"
)

const OfficialAPI="https://api-merchant.payos.vn"

type PayOS struct{ClientID,APIKey,ChecksumKey,BaseURL string; HTTP *http.Client}
type Link struct{OrderCode int64 `json:"orderCode"`;Amount int64 `json:"amount"`;Status string `json:"status"`;CheckoutURL string `json:"checkoutUrl"`;QR string `json:"qrCode"`;PaymentLinkID string `json:"paymentLinkId"`}
type Status struct{OrderCode int64 `json:"orderCode"`;Amount int64 `json:"amount"`;AmountPaid int64 `json:"amountPaid"`;Status string `json:"status"`}
type Notice struct{Code string `json:"code"`;Success bool `json:"success"`;Data struct{OrderCode int64 `json:"orderCode"`;Amount int64 `json:"amount"`;Currency string `json:"currency"`;Code string `json:"code"`;Reference string `json:"reference"`;PaymentLinkID string `json:"paymentLinkId"`} `json:"data"`;Signature string `json:"signature"`;rawData map[string]any}

func sign(key,payload string)string{m:=hmac.New(sha256.New,[]byte(key));m.Write([]byte(payload));return hex.EncodeToString(m.Sum(nil))}
func SignCreate(key string,orderCode,amount int64,description,returnURL,cancelURL string)string{
 raw:=fmt.Sprintf("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",amount,cancelURL,description,orderCode,returnURL)
 return sign(key,raw)
}
func canonical(data map[string]any)(string,error){
 keys:=make([]string,0,len(data));for k:=range data{keys=append(keys,k)};sort.Strings(keys)
 parts:=make([]string,0,len(keys))
 for _,k:=range keys {
  v:=data[k];var value string
  switch x:=v.(type){
  case nil:value=""
  case string:if x=="undefined"||x=="null"{value=""}else{value=x}
  case json.Number:value=string(x)
  case bool:value=strconv.FormatBool(x)
  case float64:value=strconv.FormatFloat(x,'f',-1,64)
  case []any:
   for _,item:=range x{if _,ok:=item.(map[string]any);!ok{return "",errors.New("unsupported array element")}}
   b,err:=json.Marshal(x);if err!=nil{return "",err};value=string(b)
  default:return "",errors.New("unsupported signed field type")
  }
  parts=append(parts,k+"="+value)
 }
 return strings.Join(parts,"&"),nil
}
func VerifyWebhook(body []byte,checksumKey string)(Notice,error){
 var envelope struct{Code string `json:"code"`;Success bool `json:"success"`;Data json.RawMessage `json:"data"`;Signature string `json:"signature"`}
 if len(body)==0||len(body)>32768||json.Unmarshal(body,&envelope)!=nil{return Notice{},errors.New("invalid webhook body")}
 var raw map[string]any
 dec:=json.NewDecoder(bytes.NewReader(envelope.Data));dec.UseNumber()
 if err:=dec.Decode(&raw);err!=nil||len(raw)==0{return Notice{},errors.New("invalid webhook data")}
 payload,err:=canonical(raw);if err!=nil{return Notice{},err}
 sig,err:=hex.DecodeString(envelope.Signature)
 if err!=nil||len(sig)!=32||!hmac.Equal(sig,mustMac(checksumKey,payload)){return Notice{},errors.New("invalid webhook signature")}
 var n Notice
 if err=json.Unmarshal(body,&n);err!=nil{return Notice{},err}
 n.rawData=raw
 return n,nil
}
func mustMac(key,msg string)[]byte{m:=hmac.New(sha256.New,[]byte(key));m.Write([]byte(msg));return m.Sum(nil)}
func (p PayOS) call(ctx context.Context,method,path string,body any,dst any)error{
 if p.ClientID==""||p.APIKey==""||p.ChecksumKey==""{return errors.New("payOS credentials not configured")}
 base:=p.BaseURL;if base==""{base=OfficialAPI}
 var content io.Reader
 if body!=nil{b,err:=json.Marshal(body);if err!=nil{return err};content=bytes.NewReader(b)}
 req,err:=http.NewRequestWithContext(ctx,method,base+path,content);if err!=nil{return err}
 req.Header.Set("x-client-id",p.ClientID);req.Header.Set("x-api-key",p.APIKey);req.Header.Set("Content-Type","application/json")
 client:=p.HTTP;if client==nil{client=&http.Client{Timeout:8*time.Second}}
 resp,err:=client.Do(req);if err!=nil{return err};defer resp.Body.Close()
 if resp.StatusCode!=200{return fmt.Errorf("payOS HTTP %d",resp.StatusCode)}
 limited,err:=io.ReadAll(io.LimitReader(resp.Body,65537));if err!=nil||len(limited)>65536{return errors.New("invalid payOS response")}
 var result struct{Code string `json:"code"`;Desc string `json:"desc"`;Data json.RawMessage `json:"data"`}
 if json.Unmarshal(limited,&result)!=nil||result.Code!="00"||len(result.Data)==0{return fmt.Errorf("payOS rejected payment request: code=%s desc=%s",result.Code,result.Desc)}
 return json.Unmarshal(result.Data,dst)
}
func (p PayOS) Create(ctx context.Context,code,amount int64,returnURL,cancelURL string)(Link,error){
 var out Link
 if code<1||amount<1000{return out,errors.New("invalid payOS amount or code")}
 desc:="EL"+strconv.FormatInt(code,10)
 if len(desc)>9 {desc="EL"+strconv.FormatInt(code%10000000,10)} // description limited by bank, orderCode still unique
 body:=map[string]any{"orderCode":code,"amount":amount,"description":desc,"returnUrl":returnURL,"cancelUrl":cancelURL,
 "signature":SignCreate(p.ChecksumKey,code,amount,desc,returnURL,cancelURL),"expiredAt":time.Now().Add(15*time.Minute).Unix()}
 if err:=p.call(ctx,"POST","/v2/payment-requests",body,&out);err!=nil{return out,err}
 if out.OrderCode!=code||out.Amount!=amount||out.CheckoutURL==""{return Link{},errors.New("payOS response does not match order")}
 u,err:=url.Parse(out.CheckoutURL);if err!=nil||u.Scheme!="https"||u.Host!="pay.payos.vn"{return Link{},errors.New("unsafe payOS payment URL")}
 return out,nil
}
func (p PayOS) Cancel(ctx context.Context,code int64)(Status,error){
 var out Status
 err:=p.call(ctx,"POST","/v2/payment-requests/"+strconv.FormatInt(code,10)+"/cancel",map[string]string{"cancellationReason":"Customer requested cancellation"},&out)
 if err!=nil{return out,err}
 if out.OrderCode!=code||out.Status!="CANCELLED"||out.AmountPaid>0{return Status{},errors.New("payOS did not confirm cancellation")}
 return out,nil
}
func (p PayOS) Get(ctx context.Context,code int64)(Status,error){
 var out Status
 err:=p.call(ctx,"GET","/v2/payment-requests/"+strconv.FormatInt(code,10),nil,&out)
 if err!=nil{return out,err}
 if out.OrderCode!=code{return Status{},errors.New("payment code mismatch")}
 return out,nil
}
