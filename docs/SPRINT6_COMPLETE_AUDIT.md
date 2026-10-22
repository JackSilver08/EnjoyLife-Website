# Enjoy Life — Sprint 6 (Product Catalog 2.0) — Technical Audit and Acceptance

Date: 2026-10-22. Scope: Sprint 6.1–6.4 plus Product ↔ Inventory integration.

## 6.1 Product authoring / CMS
- Product name generates a Vietnamese-compatible URL slug, editable by Admin.
- SKU is generated on the Go/PostgreSQL side; the create form does not expose it.
- Removed collection field from the authoring UI; existing database column and older CSV data remain compatible.
- Compact two-column form, direct photo upload/Media Manager selection, optional description; products created hidden.
- Soft-delete with Trash and restore hidden; historic orders and inventory preserved.

## 6.2 Variants and warehouse
- Per-SKU color, size, price, active state, available stock, and configurable low-stock threshold.
- Reject duplicate product/color/size combinations at database level.
- Editing an ordered SKU's color/size is disallowed to preserve historic order meaning.
- Product “View inventory” links to /admin/inventory?product=PRODUCT_UUID.
- Warehouse list links back to /admin/products?edit=PRODUCT_UUID.
- Warehouse view includes archived and inactive items when toggled; these items are not published or orderable.
- Operations: RECEIVE, ISSUE, COUNT; quantity and reason validated server-side.
- Stock movements and Admin audit logs persist. Do not decrement below reserved/unavailable stock.
- Inventory reads by variant ID. No duplicate stock table or independent frontend counter.

## 6.3 Gallery and images
- Each product supports up to 12 ordered images; first image is cover.
- Admin supports upload (image optimization and WebP where smaller), Media Manager reuse, ordered thumbnails, alt text, remove from album, and save.
- Storefront detail supports thumbnails, previous/next, large view, Escape and arrow-key navigation.
- Files remain in the media volume when removed from the product gallery.

## 6.4 Storefront catalog
- Server-side category, color, size, price range, search, sort, and pagination.
- Filter combinations must apply to the *same in-stock SKU*; the shown price reflects the matched variant rather than unrelated cheaper variants. Regression test in Docker E2E.
- Cart selection uses the concrete variant ID; Go checks published/active product and available inventory again under a database transaction when creating an order.
- Responsive layouts and accessibility controls are maintained; manually verify Edge on Windows and mobile widths before commercial release.

## CI and deployment limits
- GitHub Actions `.github/workflows/quality.yml` runs Go tests/vet, Next.js lint/typecheck/build, Docker dev volume checks and E2E using disposable data.
- These jobs validate code and Docker integration; **there is no automatic production deployment workflow** in the current repository. Do not describe CI success as a production deploy.
- Existing Docker deployment on user PC remains manual. Back up DB and media before future production releases; never use `docker compose down -v` on retained environments.
- User acceptance checks: (1) create product hidden; (2) add size/color and check unique SKU; (3) receive stock and verify both Admin screens; (4) filter Shop by selected size/color and verify price; (5) add images; (6) order one SKU and verify reserve/ship accounting; (7) archive/restoration; (8) view movement history.
- Payment gateway, staff RBAC, AI, and production infra are **out of Sprint 6** and remain in the later roadmap.
