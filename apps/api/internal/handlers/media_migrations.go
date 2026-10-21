package handlers

import (
 "context"
 "github.com/jackc/pgx/v5/pgxpool"
)

// EnsureMediaSchema is reentrant for existing Docker PostgreSQL volumes.
// The named demo rows are only archived once, without deleting orders or stock history.
func EnsureMediaSchema(ctx context.Context,db *pgxpool.Pool)error{
 tx,err:=db.Begin(ctx);if err!=nil{return err};defer tx.Rollback(ctx)
 if _,err=tx.Exec(ctx,"SELECT pg_advisory_xact_lock(hashtext('enjoy_life_media_v1'))");err!=nil{return err}
 for _,sql:=range []string{
  `CREATE TABLE IF NOT EXISTS media_assets(
    id UUID PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
    size_bytes BIGINT NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 8388608),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS site_content(
    id INT PRIMARY KEY CHECK(id=1),
    hero_image_url TEXT NOT NULL DEFAULT '',
    hero_eyebrow TEXT NOT NULL DEFAULT '',
    hero_title TEXT NOT NULL DEFAULT '',
    hero_emphasis TEXT NOT NULL DEFAULT '',
    story_image_url TEXT NOT NULL DEFAULT '',
    story_eyebrow TEXT NOT NULL DEFAULT '',
    story_title TEXT NOT NULL DEFAULT '',
    story_emphasis TEXT NOT NULL DEFAULT '',
    story_p1 TEXT NOT NULL DEFAULT '',
    story_p2 TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `INSERT INTO site_content(id,hero_image_url,hero_eyebrow,hero_title,hero_emphasis,
   story_image_url,story_eyebrow,story_title,story_emphasis,story_p1,story_p2)
   VALUES(1,
   'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1800&q=90',
   'PHONG CÁCH ĐƯỢC ĐỊNH NGHĨA BỞI BẠN','Sống theo','nhịp riêng.',
   'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=85',
   'MỘT LỐI SỐNG / MỘT CÁ TÍNH','Không chỉ là điều bạn mặc.','Mà là cách bạn sống.',
   'Có những ngày bạn muốn nổi bật, cũng có những ngày chỉ cần thật thoải mái. Enjoy Life tin rằng phong cách không bắt đầu từ những quy tắc cứng nhắc.',
   'Chúng tôi muốn mỗi món đồ đều có thể đi cùng bạn trong những khoảnh khắc bình thường, theo một cách thật riêng.')
   ON CONFLICT(id) DO NOTHING`,
  `INSERT INTO categories(id,slug,name)
  VALUES
  ('10000000-0000-4000-8000-000000000004','giay-dep','Giày dép'),
  ('10000000-0000-4000-8000-000000000005','tui-xach','Túi xách'),
  ('10000000-0000-4000-8000-000000000006','trang-suc','Trang sức'),
  ('10000000-0000-4000-8000-000000000007','mu-non','Mũ nón'),
  ('10000000-0000-4000-8000-000000000008','khan-choang','Khăn choàng'),
  ('10000000-0000-4000-8000-000000000009','vay-dam','Váy đầm')
  ON CONFLICT (slug) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS migration_flags(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  // Never DELETE rows. Hide only the exact original four seeded demo UUIDs,
  // and only once. Preserve order_items foreign keys and historical snapshots.
  `WITH flag AS (
     INSERT INTO migration_flags(name) VALUES('archive_original_demo_catalog_v1')
     ON CONFLICT DO NOTHING RETURNING name
   )
   UPDATE products SET published=false
   WHERE id IN (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000004'
   ) AND description ILIKE '%mẫu%' AND EXISTS(SELECT 1 FROM flag)`,
 }{
  if _,err=tx.Exec(ctx,sql);err!=nil{return err}
 }
 return tx.Commit(ctx)
}
