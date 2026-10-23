package handlers

import (
 "context"
 "fmt"

 "github.com/jackc/pgx/v5/pgxpool"
)

// EnsureReturnsSchema is strictly additive. Never alter existing order/payment
// values or drop historic inventory, including on persistent developer volumes.
func EnsureReturnsSchema(ctx context.Context, db *pgxpool.Pool) error {
 tx,err:=db.Begin(ctx);if err!=nil{return err}
 defer tx.Rollback(ctx)
 if _,err=tx.Exec(ctx,`SELECT pg_advisory_xact_lock(hashtext('enjoy_returns_schema_v1'))`);err!=nil{return err}
 statements:=[]string{
  `CREATE SEQUENCE IF NOT EXISTS returns_rma_seq START WITH 1`,
  `CREATE TABLE IF NOT EXISTS return_cases (
   id UUID PRIMARY KEY, rma_no TEXT NOT NULL UNIQUE, order_id UUID NOT NULL REFERENCES orders(id),
   kind TEXT NOT NULL CHECK(kind IN ('CUSTOMER_RETURN','DELIVERY_FAILED')),
   status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','REJECTED','RECEIVED','CLOSED')),
   refund_status TEXT NOT NULL CHECK(refund_status IN ('NOT_REQUIRED','PENDING','CONFIRMED')),
   refund_amount_vnd BIGINT NOT NULL CHECK(refund_amount_vnd>=0),
   reason TEXT NOT NULL, decision_note TEXT NOT NULL DEFAULT '',
   received_note TEXT NOT NULL DEFAULT '', receipt_key TEXT,
   refund_reference TEXT NOT NULL DEFAULT '', refunded_at TIMESTAMPTZ,
   created_by UUID NOT NULL REFERENCES users(id),
   reviewed_by UUID REFERENCES users(id), received_by UUID REFERENCES users(id),
   refunded_by UUID REFERENCES users(id),
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(), reviewed_at TIMESTAMPTZ,
   received_at TIMESTAMPTZ,
   CHECK(receipt_key IS NULL OR length(receipt_key) BETWEEN 8 AND 100)
  )`,
  `CREATE TABLE IF NOT EXISTS return_case_items (
   id UUID PRIMARY KEY, return_id UUID NOT NULL REFERENCES return_cases(id),
   order_item_id BIGINT NOT NULL REFERENCES order_items(id),
   variant_id UUID NOT NULL REFERENCES product_variants(id),
   quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=100),
   good_received INTEGER NOT NULL DEFAULT 0 CHECK(good_received>=0),
   quarantine_received INTEGER NOT NULL DEFAULT 0 CHECK(quarantine_received>=0),
   unit_price_vnd BIGINT NOT NULL CHECK(unit_price_vnd>0),
   UNIQUE(return_id,order_item_id),
   CHECK(good_received+quarantine_received<=quantity)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_return_cases_order ON return_cases(order_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_return_cases_created ON return_cases(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_return_items_order_item ON return_case_items(order_item_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_returns_refund_reference ON return_cases(refund_reference) WHERE refund_reference<>''`,
 }
 for i,q:=range statements{
  if _,err=tx.Exec(ctx,q);err!=nil{return fmt.Errorf("return schema migration step %d: %w",i+1,err)}
 }
 return tx.Commit(ctx)
}
