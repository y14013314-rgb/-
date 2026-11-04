# SUKHA inquiry and quotation service

- Public visitor inquiries are persisted in D1 with explicit consent, request identifiers for retries, and an IP-hash/hour submission limit. No automatic marketing subscription.
- `/admin/` uses dispatch-owned ChatGPT identity plus server-side authorization. OWNER_EMAIL bootstraps only the verified owner identity. Each invited colleague binds to a stable site user ID. No colleague is authorized initially.
- INQUIRY_EMAIL is the intended notification destination. Notification records remain awaiting_email_setup; no outgoing email is claimed or sent. A verified email delivery provider and sender are still needed.
- Staff can record notes, claim inquiries, update follow-up state and create CNY/USD quotations. Amounts are integer minor units, no automatic conversion.
- Quote drafts become immutable when issued. Only a 256-bit token link grants customer access; its hash is stored. Customers see no inquiry contact details or internal notes. Token is held in the URL fragment and sent in a header, not a query string.
- Accepting a quotation is idempotent and leaves payment unconfirmed. No card transaction, merchant callback, automatic payment status or booking guarantee is implemented.
- Pending/issued quotes can be revoked. Lost links require revocation and a new draft.
- Owner may authorize/deactivate team emails. No invitation email is sent by authorization.
- Data retention is manual. Fulfil deletion requests through the site owner/database administration until a dedicated deletion workflow is approved and added.

Validation: `npm run db:generate`, `node tests/crm.test.mjs`, framework build. Migrations must remain immutable after deployment.

Static source is now in public/, not dist/. Generated HTML is also embedded for server fallback via `node scripts/embed-pages.mjs`. Do not run the old dist-based content generators without adapting their output paths; dist is framework build output.
