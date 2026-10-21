-- Enjoy Life Journal schema v1. Applied transactionally on API startup.
-- +statement
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- +statement
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 2 AND 80),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- +statement
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (length(slug) BETWEEN 3 AND 140),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 180),
  excerpt TEXT NOT NULL DEFAULT '',
  content_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb CHECK (jsonb_typeof(content_json)='object'),
  category_id UUID REFERENCES blog_categories(id) ON DELETE RESTRICT,
  cover_image_url TEXT NOT NULL DEFAULT '',
  cover_image_alt TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  og_image_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED')),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'PUBLISHED' OR (published_at IS NOT NULL AND deleted_at IS NULL))
);
-- +statement
CREATE TABLE IF NOT EXISTS blog_article_tags (
  article_id UUID NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE RESTRICT,
  PRIMARY KEY(article_id,tag_id)
);
-- +statement
CREATE INDEX IF NOT EXISTS idx_blog_public_feed
  ON blog_articles(published_at DESC,id DESC)
  WHERE status='PUBLISHED' AND deleted_at IS NULL;
-- +statement
CREATE INDEX IF NOT EXISTS idx_blog_admin_feed
  ON blog_articles(updated_at DESC,id DESC) WHERE deleted_at IS NULL;
-- +statement
CREATE INDEX IF NOT EXISTS idx_blog_category ON blog_articles(category_id);
-- +statement
CREATE INDEX IF NOT EXISTS idx_blog_tag_links ON blog_article_tags(tag_id);
