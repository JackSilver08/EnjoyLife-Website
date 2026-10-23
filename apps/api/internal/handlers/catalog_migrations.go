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
 if _,err=tx.Exec(ctx,`CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id),
  url TEXT NOT NULL, alt TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL CHECK (position >= 0),
  UNIQUE(product_id,position)
 )`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT ''`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE TABLE IF NOT EXISTS product_colorways (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  hex TEXT NOT NULL DEFAULT '' CHECK(hex='' OR hex ~ '^#[0-9a-fA-F]{6}$'),
  color_group TEXT NOT NULL DEFAULT 'Khác' CHECK(char_length(color_group) BETWEEN 1 AND 40),
  swatch_url TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(product_id,name)
 )`);err!=nil{return err}
 // Keep existing SKU, stock and historical order snapshots exactly as they were.
 if _,err=tx.Exec(ctx,`INSERT INTO product_colorways(product_id,name)
   SELECT DISTINCT product_id,color FROM product_variants
   ON CONFLICT(product_id,name) DO NOTHING`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE product_colorways ADD COLUMN IF NOT EXISTS model_url TEXT NOT NULL DEFAULT ''`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE TABLE IF NOT EXISTS product_model_assets (
  id UUID PRIMARY KEY, product_id UUID NOT NULL REFERENCES products(id),
  color TEXT NOT NULL, filename TEXT NOT NULL UNIQUE, size_bytes INTEGER NOT NULL
  CHECK (size_bytes BETWEEN 20 AND 15728640),
  created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE INDEX IF NOT EXISTS idx_product_model_assets_product ON product_model_assets(product_id,created_at DESC)`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id,position)`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold BETWEEN 0 AND 100000)`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT ''`);err!=nil{return err}
 if _,err=tx.Exec(ctx,`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS actor_id UUID`);err!=nil{return err}
 return tx.Commit(ctx)
}

// The sequence runs in PostgreSQL, not in the browser; concurrent requests
// cannot reserve the same SKU. Gaps are normal after failed transactions.
func nextProductSKU(ctx context.Context,tx pgx.Tx)(string,error){
 var n int64
 if err:=tx.QueryRow(ctx,`SELECT nextval('enjoy_product_sku_seq')`).Scan(&n);err!=nil{return "",err}
 return fmt.Sprintf("SP-%03d",n),nil
}
