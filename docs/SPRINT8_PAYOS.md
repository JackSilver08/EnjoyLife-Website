# Sprint 8 — payOS QR payments (safe opt-in)

## What is implemented

- Customer checkout offers COD (unchanged) or payOS QR when enabled.
- Prices and stock are recalculated and reserved in PostgreSQL; browser totals are never trusted.
- Each order has at most one provider payment attempt and unique numeric payOS orderCode.
- The backend creates signed payment links, returns the official `https://pay.payos.vn/` checkout URL, and customers scan a VietQR on payOS's hosted secure checkout.
- Unpaid order status includes a recovery button and server-verified payment polling, never marking paid merely from returnUrl query parameters.
- Public webhook: `POST /api/payments/payos/webhook`. Next.js forwards to Gin; Gin checks the HMAC-SHA256 signature with the checksum key, payment link ID, unique provider order code, amount and VND currency, then records a deduplicated payment event in PostgreSQL.
- Customer can cancel unpaid checkout only after payOS confirms cancellation; stock is released in a single transaction. Existing Admin/Staff order-status action refuses to bypass payOS cancellation.
- Background reconciliation checks stale links with payOS, confirms late payments and cancels/reclaims expired reservations only after a trustworthy provider response.
- On ambiguous provider errors the order goes to REVIEW_REQUIRED for manual reconciliation; it is never silently recharged or freed.
- Signed webhook test events with an unknown orderCode are ignored without modifying any order.

## Configuration: do not commit or send credentials

The credentials shared in chat should be **rotated before any real deployment**. Put the newly issued keys only in the API's private `.env` (gitignored):

```dotenv
PAYMENT_ENABLED=false
PAYOS_CLIENT_ID=<NEW_PRIVATE_CLIENT_ID>
PAYOS_API_KEY=<NEW_PRIVATE_API_KEY>
PAYOS_CHECKSUM_KEY=<NEW_PRIVATE_CHECKSUM_KEY>
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

Manual pre-release acceptance with a fresh rotated channel and controlled environment must cover: official QR amount matches the order; real webhook arrival; payment completed once; canceled/expired checkout returns stock; delayed/out-of-order webhooks; refunds and reconciliation policy; HTTPS, backups, monitoring, and appropriate legal purchase policies.

## Current scope limits

- The QR is displayed by the official payOS-hosted checkout rather than rendered with a separate QR library inside Enjoy Life.
- A real production domain and verified webhook are required before public use. Do not expose the existing development-only Docker Compose as a payment production server.
- Bank refunds, chargeback disputes and settlement accounting require a separate controlled admin workflow. An unexpected late payment on a canceled order needs manual review before fulfillment.
- A merchant admin should investigate `REVIEW_REQUIRED` attempts; do not manually mark an unpaid payOS order as paid.
- Freight is not yet charged in the checkout total. Do not represent the displayed product subtotal as a shipping-inclusive amount.

## Local verification

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate api web
```

With `PAYMENT_ENABLED=false`, COD remains usable and QR is visibly disabled. See CI for synthetic provider integration results. Preserve volumes (`docker compose down -v` destroys local data).
