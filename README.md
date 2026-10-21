## Homepage redesign — Sprint 1

The customer-facing Homepage now guides visitors through Hero → Story → Products → Enjoy Journal → Contact. The Journal cards are **upcoming content concepts**, not published articles. Add a verified `CONTACT_EMAIL` to `.env` when available. See [Sprint 1 notes](docs/HOMEPAGE_SPRINT1.md).

### Local Admin login: configuration check
For local development only, set these lines in `.env`:
```dotenv
APP_ENV=development
GIN_MODE=debug
ENABLE_DEV_ADMIN=true
```
The API container reads these flags directly from `.env` via `env_file`; `compose.yaml` no longer overrides them with `production/release/false` defaults. Run `docker compose up -d --build --force-recreate api web`, then `docker compose exec api env | Select-String "APP_ENV|GIN_MODE|ENABLE_DEV_ADMIN"` on Windows PowerShell. The three flags must match exactly before the `admin / admin` **local-only** login can work at `http://localhost:3000/account`. Never use demo credentials on public servers.

## Admin v0.3 quick start

Visit http://localhost:3000/account after enabling APP_ENV=development, GIN_MODE=debug and ENABLE_DEV_ADMIN=true in .env. Local-only demo credentials: admin / admin. This is not a production password. See [Admin operations guide](docs/ADMIN_V03.md).

# Enjoy Life — Fashion Commerce & AI Starter (v0.1)

> Next.js 16 / React 19 / TypeScript · Go (Gin) · PostgreSQL 17 · Docker Compose.
>
> **Starter prototype, NOT ready for live sales.** Demo product photos/prices/stock are fictitious, checkout COD is functional for local tests only. Online payments and LLM AI are disabled until verified external integration and security review.

## 1. What you can do now

- Artistic editorial landing page, responsive header/footer, Shop, Search, Product detail, About.
- Products/variants/prices/availability are read from PostgreSQL through the Go API (not invented by AI).
- Local cart with size/color selection and quantity controls.
- COD checkout: backend validates buyer/item data, obtains DB row locks, checks inventory, creates order, reserves stock, writes a movement log, returns a non-guessable order lookup token.
- Read-only order confirmation by secure random token.
- Đăng ký/đăng nhập bằng email và mật khẩu băm bcrypt; phiên đăng nhập dùng cookie HTTP-only trong 30 ngày.
- Tài khoản xem được các đơn đã đặt khi đăng nhập; đơn COD mới tự liên kết với tài khoản đó.
- Trang quản trị yêu cầu vai trò `ADMIN`, hiển thị người dùng và các đơn gần đây từ PostgreSQL. Chatbot AI vẫn chỉ là phần giữ chỗ.
- Docker Compose with Postgres seeded data, healthcheck, schema and starter tests.
- Ready-to-extend payment gateway interfaces and AI endpoints, but **no actual online payments yet**.

## 2. Prerequisites on Windows 10/11

1. Install **Docker Desktop**: https://www.docker.com/products/docker-desktop/ . Enable WSL2 backend when requested.
2. Open Docker Desktop and wait until the engine is running.
3. Recommended: Git and VS Code. Node.js / Go **do not need to be installed locally** when using Docker, but are useful for local debugging.
4. Internet connection required on first start to pull Docker images and download npm/Go dependencies.
5. Use PowerShell in the extracted project folder: `powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1`.

## 3. Run with Docker (recommended)

```powershell
Copy-Item .env.example .env
# Edit .env only if you want to change dev DB credentials; keep payment disabled.
docker compose up --build --wait
docker compose ps
docker compose logs -f --tail=100
```

Or double-click **START.bat**. First startup takes longer as images and dependencies download.

- Website: http://localhost:3000
- Shop: http://localhost:3000/shop
- Tài khoản: http://localhost:3000/account
- Quản trị: http://localhost:3000/admin (chỉ tài khoản quản trị)
- Go API: http://localhost:8081/api/v1/health
- Catalog JSON: http://localhost:8081/api/v1/products
- Postgres from your PC: localhost:5433 (the database is otherwise private to the Compose network).

To stop: `docker compose down` or **STOP.bat**. Data persists in `postgres_data` volume.

**IMPORTANT**: `docker compose down -v` **deletes the PostgreSQL database and all orders.** Only use this to reset expendable local demo data.

### First-start troubleshooting

- `docker: command not found`: Docker Desktop/CLI missing, or terminal needs reopening.
- `Cannot connect to Docker daemon`: Open Docker Desktop.
- `port is already allocated`: Check ports 3000, 8081, 5433. Edit Compose port mapping on host side.
- `API db_unavailable`: `docker compose logs db api` and wait for Postgres initialization.
- `npm` / `go` download error: Check Internet, firewall, DNS and proxy configuration for Docker containers.
- `no such table`: init scripts only execute on an empty DB volume. Inspect `docker compose logs db`; reset demo volume only if its data is disposable.
- Backend source changed: `docker compose restart api` to rebuild Go on restart. Nếu vừa thêm route/page mới, chạy thêm `docker compose restart web`.

### Tài khoản quản trị phát triển

Khi API khởi động, nó tạo (hoặc nâng quyền) tài khoản được khai báo trong `.env`. Với cấu hình mẫu, đăng nhập tại `/account` bằng `admin@enjoylife.local` và `dev_admin_change_me`, sau đó mở `/admin`. **Đổi cả hai giá trị trước khi triển khai ở bất cứ môi trường công khai nào.**

Nếu cơ sở dữ liệu đã được tạo từ phiên bản cũ, áp dụng migration tài khoản một lần:

```powershell
docker compose exec -T db psql -U enjoylife -d enjoylife -f /docker-entrypoint-initdb.d/004_accounts.sql
docker compose restart api web
```

## 4. Project map

```text
enjoy-life-starter/
├── START.bat / STOP.bat
├── compose.yaml / .env.example
├── apps/
│   ├── web/                # Next.js App Router / editorial storefront
│   │   ├── src/app/        # pages, checkout, order status, narrow API proxy
│   │   ├── src/components/ # product card, cart provider, picker, navigation
│   │   └── src/lib/        # DTOs / data fetching / currency formatting
│   └── api/                # Go Gin service
│       ├── cmd/server/
│       ├── internal/       # config, handlers, payment interface, store rules
│       └── db/init/        # schema and demo seed data
├── docs/                   # roadmap / capabilities / security notes
└── scripts/check.ps1
```

## 5. API endpoints

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/v1/health` | Checks DB readiness |
| GET | `/api/v1/products?q=...` | Public, published catalog |
| GET | `/api/v1/products/:slug` | Public product + current variants |
| POST | `/api/v1/auth/register` | Creates a customer account and session |
| POST | `/api/v1/auth/login` / `/auth/logout` | Starts or terminates the current session |
| GET | `/api/v1/auth/me` / `/account/orders` | Current user and that user's order history |
| POST | `/api/v1/orders` | COD only; reserves selected SKUs in a DB transaction |
| GET | `/api/v1/orders/:token` | Guest lookup via private random token |
| GET | `/api/v1/policies` | Placeholder policies; **not official** |
| POST | `/api/v1/ai/customer` | 501 until LLM integration is completed |
| GET | `/api/v1/admin/summary`, `/admin/orders`, `/admin/users` | Requires a signed-in `ADMIN` account |

**For test orders**: enter sample contact details only. Do not expose to the Internet, enter real customer data, or send real money using this code.

## 6. Run without Docker (advanced)

Requires locally installed Postgres 17, Go >=1.25, Node >=20.9 (Next 16), and Internet for dependency setup.

1. Create database using SQL files in `apps/api/db/init` in sorted order.
2. API: `cd apps/api; go mod tidy; $env:DATABASE_URL='postgres://...'; go run ./cmd/server`.
3. Web: `cd apps/web; npm install; Copy-Item .env.local.example .env.local; npm run dev`.
4. Use `go test ./...`, `npm run typecheck`, `npm run lint`, `npm run build` after downloads.
5. Commit the generated `go.sum` and `package-lock.json` when dependencies are first resolved to lock the dependency graph.

## 7. Important limitations / production gates

- **Accounts and the read-only admin overview are implemented for local development.** Password reset, email verification, rate limiting, audit logs, role management UI, refunds and shipment workflow are not yet implemented.
- **PAYOS intentionally returns 501** even if credentials are accidentally entered. Do not flip an environment variable to attempt to take payments. Implement/verify signature, payment states, idempotency, timeouts, reconciliation, cancellation and refund handling before activation.
- **COD demo order reservation exists; shipment, cancellation, expiry and reserve release do not.** Until these are implemented and tested, do not run the checkout against real stock.
- The bootstrap administrator and local HTTP cookie setup are for development only; add HTTPS-only cookies, password reset/verification, rate limits and audit logs before production.
- Browser cart prices are indicative; actual checkout price is always calculated from Postgres.
- Cart may show stale stock; server rejects insufficient inventory with HTTP 409.
- No AI model calls are performed. Both shopper assistant and Admin AI require tool whitelists, server-side keys, roles, prompt-injection controls and evaluation.
- External Unsplash images are sample visuals, require brand-approved assets/licensing before public use. Images may not render offline.
- `robots: noindex` is set globally to avoid search indexing of prototype pages. Adjust only when ready to launch.
- Delivery fees, return policy, terms and contact information are placeholders, not legal/business promises.
- Development DB password is intentionally weak and cannot be used publicly.
- Security, backup, TLS, monitoring, deployment secrets and migrations must be completed before production.

## 8. Sources and compatibility notes

- Next.js installation: https://nextjs.org/docs/app/getting-started/installation (Node.js >=20.9)
- Docker Next.js guide: https://docs.docker.com/guides/nextjs/
- payOS docs: https://payos.vn/docs/api/

This archive ships **source and manifests**, not pre-downloaded `node_modules`, Go module cache, Postgres image or Docker Desktop installer. First launch will fetch them on your own computer (Internet required). The current authoring environment could not access package registries or run Docker, so a complete container build has NOT been verified here.
