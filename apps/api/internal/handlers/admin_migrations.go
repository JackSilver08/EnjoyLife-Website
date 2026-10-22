package handlers

import (
 "context"
 "github.com/jackc/pgx/v5/pgxpool"
)
func EnsureAccountSchema(ctx context.Context,db *pgxpool.Pool)error{
 statements:=[]string{
 `CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY,email TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN('CUSTOMER','ADMIN','STAFF')),disabled_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS auth_login_attempts(identifier_hash TEXT PRIMARY KEY,failures INT NOT NULL DEFAULT 0,locked_until TIMESTAMPTZ,updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 `CREATE TABLE IF NOT EXISTS user_sessions(id UUID PRIMARY KEY,token_hash TEXT NOT NULL UNIQUE,user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 `ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ`,
 `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
 `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN('CUSTOMER','ADMIN','STAFF'))`,
 `ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id)`,
 `CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash)`,
 `CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id,created_at DESC)`,
 }
 for _,stmt:=range statements {if _,err:=db.Exec(ctx,stmt);err!=nil{return err}}
 return nil
}
func EnsureAdminAudit(ctx context.Context,db *pgxpool.Pool)error{
 _,err:=db.Exec(ctx,`CREATE TABLE IF NOT EXISTS admin_audit_logs(id BIGSERIAL PRIMARY KEY,actor_id UUID NOT NULL REFERENCES users(id),action TEXT NOT NULL,target_id TEXT NOT NULL,details TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
 return err
}
