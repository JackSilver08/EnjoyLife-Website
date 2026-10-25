package handlers

import (
 "context"
 "io"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
)

func TestCloudMediaUploadAndCleanup(t *testing.T){
 seen:=false
 server:=httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  if !strings.Contains(r.URL.Path,"/enjoylife-media/"){t.Errorf("unexpected path: %s",r.URL.Path)}
  if r.Method!=http.MethodHead && r.Header.Get("apikey")!="secret"{t.Error("missing API key")}
  switch r.Method{
  case http.MethodPost:
   b,_:=io.ReadAll(r.Body)
   if string(b)!="image-data"||r.Header.Get("x-upsert")!="false"{t.Error("invalid upload")}
   seen=true;w.WriteHeader(201)
  case http.MethodHead:
   if seen{w.WriteHeader(200)}else{w.WriteHeader(404)}
  case http.MethodDelete:
   seen=false;w.WriteHeader(200)
  default:w.WriteHeader(405)
  }
 }))
 defer server.Close()
 store:=&cloudMediaStore{base:server.URL,key:"secret",client:server.Client()}
 name:="12345678-1234-4234-8234-123456789abc.jpg"
 exists,err:=store.exists(context.Background(),name)
 if err!=nil||exists{t.Fatal("expected missing image",err)}
 u,undo,err:=persistManagedMedia(context.Background(),store,name,[]byte("image-data"),"image/jpeg")
 if err!=nil||u!=store.publicURL(name){t.Fatal("upload failed",err)}
 exists,err=store.exists(context.Background(),name)
 if err!=nil||!exists{t.Fatal("expected saved image",err)}
 undo()
 exists,err=store.exists(context.Background(),name)
 if err!=nil||exists{t.Fatal("cleanup failed",err)}
}

func TestManagedCloudImageURL(t *testing.T){
 name:="12345678-1234-4234-8234-123456789abc.jpg"
 good:="https://lxqtkecmaspoikobgkjg.supabase.co/storage/v1/object/public/enjoylife-media/"+name
 if !validCloudMediaURL(good){t.Fatal("must allow own bucket")}
 for _,s:=range []string{
 "http://lxqtkecmaspoikobgkjg.supabase.co/storage/v1/object/public/enjoylife-media/"+name,
 "https://evil.example/storage/v1/object/public/enjoylife-media/"+name,
 "https://lxqtkecmaspoikobgkjg.supabase.co/storage/v1/object/public/private/"+name,
 "https://lxqtkecmaspoikobgkjg.supabase.co/storage/v1/object/public/enjoylife-media/a.svg",
 }{if validCloudMediaURL(s){t.Fatalf("unsafe URL accepted: %s",s)}}
}
