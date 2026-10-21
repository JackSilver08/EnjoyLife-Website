package handlers

import (
 "archive/zip"
 "bytes"
 "context"
 "errors"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "strings"
 "time"
 "unicode/utf8"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

const maxMediaZipBytes = 30 << 20
const maxMediaZipFiles = 120
const maxMediaZipUncompressed = 160 << 20

// The ZIP is only an image transport. CSV product data is imported separately,
// after images are saved using their original basenames.
func (a *App) adminMediaBulkZip(c *gin.Context) {
 actor := a.requireAdmin(c)
 if actor == nil { return }
 c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxMediaZipBytes+(1<<20))
 header, err := c.FormFile("file")
 if err != nil || header.Size < 1 || header.Size > maxMediaZipBytes {
  c.JSON(400, gin.H{"error":"File ZIP ảnh phải nhỏ hơn 30 MB."}); return
 }
 upload, err := header.Open()
 if err != nil { c.JSON(400, gin.H{"error":"Không đọc được file ZIP."}); return }
 defer upload.Close()
 buf, err := io.ReadAll(io.LimitReader(upload, maxMediaZipBytes+1))
 if err != nil || len(buf)>maxMediaZipBytes {
  c.JSON(413, gin.H{"error":"File ZIP quá lớn."}); return
 }
 archive, err := zip.NewReader(bytes.NewReader(buf),int64(len(buf)))
 if err != nil { c.JSON(400,gin.H{"error":"ZIP không hợp lệ hoặc bị hỏng."});return }

 type img struct {file *zip.File; original string}
 images := make([]img,0,len(archive.File))
 names := make(map[string]bool)
 var unpacked uint64
 for _,f := range archive.File {
  name:=strings.ReplaceAll(f.Name,"\\","/")
  if f.FileInfo().IsDir()||strings.HasPrefix(name,"__MACOSX/")||strings.HasPrefix(filepath.Base(name),"."){continue}
  base:=filepath.Base(name)
  ext:=strings.ToLower(filepath.Ext(base))
  if ext==".csv"||ext==".txt"||ext==".md" {continue}
  if ext!=".jpg"&&ext!=".jpeg"&&ext!=".png"&&ext!=".webp"{
   c.JSON(400,gin.H{"error":"ZIP chứa tệp không phải ảnh: "+base});return
  }
  if f.Mode()&os.ModeSymlink!=0||!utf8.ValidString(base)||len(base)>200||base=="."||base==".." {
   c.JSON(400,gin.H{"error":"Tên ảnh trong ZIP không hợp lệ."});return
  }
  if names[base] {c.JSON(400,gin.H{"error":"ZIP có tên ảnh trùng nhau: "+base});return}
  names[base]=true
  if f.UncompressedSize64==0||f.UncompressedSize64>maxMediaBytes {
   c.JSON(400,gin.H{"error":"Ảnh vượt quá 8 MB: "+base});return
  }
  unpacked+=f.UncompressedSize64
  if unpacked>maxMediaZipUncompressed||len(images)>=maxMediaZipFiles {
   c.JSON(400,gin.H{"error":"ZIP vượt giới hạn 120 ảnh hoặc 160 MB giải nén."});return
  }
  images=append(images,img{file:f,original:base})
 }
 if len(images)==0 {c.JSON(400,gin.H{"error":"ZIP không chứa JPG, PNG hoặc WebP."});return}

 ctx,cancel:=context.WithTimeout(c.Request.Context(),90*time.Second)
 defer cancel()
 tx,err:=a.DB.Begin(ctx)
 if err!=nil{serverError(c,err);return}
 defer tx.Rollback(ctx)
 dir:=mediaDir()
 if err=os.MkdirAll(dir,0700);err!=nil{serverError(c,err);return}
 // Media files are only permanent when the metadata transaction commits.
 written:=make([]string,0,len(images))
 committed:=false
 defer func(){if !committed{for _,p:=range written{_ = os.Remove(p)}}}()
 added,skipped:=0,0
 for _,item:=range images {
  f:=item.file
  reader,err:=f.Open()
  if err!=nil{c.JSON(400,gin.H{"error":"Không thể giải nén: "+item.original});return}
  contents,readErr:=io.ReadAll(io.LimitReader(reader,maxMediaBytes+1))
  closeErr:=reader.Close()
  if readErr!=nil||closeErr!=nil||len(contents)==0||len(contents)>maxMediaBytes {
   c.JSON(400,gin.H{"error":"Lỗi giải nén hoặc ảnh quá lớn: "+item.original});return
  }
  ext,mime,ok:=mediaFileType(contents)
  if !ok {
   c.JSON(400,gin.H{"error":"Dữ liệu ảnh không hợp lệ: "+item.original});return
  }
  var existing string
  err=tx.QueryRow(ctx,`SELECT filename FROM media_assets WHERE original_name=$1 ORDER BY created_at DESC LIMIT 1`,item.original).Scan(&existing)
  if err==nil{
   if _,statErr:=os.Stat(filepath.Join(dir,existing));statErr!=nil {
    c.JSON(409,gin.H{"error":"Ảnh đã đăng ký nhưng thiếu file lưu trữ: "+item.original});return
   }
   skipped++
   continue
  }
  if !errors.Is(err,pgx.ErrNoRows){serverError(c,err);return}

  id,err:=uuid()
  if err!=nil{serverError(c,err);return}
  filename:=id+ext
  tmp,err:=os.CreateTemp(dir,".zip-upload-*")
  if err!=nil{serverError(c,err);return}
  tempPath:=tmp.Name()
  if _,err=tmp.Write(contents);err!=nil{tmp.Close();os.Remove(tempPath);serverError(c,err);return}
  if err=tmp.Close();err!=nil{os.Remove(tempPath);serverError(c,err);return}
  dst:=filepath.Join(dir,filename)
  if err=os.Rename(tempPath,dst);err!=nil{os.Remove(tempPath);serverError(c,err);return}
  written=append(written,dst)
  if _,err=tx.Exec(ctx,`INSERT INTO media_assets(id,filename,original_name,content_type,size_bytes,created_by)
   VALUES($1,$2,$3,$4,$5,$6)`,id,filename,item.original,mime,len(contents),actor.ID);err!=nil{
   serverError(c,err);return
  }
  added++
 }
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 committed=true
 c.JSON(http.StatusCreated,gin.H{"uploaded":added,"skipped_existing":skipped,"total":len(images)})
}
