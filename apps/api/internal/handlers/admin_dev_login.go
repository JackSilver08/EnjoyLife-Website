package handlers

import (
 "crypto/subtle"
 "net/http"
 "os"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
 "golang.org/x/crypto/bcrypt"
)

const demoAdminEmail="admin@enjoylife.local"

// Fixed demo credentials are NEVER accepted outside explicitly enabled local development.
func devAdminEnabled() bool {
 return os.Getenv("APP_ENV")=="development" && os.Getenv("GIN_MODE")=="debug" && os.Getenv("ENABLE_DEV_ADMIN")=="true"
}
func(a *App) devAdminLogin(c *gin.Context){
 if !devAdminEnabled(){c.JSON(404,gin.H{"error":"Không tìm thấy."});return}
 var req struct{Username string `json:"username"`;Password string `json:"password"`}
 if c.ShouldBindJSON(&req)!=nil||subtle.ConstantTimeCompare([]byte(req.Username),[]byte("admin"))!=1||subtle.ConstantTimeCompare([]byte(req.Password),[]byte("admin"))!=1 {
  c.JSON(http.StatusUnauthorized,gin.H{"error":"Tên đăng nhập hoặc mật khẩu không đúng."});return
 }
 var user currentUser
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT id::text,email,display_name,role FROM users WHERE email=$1`,demoAdminEmail).Scan(&user.ID,&user.Email,&user.Name,&user.Role)
 if err==pgx.ErrNoRows {
  id,e:=uuid();if e!=nil{serverError(c,e);return}
  hash,e:=bcrypt.GenerateFromPassword([]byte("admin"),bcrypt.DefaultCost);if e!=nil{serverError(c,e);return}
  user=currentUser{ID:id,Email:demoAdminEmail,Name:"Admin Enjoy Life (Local)",Role:"ADMIN"}
  e=a.DB.QueryRow(c.Request.Context(),`INSERT INTO users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'ADMIN') ON CONFLICT(email) DO UPDATE SET role='ADMIN',password_hash=EXCLUDED.password_hash RETURNING id::text`,id,user.Email,user.Name,string(hash)).Scan(&user.ID)
  if e!=nil{serverError(c,e);return}
 }else if err!=nil {serverError(c,err);return}
 if user.Role!="ADMIN"{c.JSON(403,gin.H{"error":"Không có quyền."});return}
 a.createSession(c,user)
}
