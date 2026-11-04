# SUKHA travel website and CRM

Production uses a standalone Cloudflare Worker with D1; no frontend framework installation is required to build or run the deployed artifact. Public website sources are in public/. Backend authorization and inquiry/quotation operations are in server/crm.mjs.

Build: node scripts/build-worker.mjs
Validate: node scripts/validate-worker.mjs
Integration tests: node tests/crm.test.mjs (Node with node:sqlite)

Database schema is in db/schema.ts. Migrations were generated using Drizzle and live in drizzle/; preserve applied SQL and journals. The retained development dependencies can generate future migrations, but are not part of production runtime.

Public content is embedded into worker/index.js by the build. dist/ is generated deployment output, not authoring source. Keep .openai/hosting.json identity and D1 binding. See CRM-OPERATIONS.md and PAYMENT-INTEGRATION.md for current operational limits.
