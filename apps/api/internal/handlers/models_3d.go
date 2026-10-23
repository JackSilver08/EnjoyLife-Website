package handlers

import (
 "bytes"
 "context"
 "encoding/binary"
 "encoding/json"
 "errors"
 "io"
 "net/http"
 "os"
 "path/filepath"
 "regexp"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

const maxModelBytes=15<<20
var safeModelName=regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.glb$`)

// GLB v2 only, with self-contained resources. Reject remote URIs, including
// URLs placed in glTF buffers/images: a model must never request third-party data.
func validGLB(b []byte)bool{
 if len(b)<20||len(b)>maxModelBytes||!bytes.Equal(b[:4],[]byte("glTF"))||binary.LittleEndian.Uint32(b[4:8])!=2||
  int(binary.LittleEndian.Uint32(b[8:12]))!=len(b){return false}
 jsonLength:=int(binary.LittleEndian.Uint32(b[12:16]))
 if jsonLength<4||jsonLength>2<<20||jsonLength%4!=0||20+jsonLength>len(b)||
  !bytes.Equal(b[16:20],[]byte("JSON")){return false}
 var root struct{
  Asset struct{Version string `json:"version"`} `json:"asset"`
  Buffers []struct{URI string `json:"uri"`} `json:"buffers"`
  Images []struct{URI string `json:"uri"`} `json:"images"`
 }
 if json.Unmarshal(bytes.TrimRight(b[20:20+jsonLength]," \x00"),&root)!=nil||root.Asset.Version!="2.0"{return false}
 for _,buffer:=range root.Buffers{if buffer.URI!=""{return false}}
 for _,img:=range root.Images{if img.URI!=""{return false}}
 // Do not allow stray or oversized trailing chunks; only one embedded BIN chunk.
 pos:=20+jsonLength
 if pos==len(b){return true}
 if pos+8>len(b)||!bytes.Equal(b[pos+4:pos+8],[]byte("BIN\x00")){return false}
 chunkLength:=int(binary.LittleEndian.Uint32(b[pos:pos+4]))
 return chunkLength>=0&&chunkLength%4==0&&pos+8+chunkLength==len(b)
}

func (a *App) adminProductModels(c *gin.Context){
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT pc.name,pc.model_url FROM product_colorways pc
  JOIN products p ON p.id=pc.product_id
  WHERE pc.product_id::text=$1 AND p.archived_at IS NULL AND EXISTS(
   SELECT 1 FROM product_variants v WHERE v.product_id=pc.product_id AND v.color=pc.name)
  ORDER BY pc.name`,c.Param("id"))
 if err!=nil{serverError(c,err);return}
 defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var name,url string
  if err=rows.Scan(&name,&url);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"color":name,"model_url":url})
 }
 if rows.Err()!=nil{serverError(c,rows.Err());return}
 c.JSON(200,gin.H{"items":items})
}

func (a *App) adminUploadProductModel(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 c.Request.Body=http.MaxBytesReader(c.Writer,c.Request.Body,maxModelBytes+1<<20)
 color:=strings.TrimSpace(c.PostForm("color"))
 if len(color)<1||len(color)>40{c.JSON(400,gin.H{"error":"Chọn màu thuộc sản phẩm."});return}
 fileHeader,err:=c.FormFile("file")
 if err!=nil||fileHeader.Size<20||fileHeader.Size>maxModelBytes{
  c.JSON(400,gin.H{"error":"Chọn tệp GLB tối đa 15 MB."});return
 }
 file,err:=fileHeader.Open()
 if err!=nil{c.JSON(400,gin.H{"error":"Không đọc được mô hình."});return}
 defer file.Close()
 contents,err:=io.ReadAll(io.LimitReader(file,maxModelBytes+1))
 if err!=nil||!validGLB(contents){
  c.JSON(400,gin.H{"error":"Tệp GLB 2.0 không hợp lệ hoặc chứa tài nguyên bên ngoài."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),15*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var found string
 err=tx.QueryRow(ctx,`SELECT pc.name FROM product_colorways pc JOIN products p ON p.id=pc.product_id
  WHERE pc.product_id::text=$1 AND pc.name=$2 AND p.archived_at IS NULL AND EXISTS(
   SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.color=pc.name)
  FOR UPDATE OF pc`,c.Param("id"),color).Scan(&found)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy màu trong sản phẩm."});return}
 if err!=nil{serverError(c,err);return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 filename:=id+".glb"
 dir:=mediaDir()
 if err=os.MkdirAll(dir,0700);err!=nil{serverError(c,err);return}
 tmp,err:=os.CreateTemp(dir,".model-*")
 if err!=nil{serverError(c,err);return}
 tmpPath:=tmp.Name();defer os.Remove(tmpPath)
 if _,err=tmp.Write(contents);err!=nil{tmp.Close();serverError(c,err);return}
 if err=tmp.Close();err!=nil{serverError(c,err);return}
 dest:=filepath.Join(dir,filename)
 if err=os.Rename(tmpPath,dest);err!=nil{serverError(c,err);return}
 saved:=false
 defer func(){if !saved{_ = os.Remove(dest)}}()
 if _,err=tx.Exec(ctx,`INSERT INTO product_model_assets(id,product_id,color,filename,size_bytes,created_by)
  VALUES($1,$2,$3,$4,$5,$6)`,id,c.Param("id"),color,filename,len(contents),actor.ID);err!=nil{
  serverError(c,err);return
 }
 url:="/models/"+filename
 if _,err=tx.Exec(ctx,`UPDATE product_colorways SET model_url=$1 WHERE product_id::text=$2 AND name=$3`,
  url,c.Param("id"),color);err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
  VALUES($1,'PRODUCT_3D_UPLOAD',$2,$3)`,actor.ID,c.Param("id"),color);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 saved=true
 c.JSON(201,gin.H{"color":color,"model_url":url,"size_bytes":len(contents)})
}

func (a *App) adminUnlinkProductModel(c *gin.Context){
 actor:=a.requireAdmin(c);if actor==nil{return}
 var body struct{Color string `json:"color"`}
 if c.ShouldBindJSON(&body)!=nil||len(strings.TrimSpace(body.Color))==0||len(body.Color)>40{
  c.JSON(400,gin.H{"error":"Màu không hợp lệ."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),6*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 tag,err:=tx.Exec(ctx,`UPDATE product_colorways pc SET model_url=''
  FROM products p WHERE pc.product_id=p.id AND pc.product_id::text=$1
  AND pc.name=$2 AND p.archived_at IS NULL`,c.Param("id"),body.Color)
 if err!=nil{serverError(c,err);return}
 if tag.RowsAffected()==0{c.JSON(404,gin.H{"error":"Không tìm thấy màu."});return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details)
  VALUES($1,'PRODUCT_3D_UNLINK',$2,$3)`,actor.ID,c.Param("id"),body.Color);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"status":"ok"})
}

// Public models are immutable, stored in a private mounted directory and
// accessed only by generated UUID names. Never serve filenames supplied by Admin.
func (a *App) public3DModel(c *gin.Context){
 filename:=c.Param("filename")
 if !safeModelName.MatchString(filename){c.Status(404);return}
 path:=filepath.Join(mediaDir(),filename)
 info,err:=os.Stat(path)
 if errors.Is(err,os.ErrNotExist)||(info!=nil&&info.IsDir()){c.Status(404);return}
 if err!=nil{serverError(c,err);return}
 c.Header("Content-Type","model/gltf-binary")
 c.Header("Content-Disposition","inline")
 c.Header("Cache-Control","public, max-age=31536000, immutable")
 c.Header("X-Content-Type-Options","nosniff")
 c.File(path)
}
