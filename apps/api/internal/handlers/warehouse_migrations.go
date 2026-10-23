package handlers

import (
 "context"
 "github.com/jackc/pgx/v5/pgxpool"
)

// Additive warehouse v2 migration: never rebuild/drop the existing inventory or order ledger.
func EnsureWarehouseSchema(ctx context.Context,db *pgxpool.Pool)error{
 statements:=[]string{
  `CREATE SEQUENCE IF NOT EXISTS warehouse_po_seq START WITH 1`,
  `CREATE TABLE IF NOT EXISTS warehouse_suppliers(
    id UUID PRIMARY KEY,name TEXT NOT NULL,contact TEXT NOT NULL DEFAULT '',
    lead_days INTEGER NOT NULL DEFAULT 7 CHECK(lead_days BETWEEN 1 AND 365),
    active BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS warehouse_purchase_orders(
    id UUID PRIMARY KEY,po_no TEXT NOT NULL UNIQUE,supplier_id UUID NOT NULL REFERENCES warehouse_suppliers(id),
    status TEXT NOT NULL DEFAULT 'ORDERED' CHECK(status IN('ORDERED','PARTIAL','RECEIVED','CANCELLED')),
    note TEXT NOT NULL DEFAULT '',expected_date DATE,created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS warehouse_purchase_items(
    id UUID PRIMARY KEY,po_id UUID NOT NULL REFERENCES warehouse_purchase_orders(id),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK(quantity>0 AND quantity<=10000),
    received INTEGER NOT NULL DEFAULT 0 CHECK(received>=0 AND received<=quantity),
    unit_cost_vnd BIGINT NOT NULL CHECK(unit_cost_vnd>0 AND unit_cost_vnd<1000000000),
    UNIQUE(po_id,variant_id))`,
  `CREATE TABLE IF NOT EXISTS warehouse_receipts(
    id UUID PRIMARY KEY,po_id UUID NOT NULL REFERENCES warehouse_purchase_orders(id),
    request_key TEXT NOT NULL,received_by UUID NOT NULL REFERENCES users(id),
    note TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(po_id,request_key))`,
  `CREATE TABLE IF NOT EXISTS warehouse_receipt_lines(
    receipt_id UUID NOT NULL REFERENCES warehouse_receipts(id),purchase_item_id UUID NOT NULL REFERENCES warehouse_purchase_items(id),
    accepted INTEGER NOT NULL DEFAULT 0 CHECK(accepted>=0),
    quarantined INTEGER NOT NULL DEFAULT 0 CHECK(quarantined>=0),
    CHECK(accepted+quarantined>0),PRIMARY KEY(receipt_id,purchase_item_id))`,
  `CREATE INDEX IF NOT EXISTS idx_wh_purchase_supplier ON warehouse_purchase_orders(supplier_id,created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_wh_purchase_items_variant ON warehouse_purchase_items(variant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_wh_receipts_po ON warehouse_receipts(po_id,created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS stock_waitlist(
    id UUID PRIMARY KEY,variant_id UUID NOT NULL REFERENCES product_variants(id),
    email TEXT NOT NULL,consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK(status IN('WAITING','CONTACTED','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(variant_id,email))`,
  `CREATE INDEX IF NOT EXISTS idx_stock_waitlist_active ON stock_waitlist(variant_id,created_at) WHERE status='WAITING'`,
 }
 for _,statement:=range statements{if _,err:=db.Exec(ctx,statement);err!=nil{return err}}
 return nil
}
