# Sprint 8 — payOS QR payments (safe opt-in)

## What is implemented

- Customer checkout offers COD (unchanged) or payOS QR when enabled.
- Prices and stock are recalculated and reserved in PostgreSQL; browser totals are never trusted.
- Each order has at most one provider payment attempt and unique numeric payOS orderCode.
- The backend creates signed payment links and returns the official `https://pay.payos.vn/` checkout URL; customers can scan VietQR directly on the order page through payOS's official embedded Checkout Script.
- Unpaid order status includes a recovery button and server-verified payment polling, never marking paid merely from returnUrl query parameters.
- Public webhook: `POST /api/payments/payos/webhook`. Next.js forwards to Gin; Gin checks the HMAC-SHA256 signature with the checksum key, payment link ID, unique provider order code, amount and VND currency, then records a deduplicated payment event in PostgreSQL.
- Customer can cancel unpaid checkout only after payOS confirms cancellation; stock is released in a single transaction. Existing Admin/Staff order-status action refuses to bypass payOS cancellation.
- Background reconciliation checks stale links with payOS, confirms late payments and cancels/reclaims expired reservations only after a trustworthy provider response.
- On ambiguous provider errors the order goes to REVIEW_REQUIRED for manual reconciliation; it is never silently recharged or freed.
- Signed webhook test events with an unknown orderCode are ignored without modifying any order.

## Configuration: do not commit or send credentials

Credentials previously posted in a chat are potentially exposed. **Strongly recommend rotating the API and checksum keys before enabling real payments.** If the merchant chooses to continue using the existing keys, this does not eliminate the exposure risk. Never publish or commit any of the keys; configure them only in the API's private `.env` (gitignored):

```dotenv
PAYMENT_ENABLED=false
PAYOS_CLIENT_ID=<PRIVATE_CLIENT_ID>
PAYOS_API_KEY=<PRIVATE_API_KEY>
PAYOS_CHECKSUM_KEY=<PRIVATE_CHECKSUM_KEY>
WEB_ORIGIN=https://your-public-store-domain.example
```

After HTTPS, valid TLS and publicly reachable webhook are configured and tests pass, change `PAYMENT_ENABLED=true` and restart the API. Client ID, API key and checksum key are server-side only: never in a Next.js `NEXT_PUBLIC_` variable, git commit, URL, browser or screenshot.

### Register the webhook

In [my.payos.vn](https://my.payos.vn) for the created website payment channel, enter:

```text
https://your-public-store-domain.example/api/payments/payos/webhook
```

If using payOS `POST /confirm-webhook` instead, do so privately from a server after the public HTTPS endpoint is online. payOS sends a signed test payload; do not confuse it with a real paid order. **localhost:3000 is not publicly reachable**, so local development alone cannot fully validate remote webhook delivery.

### Do not run real-money tests in CI

CI uses synthetic merchant identifiers with a local `httptest` provider and disposable PostgreSQL. No CI job sends a request with live keys to payOS, creates a real bank transfer or changes the channel in my.payos.vn.

Manual pre-release acceptance with a protected payment channel and controlled environment must cover: official QR amount matches the order; real webhook arrival; payment completed once; canceled/expired checkout returns stock; delayed/out-of-order webhooks; refunds and reconciliation policy; HTTPS, backups, monitoring, and appropriate legal purchase policies.

## Current scope limits

- The QR is displayed through **payOS's official embedded Checkout Script** on the Enjoy Life order page, without generating or editing bank QR data in a third-party service. If that script is unavailable, the customer can use the official payOS-hosted checkout fallback.
- The payOS script is loaded from `https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js` per official payOS documentation. Production CSP must allow this script and payOS frame endpoints. Browser SDK success/cancel callbacks only trigger a server-side status refresh; they never mark the order paid.
- A real production domain and verified webhook are required before public use. Do not expose the existing development-only Docker Compose as a payment production server.
- Bank refunds, chargeback disputes and settlement accounting require a separate controlled admin workflow. An unexpected late payment on a canceled order is explicitly marked `REVIEW_REQUIRED`, leaves the order canceled, and needs manual review before any refund or fulfillment.
- A merchant admin should investigate `REVIEW_REQUIRED` attempts; do not manually mark an unpaid payOS order as paid.
- Freight is not yet charged in the checkout total. Do not represent the displayed product subtotal as a shipping-inclusive amount.

## Local verification

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
```

With `PAYMENT_ENABLED=false`, COD remains usable and QR is visibly disabled. See CI for synthetic provider integration results. When enabled, choosing payOS directs customers to the order page; click **HIỂN THỊ MÃ QR** to embed the official payOS checkout, or use the hosted fallback link. Preserve volumes (`docker compose down -v` destroys local data).

## Sprint 8 financial safety regression checks

- Integration tests use an isolated PostgreSQL schema and fake payOS HTTPS checkout links, never the live merchant keys.
- A signed success webhook marks a pending payOS order paid once, even if delivered twice.
- A correctly signed transaction with the wrong amount, or a provider-reported partial/overpayment, is flagged for manual review and cannot generate a second QR checkout link. Verified unusual transfers and server-side payment checks are retained in the audit log.
- Money received after a successfully canceled order never reactivates fulfillment or reserves stock again; the order remains canceled and payment becomes `REVIEW_REQUIRED`.
- Direct payOS status polling and the background reconciler use an order-row lock to avoid racing with cancellation.
- The administrator sees `REVIEW_REQUIRED` explicitly, and processing actions are hidden for unpaid payOS orders.
- Never infer payment success from the `returnUrl` query string or browser redirect alone.

## Sprint 8.1 — payOS disabled on local checkout

A gray payOS option with *"Chưa bật kênh payOS"* means the running **API container** has not loaded all four local settings: `PAYMENT_ENABLED=true`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`. Code committed to GitHub cannot populate the untracked local `.env` automatically.

In PowerShell from the repository root, run the **interactive local setup**:

```powershell
git switch main
git pull origin main
.\scripts\configure-payos.ps1
```

The script asks for the payOS keys using masked local terminal prompts, writes only to the gitignored project-root `.env`, sets `WEB_ORIGIN=http://localhost:3000` for local testing, and recreates the API container. Do not paste keys into GitHub, CI logs, screenshots, or a public `NEXT_PUBLIC_` variable. Since the previously shared keys were exposed in chat, rotating them is still recommended.

To view a **non-sensitive status only**:

```powershell
Invoke-RestMethod http://localhost:3000/api/store/payments/config
```

Expected after a properly configured local API: `payos_enabled: true`, `status: enabled`. Other statuses: `disabled`, `missing_configuration`, `invalid_origin`. Do not treat `enabled` as evidence that an actual bank payment or webhook has been verified.

**Localhost limitation**: payOS supports local return URLs for developing checkout flows, but cannot deliver an internet webhook to localhost. To receive external webhook notifications, deploy to a public HTTPS host (or a controlled HTTPS tunnel), register `https://<your-domain>/api/payments/payos/webhook` in the payOS channel, and verify with a low-value authorized payment. Only then enable public ordering.

## Sprint 8.1 — updating Admin order statuses

The order management page now provides a **next-state dropdown and an explicit Update button**. Order state must advance in sequence:
`PENDING_CONFIRMATION → CONFIRMED → PREPARING → SHIPPING → DELIVERED → COMPLETED`.
For COD, cancellation is available before shipping; payment collection can be confirmed after delivery. For payOS, unpaid orders may **not** be fulfilled; merchant must wait for an authenticated payment signal. Invalid transitions display an inline error on the affected order row.

The CI regression goes through Next.js `/api/store/admin/orders/:no/status`, Gin, and disposable PostgreSQL; it tests the actual browser proxy rather than only calling Gin handlers directly. For a local environment that still fails, inspect the row's specific error, then use `docker compose logs --tail=100 api web`; update the source and recreate containers without deleting the PostgreSQL data volume.

### If local payOS setup ends with HTTP 503

An API container displaying `Started` is **not yet healthy**. The Go development command compiles after container startup. Calling the Next.js BFF immediately can return HTTP 503 until Gin accepts requests. This is not proof that payOS credentials are invalid.

The Windows setup script now waits for the API to become **HEALTHY** using `docker compose up --wait api`, then checks the direct API and website proxy separately.

If your keys were already saved, **do not re-enter them**. To retry the checks without editing `.env`:

```powershell
docker compose up -d --wait --wait-timeout 180 api
.\scripts\configure-payos.ps1 -CheckOnly
```

You can also check the two endpoints manually:

```powershell
Invoke-RestMethod http://localhost:8081/api/v1/payments/config
Invoke-RestMethod http://localhost:3000/api/store/payments/config
```

If the direct API fails, run `docker compose ps` and `docker compose logs --tail=80 api`. If direct API succeeds and proxy fails, run `docker compose up -d --wait web` and `docker compose logs --tail=80 web`. Redact credentials, personal data, and URLs containing private order tokens before sharing any log. A `payos_enabled: true` response only confirms configuration, **not** the validity of the merchant keys with payOS or receipt of money.
