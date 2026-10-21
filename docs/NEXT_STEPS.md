# Enjoy Life — suggested Sprint 0 → Sprint 1

## Completed (starter)
- Next.js App Router storefront visual direction, responsive desktop/mobile
- Go Gin API with PostgreSQL catalog and inventory variant rows
- Transactional COD checkout with server-side price + available stock verification, reservation record
- Docker Compose, development batch launchers, seed database, smoke test script prerequisites

## Do next, in priority order
1. **CI and reproducibility**: run `go mod tidy` and `npm install`, commit `go.sum` and `package-lock.json`, execute CI build/test; add integration test with disposable Postgres.
2. **Brand assets**: replace Unsplash sample references with commercially licensed Enjoy Life imagery and official brand guideline.
3. **Authentication/RBAC**: secure admin login with server-side sessions, access controls enforced by Go; customer profiles/registered checkout as a separate flow.
4. **Order lifecycle**: confirmed/preparing/shipped/delivered/cancelled, reservation release, stock movement at dispatch, returns, audit and idempotent state transitions.
5. **Online payment**: payOS merchant registration and sandbox testing; signed checkout links; verified webhook; replay defense; return-URL never treated as payment proof; transaction reconciliation and expiry handling.
6. **Admin functions**: product/variant CRUD, inbound/outbound stock, sales dashboard, alerts, return management, CMS-lite landing assets.
7. **AI**: customer LLM+tool calls, catalog and policy whitelist; Admin tool registry only after full RBAC and KPI contracts.
8. **Operations**: deployment profile, HTTPS proxy, backups with restore testing, secret rotation, observability, failure drills.

## UX acceptance checks
- Navigation and checkout work on 360px/390px/768px/1024px/1440px widths.
- Reduced motion respected, keyboard focus visible, all forms labeled.
- Shopping CTA visible without excessive animation. Price/availability shown clearly.
- Loading, missing API, out-of-stock and payment-not-ready states have explicit feedback.

## Deployment contract
The `compose.yaml` delivered is **local development only**. Before public release build production images, remove port exposure for DB/API, add HTTPS at edge, protect admin with real roles, configure backups and use a managed secret store.
