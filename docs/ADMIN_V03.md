# Enjoy Life Admin v0.3 — localhost operations

## Startup
1. Update the repository: `git pull origin main`
2. Copy `.env.example` to `.env` if necessary. Set `APP_ENV=development`, `GIN_MODE=debug` and `ENABLE_DEV_ADMIN=true` in `.env` for local login. **Never expose the development stack to the Internet**. Default Compose values disable the demo account.
3. Start: `docker compose up --build -d`
4. Open `http://localhost:3000/admin/login`. The local demonstration username is `admin` and its password is `admin`.
5. Credentials are checked only in the Go backend when `APP_ENV=development`, `GIN_MODE=debug` and `ENABLE_DEV_ADMIN=true`. Production must disable all three conditions and use strong admin accounts.

## Operational modules
- Dashboard: data directly from PostgreSQL, order value explicitly **not** called revenue.
- Orders: pending confirmation → confirmed → preparing → shipping → delivered → completed. Cancellation is supported before shipping; inventory reservation is released. Shipping consumes actual inventory and reservation in a single DB transaction. COD collected can be confirmed after delivery.
- Inventory: SKU stock levels and adjustments (reason mandatory, cannot decrease below committed stock). Stock movements and admin audit trail are persisted.
- Products: view all, create a product with one initial SKU and opening stock, edit its name/description/collection/publish state. Further size/color SKUs, changes to prices and SKU status are available; photo galleries still need work.
- Customers: registered account list; guest customers remain visible through orders.
- Reports: payment-confirmed totals, uncollected orders, 7-day order value summary (not formal accounting).
- Authentication: HttpOnly session cookie, role checks both at Next.js protected layout and Go API handlers, logout removes server-side session.

## Existing database
The API will ensure the accounts and audit table exist on startup. No destructive `docker compose down -v` is required for this upgrade. Back up the database before applying changes to important data.

## Not yet production ready
Local demo credentials are intentionally weak. There is no full RBAC, order shipment tracking provider integration, return processing, verified payment gateway, AI integration or accounting-grade reporting. The stock adjustment and order status flows need end-to-end tests with live PostgreSQL before real commerce. Never promote demo accounts or volumes to public production.

## CI validation
GitHub Actions runs TypeScript checks, ESLint, Next.js production build, Go tests/vet, and disposable PostgreSQL integration covering dev login, product and SKU creation, stock adjustment, COD order progression, payment and logout.
