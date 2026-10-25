# Render + Supabase media persistence

The Go API saves **new** Admin Media Manager uploads and ZIP-import images into
the existing public Supabase Storage bucket `enjoylife-media`. Metadata remains
in PostgreSQL. Existing product and media records are retained.

## Production setup (required)

Set on the Render **enjoylife-api** service, never on the frontend:

- `SUPABASE_URL`: HTTPS project URL (e.g. `https://<project>.supabase.co`).
- `SUPABASE_SECRET_KEY`: private backend API key from Supabase Settings > API Keys
  (or alternatively `SUPABASE_SERVICE_ROLE_KEY` for a legacy service-role key).

Do not paste keys into ChatGPT, push them to GitHub, or expose them as
`NEXT_PUBLIC_*`. The bucket must be public for image reads, not public for
unrestricted uploads. Backend Admin authentication is required for uploads.

On production/Render, the API rejects uploads with HTTP 503 if Storage
credentials are absent rather than accepting files into ephemeral disk.

## Deploy verification

1. Back up PostgreSQL and copy existing Supabase Storage content before changes.
2. Configure secrets in Render > enjoylife-api > Environment.
3. On /admin/media upload a fresh JPG and verify it returns an HTTPS Supabase URL.
4. Confirm it loads, restart the API, and confirm it continues to load.
5. Test uploading a ZIP and importing CSV (newest cloud-backed image wins).
6. Check product, blog, gallery, hero and story content.
7. Inspect Render logs and GitHub Actions Quality checks.

## Old data

Legacy `/media/UUID.ext` references remain unchanged. They can still be
served from available local media, or from a file uploaded to the same filename
in the bucket. **Eight old product images currently lack verified original
files**. This code change does not invent, replace or delete their photos.
Current Supabase product URLs are retained. Old `media_assets` records
automatically default to `storage_provider='local'` and new records are
marked `supabase`. No product, order or stock rows are deleted.

Development without Supabase credentials retains Docker volume
`enjoy-life_media_data`; do not run `docker compose down -v`.

## Availability

Next.js continues to launch via `npm run start` / `next start`, now without
the conflicting standalone option. Web health is `/api/health`; backend
health is `/api/v1/health`. Free Render sleeping cannot be eliminated by
the media migration, and payments/webhooks may need always-on hosting.
