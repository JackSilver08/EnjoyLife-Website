package handlers

import (
 "context"
 "errors"
 "net/http"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
 "golang.org/x/crypto/bcrypt"
)

func (a *App) changePassword(c *gin.Context) {
 user:=a.requireUser(c);if user==nil{return}
 if user.Email==demoAdminEmail {c.JSON(403,gin.H{"error":"Tài khoản demo chỉ dùng khi phát triển. Hãy sử dụng Admin chính thức để đổi mật khẩu."});return}
 var in struct{Current string `json:"current_password"`;New string `json:"new_password"`}
 if c.ShouldBindJSON(&in)!=nil||len(in.New)<12||len(in.New)>72||in.New==in.Current {
  c.JSON(400,gin.H{"error":"Mật khẩu mới phải dài 12–72 ký tự và khác mật khẩu cũ."});return
 }
 ctx,cancel:=context.WithTimeout(c.Request.Context(),8*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var hash string
 err=tx.QueryRow(ctx,`SELECT password_hash FROM users WHERE id=$1 AND disabled_at IS NULL FOR UPDATE`,user.ID).Scan(&hash)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(401,gin.H{"error":"Tài khoản không còn hoạt động."});return}
 if err!=nil{serverError(c,err);return}
 if bcrypt.CompareHashAndPassword([]byte(hash),[]byte(in.Current))!=nil{
  c.JSON(401,gin.H{"error":"Mật khẩu hiện tại không đúng."});return
 }
 updated,err:=bcrypt.GenerateFromPassword([]byte(in.New),bcrypt.DefaultCost);if err!=nil{serverError(c,err);return}
 _,err=tx.Exec(ctx,`UPDATE users SET password_hash=$1 WHERE id=$2`,string(updated),user.ID)
 if err!=nil{serverError(c,err);return}
 token,_:=c.Cookie(sessionCookie)
 _,err=tx.Exec(ctx,`DELETE FROM user_sessions WHERE user_id=$1 AND token_hash<>$2`,user.ID,tokenHash(token))
 if err!=nil{serverError(c,err);return}
 if user.Role!="CUSTOMER"{
  _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'PASSWORD_CHANGE',$1,'Owner changed own password')`,user.ID)
  if err!=nil{serverError(c,err);return}
 }
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(http.StatusOK,gin.H{"status":"ok"})
}

func (a *App) adminStaffResetPassword(c *gin.Context){
 actor:=a.requireAdminOnly(c);if actor==nil{return}
 var in struct{Password string `json:"password"`}
 if c.ShouldBindJSON(&in)!=nil||len(in.Password)<12||len(in.Password)>72{
  c.JSON(400,gin.H{"error":"Mật khẩu phải dài 12–72 ký tự."});return
 }
 hash,err:=bcrypt.GenerateFromPassword([]byte(in.Password),bcrypt.DefaultCost);if err!=nil{serverError(c,err);return}
 ctx,cancel:=context.WithTimeout(c.Request.Context(),5*time.Second);defer cancel()
 tx,err:=a.DB.Begin(ctx);if err!=nil{serverError(c,err);return};defer tx.Rollback(ctx)
 var email string
 err=tx.QueryRow(ctx,`UPDATE users SET password_hash=$2 WHERE id::text=$1 AND role='STAFF' RETURNING email`,c.Param("id"),string(hash)).Scan(&email)
 if errors.Is(err,pgx.ErrNoRows){c.JSON(404,gin.H{"error":"Không tìm thấy nhân viên."});return}
 if err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`DELETE FROM user_sessions WHERE user_id=$1`,c.Param("id"));err!=nil{serverError(c,err);return}
 if _,err=tx.Exec(ctx,`INSERT INTO admin_audit_logs(actor_id,action,target_id,details) VALUES($1,'STAFF_PASSWORD_RESET',$2,$3)`,actor.ID,c.Param("id"),email);err!=nil{serverError(c,err);return}
 if err=tx.Commit(ctx);err!=nil{serverError(c,err);return}
 c.JSON(http.StatusOK,gin.H{"status":"ok"})
}
