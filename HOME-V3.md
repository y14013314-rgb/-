# Homepage V3 — implementation and maintenance

The existing HTML / CSS / JavaScript / standalone Worker architecture, Site identity, D1 binding and product URLs are retained. No framework or runtime dependency was added. The header and footer were retained from the existing homepage.

## Scope and files

- `public/index.html`: six main sections, four hero slides, a single film section, inline quick inquiry, original navigation/footer.
- `public/home-v1.css`: homepage-scoped editorial visual layer; paper, forest and gold palette, existing Georgia/system typefaces, responsive layouts.
- `public/home-v1.js`: seven-second slider, manual arrows/indicators, pause/resume, interaction/reduced-motion pause, lazy slide loading, inline form validation/review.
- `public/quote-builder.js`: shared WhatsApp-link and clipboard helpers; homepage CTA can scroll to its inline form. Existing product modal and its product/ship prefills remain.
- `content/home-featured.json`: central title, description, image, alt, category, URL, order and featured flag configuration.
- `scripts/render-home-featured.mjs`: renders featured cards into the homepage at build time, with escaped content and verified local image/page paths.
- `scripts/build-worker.mjs`: runs the card renderer before the existing production build.
- `public/assets/home-v3/`: four 960px WebP derivatives of existing photographs; no new depicted scenes or AI images.

After editing featured configuration, run `node scripts/render-home-featured.mjs` for static preview, or the production build below. No CMS exists for these cards. Hero slides remain editable in `public/index.html`.

## Inquiry integration

The existing production Worker intentionally returns 503 for POST `/api/inquiries`. This redesign does not enable the old CRM or claim automated delivery. The form validates required interest, email and consent, then displays an English request inline. The user sends it via the existing WhatsApp number, or copies and sends it in WeChat. WhatsApp-link and clipboard functions are shared with the existing product quote builder. No private API key, new external data processor, automatic email or automatic submission was added.

The review states explicitly that the request has not been sent. Clipboard denial produces a manual-copy fallback. A script failure has a visible contact fallback; native form POST targets the disabled endpoint rather than putting guest details in URL query parameters. Actual message delivery can only be confirmed after a guest sends a message in WhatsApp/WeChat. Automated CRM/email receipt remains unavailable and would require separately implementing an approved receiving service.

## Media and honest placeholders

All homepage photographs already existed in the project. Sources are in `HOME-MEDIA.md` and `DESTINATION-MEDIA.md`. The cruise image is from the supplied Century Legend brochure, with an identifiable vessel. The railway uses an explicitly described Xinjiang landscape; no unverified train interior or operator is shown.

No verified SUKHA team photograph or original brand film is available. The people section uses an explicitly captioned Chengdu teahouse, without presenting it as a team photograph. The film section uses the existing Yunnan photograph with a visible original-film placeholder and an external official “Beautiful China” link (English-subtitled edition listed by the publisher). It has no fake central play button, iframe, autoplay or video download. Playback on the publisher's website is not represented as tested or guaranteed. Replace the placeholder with a cleared film when available, then verify playback before publication.

## Validation

Production: `node scripts/build-worker.mjs` and `node scripts/validate-worker.mjs`.
JavaScript: `node --check public/home-v1.js`, `node --check public/quote-builder.js`, `node --check scripts/render-home-featured.mjs`.
Whitespace: `git diff --check`.
Browser results and screenshots: `../outputs/home-v3/`.

This task is local preview only. Earlier stopped-task edits to Shanghai and cruise pages were already in the checkout before this redesign and were not expanded or published by this task.
