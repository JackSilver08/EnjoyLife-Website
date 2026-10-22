package handlers

import (
 "context"
 "errors"
 "net/http"
 "strings"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
 "github.com/jackc/pgx/v5/pgconn"
 "golang.org/x/crypto/bcrypt"
)

// Staff accounts must be created by an ADMIN, never via public registration.
func (a *App) adminStaffList(c *gin.Context) {
 if a.requireAdminOnly(c)==nil{return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 rows,err:=a.DB.Query(ctx,`SELECT id::text,email,display_name,(disabled_at IS NOT NULL),created_at FROM users WHERE role='STAFF' ORDER BY created_at DESC LIMIT 200`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){var id,email,name string;var disabled bool;var created time.Time
  if err=rows.Scan(&id,&email,&name,&disabled,&created);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"id":id,"email":email,"name":name,"disabled":disabled,"created_at":created})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(http.StatusOK,gin.H{"items":items})
}
func (a *App) adminStaffCreate(c *gin.Context) {
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{ Email string `json:"email"`; Name string `json:"name"`; Password string `json:"password"` }
 if c.ShouldBindJSON(&in)!=nil {c.JSON(400,gin.H{"error":"Thông tin nhân viên không hợp lệ."});return}
 in.Email=cleanEmail(in.Email);in.Name=strings.TrimSpace(in.Name)
 if in.Email==demoAdminEmail||len(in.Email)<5||len(in.Email)>254||!strings.Contains(in.Email,"@")||len(in.Name)<2||len(in.Name)>100||len(in.Password)<12||len(in.Password)>72 {
  c.JSON(400,gin.H{"error":"Email, tên hoặc mật khẩu không hợp lệ (mật khẩu 12–72 ký tự)."});return
 }
 hash,err:=bcrypt.GenerateFromPassword([]byte(in.Password),bcrypt.DefaultCost);if err!=nil{serverError(c,err);return}
 id,err:=uuid();if err!=nil{serverError(c,err);return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 _,err=tx.Exec(ctx,`INSERT INTO users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'STAFF')`,id,in.Email,in.Name,string(hash))
 if err!=nil {var pgerr *pgconn.PgError;if errors.As(err,&pgerr)&&pgerr.Code=="23505"{c.JSON(409,gin.H{"error":"Email đã được sử dụng."});return};serverError(c,err);return}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'STAFF_CREATE',$2,$3)`,actor.ID,id,in.Email)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(http.StatusCreated,gin.H{"id":id,"email":in.Email,"name":in.Name,"role":"STAFF","disabled":false})
}
func (a *App) adminStaffSetDisabled(c *gin.Context) {
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{ Disabled *bool `json:"disabled"` }
 if c.ShouldBindJSON(&in)!=nil||in.Disabled==nil{c.JSON(400,gin.H{"error":"Cần disabled = true hoặc false."});return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var id,email string
 err=tx.QueryRow(ctx,`UPDATE users SET disabled_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id::text=$1 AND role='STAFF' RETURNING id::text,email`,c.Param("id"),*in.Disabled).Scan(&id,&email)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy nhân viên."});return}
 if err!=nil{serverError(c,err);return}
 if *in.Disabled{if _,err=tx.Exec(ctx,`DELETE FROM user_sessions WHERE user_id=$1`,id);err!=nil{serverError(c,err);return}}
 action:="STAFF_ENABLE";if *in.Disabled{action="STAFF_DISABLE"}
 _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,$2,$3,$4)`,actor.ID,action,id,email)
 if err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"id":id,"disabled":*in.Disabled})
}
