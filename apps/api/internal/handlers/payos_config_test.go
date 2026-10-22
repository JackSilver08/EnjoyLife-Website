package handlers

import (
 "testing"

 "github.com/enjoy-life/store-api/internal/config"
)

func TestPayOSConfigurationStatus(t *testing.T) {
 ready := config.Config{
  PaymentEnabled:true,
  PayOSClientID:"ci-client",
  PayOSAPIKey:"ci-api-key",
  PayOSChecksumKey:"ci-checksum",
  WebOrigin:"http://localhost:3000",
 }
 cases:=[]struct{
  name string
  cfg config.Config
  want string
 }{
  {"disabled by default",config.Config{},"disabled"},
  {"missing merchant credentials",config.Config{PaymentEnabled:true,WebOrigin:"http://localhost:3000"},"missing_configuration"},
  {"enabled localhost",ready,"enabled"},
  {"enabled production https",func()config.Config{c:=ready;c.WebOrigin="https://store.example.com";return c}(),"enabled"},
  {"invalid public http",func()config.Config{c:=ready;c.WebOrigin="http://store.example.com";return c}(),"invalid_origin"},
  {"invalid remote http",func()config.Config{c:=ready;c.WebOrigin="http://192.168.1.20:3000";return c}(),"invalid_origin"},
  {"invalid origin credentials",func()config.Config{c:=ready;c.WebOrigin="https://alice:password@store.example.com";return c}(),"invalid_origin"},
  {"invalid origin path",func()config.Config{c:=ready;c.WebOrigin="https://store.example.com/checkout";return c}(),"invalid_origin"},
  {"missing origin",func()config.Config{c:=ready;c.WebOrigin="";return c}(),"invalid_origin"},
 }
 for _,tt:=range cases {
  t.Run(tt.name,func(t *testing.T){
   app:=App{Config:tt.cfg}
   got:=app.payOSConfigStatus()
   if got!=tt.want{t.Fatalf("got %s, want %s",got,tt.want)}
   if app.payOSReady()!=(tt.want=="enabled"){t.Fatal("readiness disagrees with diagnostic status")}
  })
 }
}
