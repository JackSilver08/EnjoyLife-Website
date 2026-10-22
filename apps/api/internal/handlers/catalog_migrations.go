package handlers

import (
 "context"
 "fmt"

 "github.com/jackc/pgx/v5"
 "github.com/jackc/pgx/v5/pgxpool"
)

// EnsureProductCatalogSchema upgrades existing databases without deleting products,
// SKUs, inventory, historic orders, or movement records.
func EnsureProductCatalogSchema(ctx context.Context, db *pgxpool.Pool) error {
 tx,err:=db.Begin(ctx)
 if err!=nil{return err}
 defer tx.Rollback(ctx)
 if _,err=tx.Exec(ctx,`SELECT pg_advisory_xact_lock(hashtext('enjoy_catalog_schema_v1'))`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE products ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE INDEX IF NOT EXISTS idx_products_active_created ON products(created_at DESC) WHERE archived_at IS NULL`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE SEQUENCE IF NOT EXISTS enjoy_product_sku_seq AS bigint MINVALUE 1 START WITH 1`);err!=nil{return err}
 // Bootstrap the sequence once from existing SP-001 style SKUs. Never reset it
 // on a later restart: retired codes may not be reused.
 if _,err=tx.Exec(ctx,`
  CREATE TABLE IF NOT EXISTS product_catalog_migrations(
   name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
 `);err!=nil{return err}
 var first bool
 err=tx.QueryRow(ctx,`WITH marker AS (
  INSERT INTO product_catalog_migrations(name) VALUES('sku_sequence_v1')
  ON CONFLICT DO NOTHING RETURNING name
 ) SELECT EXISTS(SELECT 1 FROM marker)`).Scan(&first)
 if err!=nil{return err}
 if first {
  _,err=tx.Exec(ctx,`SELECT setval('enjoy_product_sku_seq',
   GREATEST(1,COALESCE((SELECT MAX(SUBSTRING(sku FROM 4)::bigint)
    FROM product_variants WHERE sku ~ '^SP-[0-9]{3,}$'),0)),
   EXISTS(SELECT 1 FROM product_variants WHERE sku ~ '^SP-[0-9]{3,}$'))`)
  if err!=nil{return err}
 }
 return tx.Commit(ctx)
}

// The sequence runs in PostgreSQL, not in the browser; concurrent requests
// cannot reserve the same SKU. Gaps are normal after failed transactions.
func nextProductSKU(ctx context.Context,tx pgx.Tx)(string,error){
 var n int64
 if err:=tx.QueryRow(ctx,`SELECT nextval('enjoy_product_sku_seq')`).Scan(&n);err!=nil{return "",err}
 return fmt.Sprintf("SP-%03d",n),nil
}
