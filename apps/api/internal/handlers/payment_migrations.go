package handlers

import (
 "context"
 "github.com/jackc/pgx/v5/pgxpool"
)

// Additive migrations: keep existing orders, payment history and Docker volumes.
func EnsurePaymentSchema(ctx context.Context,db *pgxpool.Pool)error{
 statements:=[]string{
  `CREATE SEQUENCE IF NOT EXISTS payos_order_code_seq START WITH 1200000`,
  `ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS provider_order_code BIGINT`,
  `ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS qr_code TEXT`,
  `ALTER TABLE payment_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_payos_provider_code ON payment_attempts(provider,provider_order_code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_payos_one_attempt_order ON payment_attempts(order_id) WHERE provider='PAYOS'`,
 }
 for _,q:=range statements{if _,err:=db.Exec(ctx,q);err!=nil{return err}}
 return nil
}
