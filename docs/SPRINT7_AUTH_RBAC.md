# EnjoyLife Sprint 7 — Staff, Authentication & RBAC

## Delivered in source
- Customer, Staff, and Admin accounts with additive, idempotent PostgreSQL migration. Existing sessions, products, stock, images and orders remain intact.
- Server-side role enforcement: default-deny middleware for every /api/v1/admin/* route and role verification within Go handlers. A hidden UI control is not security.
- ADMIN: all existing operations, plus `/admin/staff` for new staff provisioning, disabling/re-enabling and audited staff password reset.
- STAFF: `/admin/orders` (read and status workflow), `/admin/inventory` (read, receive/issue/count and history), `/admin/catalog` (read-only products) and `/admin/security` (change own password). Staff is denied COD paid, accounts, reports, product editing, CMS, media management and dashboard data.
- Customer accounts keep `/account`, existing orders, and gain password change. Public sign-up is always CUSTOMER; clients cannot select their own role.
- All permissions are checked in Gin API before mutations. Staff stock/order changes write the existing audit records.
- Passwords use bcrypt. Admin creates staff passwords (12–72 characters), can reset them and revoke sessions; staff/customer can change own password by providing the current password. Other sessions are revoked on password change.
- Disabling an account revokes sessions and prevents further login. Invalid email/password attempts for regular login are stored as hashed identifiers in PostgreSQL, limited to 5 in 15 minutes, then locked for 15 minutes. No raw password or recovery token is stored.
- Next.js BFF allows only explicit methods/routes and checks Origin/Sec-Fetch-Site on writes. Frontend staff navigation and unauthorized-screen fallbacks match Go permissions.

## HTTP endpoints
| Method | Endpoint | Access |
| --- | --- | --- |
| GET | /api/v1/admin/staff | ADMIN |
| POST | /api/v1/admin/staff | ADMIN |
| PATCH | /api/v1/admin/staff/:id | ADMIN |
| POST | /api/v1/admin/staff/:id/reset-password | ADMIN |
| POST | /api/v1/auth/change-password | Signed-in account |
| GET | /api/v1/admin/orders, /products, /inventory, inventory history | ADMIN / STAFF |
| PATCH | /api/v1/admin/orders/:no/status | ADMIN / STAFF |
| PATCH | /api/v1/admin/inventory/:id | ADMIN / STAFF |
| POST | /api/v1/admin/orders/:no/paid | ADMIN only |

## Verification and acceptance
- `quality.yml` runs Go tests/vet, PostgreSQL integration tests, Next lint/typecheck/build, Docker Compose and end-to-end HTTP calls through Next proxy.
- New tests: permissions matrix, staff creation/login/disable/enable/reset, rejected privileges, stock and order updates, own password change, failed-login throttling, cross-site admin writes.
- Verify the GitHub Actions status on the *final* commit. Previous green builds do not guarantee later changes have passed.
- **Manual Windows/Edge/mobile acceptance remains necessary:** log in as Admin, create Staff, test Staff on 390/768/1440px, verify unauthorized pages/messages, inspect visual layout and keyboard navigation.
- **Email-based 'forgot password' is not enabled.** It requires verified outbound email service, recovery-token expiry and delivery to verified mailbox. Admin may safely reset *staff* passwords; customer self-service reset without knowing the old password cannot be shipped without a trusted mail channel.

## Run on Windows
```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
docker compose ps
```
For an unmerged feature branch, check it out explicitly before running Docker. Never run `docker compose down -v` on retained data.

## Production safety gates
- Disable local demo admin by setting `ENABLE_DEV_ADMIN=false`, `GIN_MODE=release` and production `APP_ENV`. Avoid using `admin/admin` publicly.
- Existing Docker Compose is development-only, not a production deployment; enforce HTTPS, trusted-proxy cookie security, API/DB private networking, secrets management, backup and restore testing before exposing real customer data.
- Login throttling applies to standard email/password flow. The fixed demo login is development-only and must not be exposed outside the local machine.
- Production CD, third-party email recovery, payment gateways, and public release controls are separately scoped and not silently activated by this Sprint.
