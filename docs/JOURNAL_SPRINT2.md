# Enjoy Life — Sprint 2: Enjoy Journal PostgreSQL & Go API

## Scope
Sprint 2 implements backend and persistence. It intentionally **does not implement the rich-text editor UI, public blog article pages, media upload or Admin blog UI** (Sprints 3–4). No seeded or pretend published articles are inserted. The Sprint 1 `/blog` page continues to identify its cards as upcoming topics, not published articles.

## Migration
- Versioned SQL is embedded into the API binary at `apps/api/internal/handlers/migrations/006_blog.sql`.
- `EnsureBlogSchema` runs on **every** API boot, after users/audit initialization, with a transaction and advisory lock. It handles existing PostgreSQL Docker volumes without `down -v`.
- Tables: `blog_categories`, `blog_tags`, `blog_articles`, `blog_article_tags`. Indexes optimize published feed and admin review.
- Article fields: permanent unique slug, title, excerpt, TipTap-compatible `content_json` (JSONB document, not HTML), cover URL/alt, meta title, meta description, OG image, status, author and last editor, version, published/created/updated timestamps, soft deletion timestamp.
- Foreign keys reference real users and article taxonomy. Article archives preserve history and reserve the slug; they do not physically delete articles.

## Status and authoring rules
- `DRAFT` never appears in public feed or public detail, even if the slug is known.
- `PUBLISHED` is returned only when `published_at <= now()` and `deleted_at IS NULL`.
- Only logged-in `ADMIN` users can create/edit/list drafts/publish/archive; the Go backend checks the session and role on every route.
- Publishing needs an excerpt of 20+ characters and at least 20 text characters in a structured content document. Empty drafts are fine.
- Valid slugs use `[a-z0-9-]` with no leading, trailing or repeated separator. Slugs must be unique, including archived articles.
- Images must use HTTPS URL and cover images require alt text. No direct file-upload endpoint in Sprint 2.
- Every modifying article/taxonomy action is performed transactionally and logged in `admin_audit_logs`.
- Full article replacement uses `expected_version` for optimistic concurrency. A stale update returns HTTP 409 rather than silently overwriting another editor's changes.
- Publication is reversible: return to `DRAFT` to hide from the public API. Archive is a soft-delete; restore is not implemented in this sprint.
- Never interpret article JSON as trusted HTML. In Sprint 4, render it with a strictly allowlisted component serializer and URL sanitizer to avoid XSS.

## HTTP API reference
All paths below are relative to `/api/v1` on Go; browser clients use the equivalent `/api/store/` Next.js proxy.

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/blog/articles?limit=12&offset=0&category=&tag=` | Public | Published-only list with `items,total,limit,offset` |
| GET | `/blog/articles/:slug` | Public | One published article including `content_json`; 404 for drafts |
| GET | `/blog/categories` | Public | Category list |
| GET | `/blog/tags` | Public | Tag list |
| GET | `/admin/blog/articles?status=ALL&limit=12&offset=0` | Admin | All nonarchived articles, including drafts |
| GET | `/admin/blog/articles/:id` | Admin | Article with editor document |
| POST | `/admin/blog/articles` | Admin | Create a draft or valid published article |
| PUT | `/admin/blog/articles/:id` | Admin | Full replacement with `expected_version` |
| PATCH | `/admin/blog/articles/:id/status` | Admin | Publish/unpublish with `status`, `expected_version` |
| DELETE | `/admin/blog/articles/:id` | Admin | Archive with JSON body `{"expected_version":2}` |
| POST | `/admin/blog/categories` | Admin | Create category |
| POST | `/admin/blog/tags` | Admin | Create tag |

### Example: category and tag
```json
{"slug":"phong-cach","name":"Phong cách","description":"Gợi ý phối đồ"}
```
```json
{"slug":"toi-gian","name":"Tối giản"}
```

### Example: create draft
```json
{
  "slug":"cach-phoi-do-thuong-ngay",
  "title":"Gợi ý phối đồ thường ngày",
  "excerpt":"Lựa chọn những món đồ dễ phối cho một ngày thoải mái.",
  "content_json":{
    "type":"doc",
    "content":[{"type":"paragraph","content":[{"type":"text","text":"Đây là phần mở đầu bài viết với các gợi ý phối đồ đơn giản và dễ áp dụng."}]}]
  },
  "category_slug":"phong-cach",
  "tag_slugs":["toi-gian"],
  "cover_image_url":"",
  "cover_image_alt":"",
  "seo_title":"Cách phối đồ thời trang hằng ngày",
  "seo_description":"Ý tưởng lựa chọn trang phục dễ mặc và có phong cách cho cuộc sống thường nhật.",
  "og_image_url":"",
  "status":"DRAFT"
}
```

The body for a full `PUT` is the same as creation plus `"expected_version":1`. A status change uses:
```json
{"status":"PUBLISHED","expected_version":1}
```

Use the `version` in each successful API response to perform subsequent modifications. SEO canonical URL will be constructed from the website base URL and `slug` when the public article page is implemented, not from untrusted arbitrary HTML.

## QA and rollout
- `git pull origin main`; back up your existing PostgreSQL volume before deployment.
- `docker compose up -d --build --force-recreate api web` to restart Go and apply migration.
- `docker compose logs api --tail=80` for errors. Health remains `/api/v1/health`.
- CI runs Go tests/vet, Next.js typecheck/lint/build, login regression and PostgreSQL integration of draft secrecy, Admin RBAC, tags, publish/update/unpublish/archive, version conflicts, audit logs and existing COD orders.
- There is no direct Admin blog editor screen yet; that is **Sprint 3**, and public article rendering is **Sprint 4**.

## Future work
Sprint 3: Admin Blog list, article editor (Tiptap), taxonomies, drafts, publishing, media upload strategy and SEO forms. Sprint 4: real feed replaces concept cards, article detail pages and safe renderer, metadata/OpenGraph/canonical/sitemap and indexing eligibility when the site goes live.
