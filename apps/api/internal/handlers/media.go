package handlers

import (
 "bytes"
 "crypto/sha256"
 "encoding/hex"
 "errors"
 "image"
 _ "image/jpeg"
 _ "image/png"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "regexp"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
)

const maxMediaBytes=8<<20
var safeMediaName=regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$`)
func mediaDir()string{
 if s:=os.Getenv("MEDIA_DIR");s!=""{return s}
 return "/app/media"
}
func mediaFileType(b []byte)(string,string,bool){
 mime:=http.DetectContentType(b)
 switch mime{
 case "image/jpeg","image/png":
  config,format,err:=image.DecodeConfig(bytes.NewReader(b))
  if err!=nil||config.Width<1||config.Height<1||int64(config.Width)*int64(config.Height)>32_000_000{return "","",false}
  if format=="jpeg"&&mime=="image/jpeg"{return ".jpg",mime,true}
  if format=="png"&&mime=="image/png"{return ".png",mime,true}
 case "image/webp":
  // Browser-safe RIFF/WEBP only; SVG, scripts, PDFs and renamed executables rejected.
  if len(b)>=30&&string(b[:4])=="RIFF"&&string(b[8:12])=="WEBP"{
   return ".webp",mime,true
  }
 }
 return "","",false
}
func validStoredMediaURL(v string)bool{
 return strings.HasPrefix(v,"/media/")&&safeMediaName.MatchString(strings.TrimPrefix(v,"/media/"))
}
func validManagedImageURL(v string)bool{
 return v==""||validStoredMediaURL(v)||strings.HasPrefix(v,"https://images.unsplash.com/")
}
func(a *App) adminMediaUpload(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 c.Request.Body=http.MaxBytesReader(c.Writer,c.Request.Body,maxMediaBytes+(1<<20))
 fileHeader,err:=c.FormFile("file")
 if err!=nil||fileHeader.Size<1||fileHeader.Size>maxMediaBytes{
  c.JSON(400,gin.H{"error":"Chọn ảnh JPG/PNG/WebP tối đa 8 MB."});return
 }
 file,err:=fileHeader.Open()
 if err!=nil{c.JSON(400,gin.H{"error":"Không đọc được ảnh."});return}
 defer file.Close()
 contents,err:=io.ReadAll(io.LimitReader(file,maxMediaBytes+1))
 if err!=nil||len(contents)<1||len(contents)>maxMediaBytes{
  c.JSON(400,gin.H{"error":"Ảnh quá lớn, giới hạn 8 MB."});return
 }
 ext,mime,ok:=mediaFileType(contents)
 if !ok{c.JSON(400,gin.H{"error":"Chỉ hỗ trợ JPG, PNG hoặc WebP hợp lệ (tối đa 8 MB)."});return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 filename:=id+ext
 dir:=mediaDir()
 if err=os.MkdirAll(dir,0700);err!=nil{serverError(c,err);return}
 temp,err:=os.CreateTemp(dir,".upload-*")
 if err!=nil{serverError(c,err);return}
 tmp:=temp.Name();defer os.Remove(tmp)
 if _,err=temp.Write(contents);err!=nil{temp.Close();serverError(c,err);return}
 if err=temp.Close();err!=nil{serverError(c,err);return}
 dest:=filepath.Join(dir,filename)
 if err=os.Rename(tmp,dest);err!=nil{serverError(c,err);return}
 original:=filepath.Base(strings.ReplaceAll(fileHeader.Filename,"\\","/"))
 if len(original)>200{original=original[:200]}
 _,err=a.DB.Exec(c.Request.Context(),
  `INSERT INTO media_assets(id,filename,original_name,content_type,size_bytes,created_by) VALUES($1,$2,$3,$4,$5,$6)`,
  id,filename,original,mime,len(contents),actor.ID)
 if err!=nil{os.Remove(dest);serverError(c,err);return}
 // Never write file bytes, admin session, original filename or hashes to logs.
 sum:=sha256.Sum256(contents)
 _=hex.EncodeToString(sum[:]) // future duplicate-content detection; no external exposure
 c.JSON(http.StatusCreated,gin.H{"id":id,"url":"/media/"+filename,"filename":filename,"original_name":original,"content_type":mime,"size_bytes":len(contents)})
}
func(a *App) adminMediaList(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT id::text,filename,original_name,content_type,size_bytes,created_at
    FROM media_assets ORDER BY created_at DESC,id DESC LIMIT 120`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var id,filename,original,mime string
  var size int64
  var created time.Time
  if err=rows.Scan(&id,&filename,&original,&mime,&size,&created);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"url":"/media/"+filename,"original_name":original,"content_type":mime,"size_bytes":size,"created_at":created})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func(a *App) publicMedia(c *gin.Context){
 filename:=c.Param("filename")
 if !safeMediaName.MatchString(filename){c.Status(404);return}
 path:=filepath.Join(mediaDir(),filename)
 info,err:=os.Stat(path)
 if errors.Is(err,os.ErrNotExist)||info!=nil&&info.IsDir(){c.Status(404);return}
 if err!=nil{serverError(c,err);return}
 mime:="image/jpeg"
 if strings.HasSuffix(filename,".png"){mime="image/png"}
 if strings.HasSuffix(filename,".webp"){mime="image/webp"}
 c.Header("Content-Type",mime)
 c.Header("Cache-Control","public, max-age=31536000, immutable")
 c.Header("X-Content-Type-Options","nosniff")
 c.File(path)
}
