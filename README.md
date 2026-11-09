# SUKHA travel website and CRM

Production uses a standalone Cloudflare Worker with D1; no frontend framework installation is required to build or run the deployed artifact. Public website sources are in public/. Backend authorization and inquiry/quotation operations are in server/crm.mjs.

Build: node scripts/build-worker.mjs
Validate: node scripts/validate-worker.mjs
Integration tests: node tests/crm.test.mjs (Node with node:sqlite)

Database schema is in db/schema.ts. Migrations were generated using Drizzle and live in drizzle/; preserve applied SQL and journals. The retained development dependencies can generate future migrations, but are not part of production runtime.

Public content is embedded into worker/index.js by the build. dist/ is generated deployment output, not authoring source. Keep .openai/hosting.json identity and D1 binding. See CRM-OPERATIONS.md and PAYMENT-INTEGRATION.md for current operational limits.

## Cloudflare Pages local pilot

Run from this repository. The build writes `pages-dist/` and generates the Baiyun
card and detail from `content/products/baiyun.json`. This preview output has
`noindex` and leaves out the legacy admin and quote pages.

```sh
node scripts/build-pages.mjs
npx --yes wrangler@4.92.0 d1 migrations apply DB --local --config pages/wrangler.local.toml --persist-to .wrangler/pages-local
```

Start the simulated mail receiver in one terminal and Pages in another.

```sh
node tests/pages-mail-sink.mjs
```

```sh
npx --yes wrangler@4.92.0 pages dev pages-dist --ip 127.0.0.1 --port 8788 \
  --d1 DB=11111111-1111-4111-8111-111111111111 --persist-to .wrangler/pages-local \
  --compatibility-date 2026-05-15 \
  --binding INQUIRY_LOCAL_MAIL=1 INQUIRY_EMAIL=sandbox@example.test INQUIRY_FROM=sender@example.test
```

Open `http://127.0.0.1:8788/silk-road-luxury-trains/baiyun/`. Use the product
quote button and add `retry-fixture` to the requirements. Use an `example.test`
address and give consent. The mock returns 503 once, then accepts the retry with
the same inquiry reference. To check persistence with the reference shown by
the form:

```sh
npx --yes wrangler@4.92.0 d1 execute DB --local --config pages/wrangler.local.toml \
  --persist-to .wrangler/pages-local \
  --command "SELECT id,status FROM inquiries WHERE id='YOUR_REFERENCE'; SELECT status FROM notifications WHERE inquiry_id='YOUR_REFERENCE';"
```

The pilot retries notifications from the inquiry review. A real email
environment requires approved sender and recipient settings
(`INQUIRY_FROM`, `INQUIRY_EMAIL`) and a server-side `RESEND_API_KEY` secret.
The local mail fixture uses synthetic addresses and never calls the provider.
