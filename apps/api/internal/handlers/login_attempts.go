package handlers

import (
 "errors"
 "time"

 "github.com/gin-gonic/gin"
 "github.com/jackc/pgx/v5"
)

// Login lockouts persist in PostgreSQL across API restarts. Keys are SHA-256
// digests of normalized identifiers, not raw email addresses.
func (a *App) authAllowed(c *gin.Context, identifier string) (bool,error) {
 var until *time.Time
 err:=a.DB.QueryRow(c.Request.Context(),`SELECT locked_until FROM auth_login_attempts WHERE identifier_hash=$1`,tokenHash(identifier)).Scan(&until)
 if errors.Is(err,pgx.ErrNoRows){return true,nil}
 if err!=nil{return false,err}
 return until==nil||time.Now().After(*until),nil
}
func (a *App) authFailed(c *gin.Context, identifier string) error {
 _,err:=a.DB.Exec(c.Request.Context(),`
 INSERT INTO auth_login_attempts(identifier_hash,failures,locked_until,updated_at)
 VALUES($1,1,NULL,now())
 ON CONFLICT(identifier_hash) DO UPDATE SET
 failures=CASE WHEN auth_login_attempts.updated_at<now()-interval '15 minutes' THEN 1 ELSE LEAST(auth_login_attempts.failures+1,5) END,
 locked_until=CASE WHEN auth_login_attempts.updated_at<now()-interval '15 minutes' THEN NULL
   WHEN auth_login_attempts.failures>=4 THEN now()+interval '15 minutes'
   ELSE auth_login_attempts.locked_until END,
 updated_at=now()`,tokenHash(identifier))
 return err
}
func (a *App) authSucceeded(c *gin.Context, identifier string) error {
 _,err:=a.DB.Exec(c.Request.Context(),`DELETE FROM auth_login_attempts WHERE identifier_hash=$1`,tokenHash(identifier))
 return err
}
