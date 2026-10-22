package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookie = "enjoy_life_session"

type currentUser struct {
 ID string `json:"id"`
 Email string `json:"email"`
 Name string `json:"name"`
 Role string `json:"role"`
}
type credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func cleanEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }
func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func EnsureAdmin(ctx context.Context, db *pgxpool.Pool, email, password string) error {
	email = cleanEmail(email)
	if email == "" || len(password) < 8 {
		return nil
	}
	var exists,role string
	err := db.QueryRow(ctx, "SELECT id::text,role FROM users WHERE email=$1", email).Scan(&exists,&role)
	if err == nil {
		if role != "ADMIN" {
			return errors.New("configured admin email belongs to a non-admin user; refusing automatic privilege escalation")
		}
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	id, err := uuid()
	if err != nil {
		return err
	}
	_, err = db.Exec(ctx, "INSERT INTO users(id,email,display_name,password_hash,role) VALUES($1,$2,$3,$4,'ADMIN')", id, email, "Quản trị viên", string(hash))
	return err
}

func (a *App) loadUser(c *gin.Context) *currentUser {
	token, err := c.Cookie(sessionCookie)
	if err != nil || len(token) != 64 {
		return nil
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	var user currentUser
	err = a.DB.QueryRow(ctx, `SELECT u.id::text,u.email,u.display_name,u.role FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.disabled_at IS NULL`, tokenHash(token)).Scan(&user.ID, &user.Email, &user.Name, &user.Role)
	if err != nil || (user.Email==demoAdminEmail && !devAdminEnabled()) {
		return nil
	}
	return &user
}
func (a *App) requireUser(c *gin.Context) *currentUser {
	u := a.loadUser(c)
	if u == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Vui lòng đăng nhập để tiếp tục."})
	}
	return u
}
func (a *App) requireAdmin(c *gin.Context) *currentUser {
	u := a.requireUser(c)
	if u == nil {
		return nil
	}
	if u.Role != "ADMIN" && !(u.Role == "STAFF" && c.GetBool(staffPermissionKey)) {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Bạn không có quyền quản trị."})
		return nil
	}
	return u
}

func (a *App) createSession(c *gin.Context, user currentUser) {
	token, _ := randomHex(32)
	id, _ := uuid()
	_, err := a.DB.Exec(c.Request.Context(), "INSERT INTO user_sessions(id,token_hash,user_id,expires_at) VALUES($1,$2,$3,$4)", id, tokenHash(token), user.ID, time.Now().Add(24*time.Hour))
	if err != nil {
		serverError(c, err)
		return
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: sessionCookie, Value: token, Path: "/", HttpOnly: true, Secure: c.Request.TLS != nil || os.Getenv("APP_ENV") == "production", SameSite: http.SameSiteLaxMode, MaxAge: 24 * 60 * 60})
	c.JSON(http.StatusOK, gin.H{"user": user})
}
func (a *App) register(c *gin.Context) {
	var in credentials
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"error": "Thông tin đăng ký không hợp lệ."})
		return
	}
	in.Email = cleanEmail(in.Email)
    if in.Email==demoAdminEmail { c.JSON(400,gin.H{"error":"Địa chỉ email không khả dụng."});return }
	in.Name = strings.TrimSpace(in.Name)
	if len(in.Name) < 2 || len(in.Name) > 100 || len(in.Email) < 5 || !strings.Contains(in.Email, "@") || len(in.Password) < 8 || len(in.Password) > 72 {
		c.JSON(400, gin.H{"error": "Vui lòng nhập tên, email hợp lệ và mật khẩu ít nhất 8 ký tự."})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		serverError(c, err)
		return
	}
	id, err := uuid()
	if err != nil {
		serverError(c, err)
		return
	}
	_, err = a.DB.Exec(c.Request.Context(), "INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4)", id, in.Email, in.Name, string(hash))
	if err != nil {
		c.JSON(409, gin.H{"error": "Email này đã được đăng ký."})
		return
	}
	a.createSession(c, currentUser{ID: id, Email: in.Email, Name: in.Name, Role: "CUSTOMER"})
}
func (a *App) login(c *gin.Context) {
	var in credentials
	if c.ShouldBindJSON(&in) != nil {
		c.JSON(400, gin.H{"error": "Thông tin đăng nhập không hợp lệ."})
		return
	}
	in.Email = cleanEmail(in.Email)
    if in.Email==demoAdminEmail { c.JSON(401,gin.H{"error":"Vui lòng đăng nhập qua trang quản trị."});return }
    if len(in.Email)>254||len(in.Password)>72||len(in.Email)<5 {c.JSON(401,gin.H{"error":"Email hoặc mật khẩu không đúng."});return}
    allowed,checkErr:=a.authAllowed(c,in.Email)
    if checkErr!=nil{serverError(c,checkErr);return}
    if !allowed{c.JSON(429,gin.H{"error":"Quá nhiều lần đăng nhập không thành công. Thử lại sau 15 phút."});return}
	var user currentUser
	var hash string
	err := a.DB.QueryRow(c.Request.Context(), "SELECT id::text,email,display_name,role,password_hash FROM users WHERE email=$1 AND disabled_at IS NULL", in.Email).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil {
		if err=a.authFailed(c,in.Email);err!=nil{serverError(c,err);return}
		c.JSON(401, gin.H{"error": "Email hoặc mật khẩu không đúng."})
		return
	}
	if err=a.authSucceeded(c,in.Email);err!=nil{serverError(c,err);return}
	a.createSession(c, user)
}
func (a *App) logout(c *gin.Context) {
	if token, err := c.Cookie(sessionCookie); err == nil {
		_, _ = a.DB.Exec(c.Request.Context(), "DELETE FROM user_sessions WHERE token_hash=$1", tokenHash(token))
	}
	http.SetCookie(c.Writer, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", HttpOnly: true, MaxAge: -1})
	c.Status(http.StatusNoContent)
}
func (a *App) me(c *gin.Context) {
	u := a.loadUser(c)
	if u == nil {
		c.JSON(http.StatusOK, gin.H{"user": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": u})
}
func (a *App) myOrders(c *gin.Context) {
	u := a.requireUser(c)
	if u == nil {
		return
	}
	rows, err := a.DB.Query(c.Request.Context(), "SELECT order_no,status,payment_status,payment_method,total_vnd,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50", u.ID)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var no, status, pay, method string
		var total int64
		var created time.Time
		if rows.Scan(&no, &status, &pay, &method, &total, &created) == nil {
			items = append(items, gin.H{"order_no": no, "status": status, "payment_status": pay, "payment_method": method, "total_vnd": total, "created_at": created})
		}
	}
	c.JSON(200, gin.H{"items": items})
}
func (a *App) adminOrders(c *gin.Context) {
 if a.requireAdmin(c)==nil{return}
 rows,err:=a.DB.Query(c.Request.Context(),`SELECT order_no,status,payment_status,payment_method,total_vnd,created_at,customer_name,customer_phone,shipping_address,note FROM orders ORDER BY created_at DESC LIMIT 100`)
 if err!=nil{serverError(c,err);return};defer rows.Close()
 items:=[]gin.H{}
 for rows.Next(){
  var no,status,pay,method,name,phone,address,note string
  var total int64
  var created time.Time
  if err=rows.Scan(&no,&status,&pay,&method,&total,&created,&name,&phone,&address,&note);err!=nil{serverError(c,err);return}
  items=append(items,gin.H{"order_no":no,"status":status,"payment_status":pay,"payment_method":method,"total_vnd":total,"created_at":created,"customer_name":name,"phone":phone,"shipping_address":address,"note":note})
 }
 if err=rows.Err();err!=nil{serverError(c,err);return}
 c.JSON(200,gin.H{"items":items})
}
func (a *App) adminUsers(c *gin.Context) {
	if a.requireAdmin(c) == nil {
		return
	}
	rows, err := a.DB.Query(c.Request.Context(), `SELECT id::text,email,display_name,role,created_at FROM users ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		serverError(c, err)
		return
	}
	defer rows.Close()
	items := []gin.H{}
	for rows.Next() {
		var id, email, name, role string
		var created time.Time
		if rows.Scan(&id, &email, &name, &role, &created) == nil {
			items = append(items, gin.H{"id": id, "email": email, "name": name, "role": role, "created_at": created})
		}
	}
	if err := rows.Err(); err != nil {
		serverError(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}
