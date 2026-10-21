# Enjoy Life — UX/UI refactor v0.2

## Delivered
- Storefront shell isolated from the admin preview route group.
- Public admin navigation removed; dev-only admin Basic Auth preview gate in `src/proxy.ts`. This is **not** production authentication.
- Homepage reduced to campaign, categories, featured products, lookbook, AI introduction and footer.
- Shop filters by category, searches catalog and sorts by price.
- Product card removes the decorative ranking index; shows sold-out status from API data.
- PDP provides variation stock messaging, a transparent size-guide notice and policy link.
- Added public policy disclosure page. No unverified shipping terms, measurements or payment claims.
- Backend catalog returns category slug and SKU availability aggregates.

## Test/validation plan
Run `cd apps/web && npm install && npm run typecheck && npm run lint && npm run build`.
Run `cd apps/api && go test ./... && go vet ./...`.
Run `docker compose up --build -d` and inspect /, /shop, /products/everyday-oxford, /cart, /checkout and /policies.
Set ADMIN_PREVIEW_USER and ADMIN_PREVIEW_PASSWORD **only in development** to view /admin.
Manual smoke tests: search, category filters, ascending/descending sort, sold-out variants, cart, COD checkout, mobile and keyboard navigation.

## Go-live blockers
Admin is a design preview only. No production login / RBAC yet.
AI and payOS are not enabled. No validated size chart, variant-level photography, final fulfillment fees or return-policy SLA.
Do not publish this demo as a real shop or accept customer payments before these modules and policies are completed.
