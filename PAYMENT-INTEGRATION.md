# Full-payment integration — pending merchant onboarding

Current release is a front-end scaffold, not an order backend. The product context is allowlisted; no amount/currency/order status is accepted from URL parameters. Direct WeChat/Alipay checkout remains disabled. Existing manually verified QR payment is an explicitly expanded alternative.

## Required production implementation
- Authenticated staff create a confirmed quotation and full-payment order, with immutable amount in minor currency units, currency, legal contracting party, recipient, product description and expiry.
- Persist orders in a server database. Issue an unguessable customer payment token; store its hash and never expose admin endpoints to unauthenticated users.
- GET order by token returns only the customer-facing summary. Unknown/expired tokens fail closed. An existing product slug is never a payable order.
- POST checkout selects an allowlisted provider; server reads amount and currency from the stored order, never customer input. Enforce currency support, expiry, order state and idempotency.
- Merchant adapters require verified merchant identity, approved payment product, signing keys, platform certificates and callback URLs. Keep secrets in server environment only.
- Verify provider callback signatures and merchant, order, amount, currency and transaction identifiers. Persist events idempotently; only verified success transitions to paid. Redirect/return pages and customer declarations never mark paid.
- Query confirmed server status on the return page. Handle pending, failed, cancelled, expired and paid states, including delayed callbacks.
- Manual QR reconciliation requires an authenticated staff action and audit log; do not mix manual and provider transactions or allow double fulfilment.
- Validate sandbox success, cancellation, duplicate callbacks, forged callbacks, amount tampering, expired links and repeat checkout before enabling production.

## Outstanding inputs
Merchant credentials/approved channels, settlement currency, quote/order workflow and authenticated staff access, actual payment terms and a customer-support contact. No live order issuance, automatic redirects or confirmation are implemented in this release.

## Content regeneration
Run scripts/add-payment.py, then scripts/payment-pending.py after regenerating product pages. Preserve simplified homepage with scripts/simplify-home.py.
