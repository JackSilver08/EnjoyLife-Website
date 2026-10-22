# Sprint 7 — Authentication and staff RBAC (in progress)

## Scope of this increment
- Existing CUSTOMER and ADMIN roles remain intact; migrate accounts to add STAFF and disabled_at.
- Default-deny STAFF permission matrix at Gin API boundary. STAFF may read only orders, products, variants, product images, and warehouse data/history. All write actions remain ADMIN-only.
- ADMIN-only staff management endpoints: GET /api/v1/admin/staff, POST /api/v1/admin/staff, PATCH /api/v1/admin/staff/:id with {"disabled":true|false}.
- Staff password provisioned with bcrypt; 12–72 chars; never included in response. Disabling an account deletes its active sessions and prevents login; admin audit records creation and status changes.
- Public registration is CUSTOMER-only. Staff role cannot be selected by clients.

## Boundaries
- Browser/admin UX for staff management, role navigation, and full staff workflows still need design and acceptance.
- Sensitive reports, customer list, dashboard, CMS, media, payment, and all write operations remain ADMIN-only.
- Current dev admin admin/admin is only for local development and MUST NOT be enabled in production.
- No production CD. Never clear Docker volumes to deploy schema changes.

## Verification
- Run Go unit and integration tests, frontend lint/typecheck/build, and Docker E2E with disposable PostgreSQL.
- Test 401 guest, 403 customer, 200 allowed STAFF reads, 403 disallowed STAFF writes and sensitive reads, ADMIN can create/deactivate/restore staff, disabled sessions rejected.
- Sprint is not finished until CI passes and browser acceptance is completed.
