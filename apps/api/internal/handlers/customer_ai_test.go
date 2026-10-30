package handlers

import (
 "bytes"
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "strings"
 "sync/atomic"
 "testing"

 "github.com/enjoy-life/store-api/internal/config"
)

func TestCustomerAIResponsesAndDiagnostics(t *testing.T){
 var rounds atomic.Int32
 var scopeChecks atomic.Int32
 mock:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if r.URL.Path!="/v1/responses"||r.Method!="POST"||r.Header.Get("Authorization")!="Bearer fake-test-api-key"{
   t.Errorf("unexpected request path/auth/method");w.WriteHeader(400);return
  }
  var body map[string]any
  if err:=json.NewDecoder(r.Body).Decode(&body);err!=nil{t.Error(err);w.WriteHeader(400);return}
  if body["model"]!="gpt-4.1-mini"{t.Errorf("invalid model %v",body["model"])}
  if _,ok:=body["reasoning"];ok{t.Error("unsupported reasoning param for gpt-4.1-mini")}
  if body["store"]!=false{t.Error("store must be false")}
  if body["max_output_tokens"]==nil{t.Error("missing output cap")}
  w.Header().Set("Content-Type","application/json")
  if _,classifying:=body["text"];classifying{
   scopeChecks.Add(1)
   if _,hasTools:=body["tools"];hasTools{t.Error("classifier must not receive product tools")}
   _=json.NewEncoder(w).Encode(map[string]any{"status":"completed","output":[]any{
    map[string]any{"type":"message","content":[]any{map[string]any{"type":"output_text","text":`{"in_scope":true}`}}},
   }})
   return
  }
  for _,tool:=range body["tools"].([]any){
   if tool.(map[string]any)["strict"]!=false{t.Error("optional search fields require strict:false")}
  }
  if rounds.Add(1)==1{
   _=json.NewEncoder(w).Encode(map[string]any{"status":"completed","output":[]any{map[string]any{
    "type":"function_call","call_id":"call-policy-1","name":"get_store_policies","arguments":"{}",
   }}})
  }else{
   input:=body["input"].([]any)
   found:=false
   for _,entry:=range input {m,ok:=entry.(map[string]any);if ok&&m["type"]=="function_call_output"&&m["call_id"]=="call-policy-1"{found=true}}
   if !found{t.Error("model function output not replayed")}
   _=json.NewEncoder(w).Encode(map[string]any{"status":"completed","output":[]any{
    map[string]any{"type":"message","content":[]any{map[string]any{"type":"output_text","text":"Enjoy Life hỗ trợ COD và thanh toán payOS khi kênh bật."}}},
   }})
  }
 }))
 defer mock.Close()
 a:=&App{Config:config.Config{OpenAIAPIKey:"fake-test-api-key",OpenAIBaseURL:mock.URL}}
 r:=Router(a)
 get:=httptest.NewRequest(http.MethodGet,"/api/v1/ai/status",nil);getRec:=httptest.NewRecorder();r.ServeHTTP(getRec,get)
 if getRec.Code!=200||!bytes.Contains(getRec.Body.Bytes(),[]byte(`"model":"gpt-4.1-mini"`))||!bytes.Contains(getRec.Body.Bytes(),[]byte(`"configured":true`)){t.Fatalf("status endpoint: %d %s",getRec.Code,getRec.Body)}
 if strings.Contains(getRec.Body.String(),"fake-test-api-key"){t.Fatal("secret leaked in diagnostics")}
 request:=httptest.NewRequest(http.MethodPost,"/api/v1/ai/customer",strings.NewReader(`{"message":"Chính sách thanh toán thế nào?","history":[]}`))
 request.Header.Set("Content-Type","application/json")
 rec:=httptest.NewRecorder();r.ServeHTTP(rec,request)
 if rec.Code!=200||!strings.Contains(rec.Body.String(),"COD")||rounds.Load()!=2||scopeChecks.Load()!=1{
  t.Fatalf("Responses function roundtrip failed %d: %s (rounds %d)",rec.Code,rec.Body.String(),rounds.Load())
 }
}

func TestCustomerAIErrorMapping(t *testing.T){
 cases:=[]struct{status int;code,expectedCode string;expectedHTTP int}{
  {401,"invalid_api_key","credentials",503},
  {403,"insufficient_permissions","credentials",503},
  {404,"model_not_found","model_not_available",503},
  {400,"invalid_request_error","invalid_configuration",503},
  {429,"insufficient_quota","quota_exceeded",503},
  {429,"rate_limit_exceeded","rate_limited",429},
  {500,"server_error","upstream_unavailable",503},
 }
 for _,tc:=range cases{
  t.Run(tc.code,func(t *testing.T){
   srv:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
    w.Header().Set("Content-Type","application/json");w.WriteHeader(tc.status)
    _=json.NewEncoder(w).Encode(map[string]any{"error":map[string]any{"code":tc.code,"message":"PRIVATE_DIAGNOSTIC_NEVER_EXPOSE"}})
   }))
   defer srv.Close()
   app:=&App{Config:config.Config{OpenAIAPIKey:"fake-test-key",AIModel:"gpt-4.1-mini",OpenAIBaseURL:srv.URL}}
   api:=Router(app)
   req:=httptest.NewRequest("POST","/api/v1/ai/customer",strings.NewReader(`{"message":"Xin chào"}`));req.Header.Set("Content-Type","application/json")
   rec:=httptest.NewRecorder();api.ServeHTTP(rec,req)
   if rec.Code!=tc.expectedHTTP||!strings.Contains(rec.Body.String(),tc.expectedCode){
    t.Fatalf("code mapping %d %s",rec.Code,rec.Body.String())
   }
   if strings.Contains(rec.Body.String(),"PRIVATE_DIAGNOSTIC"){t.Fatal("upstream private error leaked")}
  })
 }
}

func TestCustomerAIMissingKeyAndValidation(t *testing.T){
 api:=Router(&App{Config:config.Config{}})
 get:=httptest.NewRecorder();api.ServeHTTP(get,httptest.NewRequest("GET","/api/v1/ai/status",nil))
 if get.Code!=200||!strings.Contains(get.Body.String(),`"configured":false`){t.Fatalf("status: %s",get.Body.String())}
 post:=httptest.NewRecorder();api.ServeHTTP(post,httptest.NewRequest("POST","/api/v1/ai/customer",strings.NewReader(`{"message":"hello"}`)))
 if post.Code!=503{t.Fatalf("missing key should be 503, got %d",post.Code)}
}
