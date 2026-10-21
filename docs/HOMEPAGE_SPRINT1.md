# Sprint 1 — Homepage Editorial Storytelling (Enjoy Life)

## Delivered
- Reuse the original full-width fashion campaign Hero and headline.
- Both Hero CTA and scroll indicator link to `/#our-story` without a JavaScript scroll handler.
- Story section `#our-story`: brand philosophy, lifestyle photo and anchor leading into the shopping section.
- Featured products `#featured-products`: up to 4 real items from the current Go catalog API (no hardcoded fake product prices or stock).
- Enjoy Journal `#journal` replaces Lookbook. Three **clearly marked planned article topics** are visual previews only; not published posts, with no misleading dates or links to imaginary article pages.
- New `/blog` landing page supports the future CMS work without returning 404; set to noindex until actual articles are published.
- Contact `#contact` replaces AI promotional block; a new `/contact` page is available.
- Header and Footer now link to Journal, Story, Contact, Shop, account and cart. Mobile navigation opens and closes with accessible controls.
- Responsive, anchor offsets for sticky header, keyboard focus and reduced-motion support.

## Contact configuration
In `.env`, add `CONTACT_EMAIL=your_verified_shop_email@example.com` when the official store email is confirmed. `compose.yaml` passes **only this public value** to Next.js. Restart the web service with `docker compose up -d --force-recreate web`. If unset, the site discloses that official contact details are pending, rather than inventing a phone/email or accepting a message it cannot deliver.

## Release checks
- Homepage section order: Hero → Story → Products → Enjoy Journal → Contact → Footer.
- Hero CTA scrolls to Story under the sticky header; Story CTA scrolls to the product section.
- /blog and /contact respond 200 and provide clear non-misleading information.
- Shop, product detail, cart, checkout and Admin continue working.
- Responsive 360px/768px/desktop, reduced motion, keyboard navigation.
- CI production build, lint, typecheck and page route smoke checks.
- No CMS, article CRUD, article detail pages or "published" demo posts in this sprint — that starts in Sprints 2–4.
