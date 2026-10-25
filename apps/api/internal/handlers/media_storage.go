package handlers

import (
 "bytes"
 "context"
 "errors"
 "fmt"
 "io"
 "net/http"
 "net/url"
 "os"
 "path/filepath"
 "regexp"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
)

const mediaBucket = "enjoylife-media"
const enjoyLifeSupabaseHost = "lxqtkecmaspoikobgkjg.supabase.co"

var cloudImageFile = regexp.MustCompile("^[A-Za-z0-9][A-Za-z0-9_-]{0,220}\\.(?i:jpg|jpeg|png|webp)$")

type cloudMediaStore struct {
 base string
 key string
 client *http.Client
}

func mediaCloudStoreFromEnv() (*cloudMediaStore,error) {
 base:=strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")),"/")
 key:=strings.TrimSpace(os.Getenv("SUPABASE_SECRET_KEY"))
 if key=="" {key=strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_ROLE_KEY"))}
 if base==""&&key=="" {return nil,nil}
 parsed,err:=url.Parse(base)
 if err!=nil||parsed.Scheme!="https"||parsed.User!=nil||parsed.Hostname()==""||
  parsed.RawQuery!=""||parsed.Fragment!=""||parsed.Path!=""||parsed.Port()!=""||
  !strings.HasSuffix(parsed.Hostname(),".supabase.co")||key=="" {
  return nil,errors.New("Supabase Storage configuration is incomplete or invalid")
 }
 return &cloudMediaStore{base:base,key:key,client:&http.Client{Timeout:30*time.Second}},nil
}

func mediaUploadBackend(c *gin.Context)(*cloudMediaStore,bool){
 store,err:=mediaCloudStoreFromEnv()
 if err!=nil {
  c.JSON(503,gin.H{"error":"Cấu hình Supabase Storage chưa hợp lệ; kiểm tra SUPABASE_URL và khóa bí mật trên API."})
  return nil,false
 }
 // Never store new production media on Render's ephemeral filesystem.
 if store==nil&&(strings.EqualFold(os.Getenv("APP_ENV"),"production")||
  strings.EqualFold(os.Getenv("RENDER"),"true")||os.Getenv("RENDER_SERVICE_ID")!="") {
  c.JSON(503,gin.H{"error":"Cần cấu hình Supabase Storage trên enjoylife-api trước khi tải ảnh lên."})
  return nil,false
 }
 return store,true
}

func (s *cloudMediaStore) objectURL(filename string) string {
 return s.base+"/storage/v1/object/"+mediaBucket+"/"+url.PathEscape(filename)
}
func (s *cloudMediaStore) publicURL(filename string) string {
 return s.base+"/storage/v1/object/public/"+mediaBucket+"/"+url.PathEscape(filename)
}
func cloudMediaURL(filename string)string{
 host:=enjoyLifeSupabaseHost
 if parsed,err:=url.Parse(os.Getenv("SUPABASE_URL"));err==nil&&parsed.Scheme=="https"&&
  strings.HasSuffix(parsed.Hostname(),".supabase.co"){host=parsed.Hostname()}
 return "https://"+host+"/storage/v1/object/public/"+mediaBucket+"/"+url.PathEscape(filename)
}

func validCloudMediaURL(value string)bool{
 u,err:=url.Parse(value)
 if err!=nil||u.Scheme!="https"||u.User!=nil||u.Port()!=""||u.RawQuery!=""||u.Fragment!="" {return false}
 host:=enjoyLifeSupabaseHost
 if configured,err:=url.Parse(os.Getenv("SUPABASE_URL"));err==nil&&configured.Scheme=="https"&&
  strings.HasSuffix(configured.Hostname(),".supabase.co"){host=configured.Hostname()}
 if u.Hostname()!=host{return false}
 prefix:="/storage/v1/object/public/"+mediaBucket+"/"
 return strings.HasPrefix(u.Path,prefix)&&cloudImageFile.MatchString(strings.TrimPrefix(u.Path,prefix))
}

func (s *cloudMediaStore) upload(ctx context.Context,filename,mime string,content []byte)error{
 req,err:=http.NewRequestWithContext(ctx,http.MethodPost,s.objectURL(filename),bytes.NewReader(content))
 if err!=nil{return err}
 req.Header.Set("apikey",s.key)
 req.Header.Set("Authorization","Bearer "+s.key)
 req.Header.Set("Content-Type",mime)
 req.Header.Set("x-upsert","false")
 resp,err:=s.client.Do(req)
 if err!=nil{return fmt.Errorf("storage upload request: %w",err)}
 defer resp.Body.Close()
 io.Copy(io.Discard,io.LimitReader(resp.Body,4096))
 if resp.StatusCode!=http.StatusOK&&resp.StatusCode!=http.StatusCreated {
  return fmt.Errorf("storage upload failed with HTTP %d",resp.StatusCode)
 }
 return nil
}
func (s *cloudMediaStore) remove(filename string) {
 ctx,cancel:=context.WithTimeout(context.Background(),8*time.Second);defer cancel()
 req,err:=http.NewRequestWithContext(ctx,http.MethodDelete,s.objectURL(filename),nil)
 if err!=nil{return}
 req.Header.Set("apikey",s.key)
 req.Header.Set("Authorization","Bearer "+s.key)
 resp,err:=s.client.Do(req)
 if err==nil {io.Copy(io.Discard,io.LimitReader(resp.Body,1024));resp.Body.Close()}
}
func (s *cloudMediaStore) exists(ctx context.Context,filename string)(bool,error){
 req,err:=http.NewRequestWithContext(ctx,http.MethodHead,s.publicURL(filename),nil)
 if err!=nil{return false,err}
 resp,err:=s.client.Do(req)
 if err!=nil{return false,err}
 resp.Body.Close()
 switch resp.StatusCode {
 case 200:return true,nil
 case 404:return false,nil
 default:return false,fmt.Errorf("storage lookup failed with HTTP %d",resp.StatusCode)
 }
}

func persistManagedMedia(ctx context.Context,store *cloudMediaStore,filename string,content []byte,mime string)(string,func(),error){
 if store!=nil {
  if err:=store.upload(ctx,filename,mime,content);err!=nil{return "",nil,err}
  return store.publicURL(filename),func(){store.remove(filename)},nil
 }
 dir:=mediaDir()
 if err:=os.MkdirAll(dir,0700);err!=nil{return "",nil,err}
 temp,err:=os.CreateTemp(dir,".upload-*")
 if err!=nil{return "",nil,err}
 tmp:=temp.Name()
 defer os.Remove(tmp)
 if _,err=temp.Write(content);err!=nil{temp.Close();return "",nil,err}
 if err=temp.Close();err!=nil{return "",nil,err}
 dest:=filepath.Join(dir,filename)
 if err=os.Rename(tmp,dest);err!=nil{return "",nil,err}
 return "/media/"+filename,func(){os.Remove(dest)},nil
}
func mediaStorageProvider(store *cloudMediaStore)string{
 if store!=nil{return "supabase"}
 return "local"
}
