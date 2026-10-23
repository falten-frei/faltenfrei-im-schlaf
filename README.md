# FaltenFrei Professional

Deutsch / Русский. B2B-Katalog für Kosmetikinstitute, Praxiswarenkorb und Kooperationsanfragen für das Weiterverkaufssortiment.

## Status

- 15 VK products with current storefront names, prices and photographs, snapshot 2026-10-23.
- 15 PW products with agreed names and sizes. 13 confirmed price bases; Perfect Skin Serum and Feuchtigkeits-Serum 200 ml are price-on-request until the owner confirms the new-size base prices.
- PW prices: original net price × 1.10, rounded upward to €0.50; VAT calculated separately. Minimum goods value €250 net; delivery €15 net below €350 net, free from €350 net.
- Cart calculations and server validation tested with `npm test` (no dependencies).
- DE/RU descriptions, founder story, B2B trade notice, Impressum, adapted privacy information and B2B terms.
- No analytics, external fonts, embedded third-party media or online payments.
- The current frontend prepares an email draft. It does not claim to have sent or automatically confirmed an order.

## GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → **main** → **/(root)** → Save. Root `index.html` and `.nojekyll` are ready; no build step is required for branch publication. Only use the live address returned by GitHub after the deployment succeeds.

The repo connection supports code writes, but does not expose a Pages administration operation. Pages must be enabled by the repository owner in Settings; the browser session is not signed in.

## Local checks

```sh
npm test
node --check app.js
node build.mjs
```

`dist/` is a generated static-only package. The root also works directly on GitHub Pages. Generated previews and raw source snapshots are not deployed.

## Automatic email to customer and owner — activation required

GitHub Pages does not run server-side code or send emails. A separate implementation is provided in `backend/worker.js` for Cloudflare Workers + D1 + Resend. It is NOT deployed or connected. No mail provider account or sender verification is available in this session.

1. Set up the owner's email provider account and verify a sender controlled by the owner. Do not use a sandbox sender for customer delivery.
2. Create D1 database, apply `backend/schema.sql`, bind it as `DB`.
3. Configure secrets `RESEND_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL=info@faltenfrei.online`, `HASH_SALT`, and `ALLOWED_ORIGIN` (the exact live site's origin).
4. Deploy worker. Set `orderEndpoint` in `config.js` to its verified HTTPS endpoint.
5. Update the privacy page with the actual processors, addresses, locations, legal transfer safeguards, processing agreements and retention. The current text correctly describes the present mail-draft behavior; it must change when the backend is enabled.
6. Test both mailbox deliveries with owner-approved test addresses, including provider failures and retries. Only then activate automatic confirmations in production.

The backend recomputes prices and VAT, rejects VK and price-on-request items, validates minimum, quantity, contact and trade declarations, limits requests, and uses provider idempotency keys. D1 stores only delivery flags, salted rate-limit identifiers and request fingerprints, not contact or trade-document content. The raw-IP is used transiently for the salted rate counter, never persisted. Order acceptance remains manual. An acknowledgement is not a contract acceptance.

## Outstanding owner data before full sales launch

- Source prices for Perfect Skin Serum and Feuchtigkeits-Serum **200 ml**. Old catalogue prices were for **100 ml**; they have not been silently reused or doubled.
- Current labels / INCI and instructions for all products. Descriptions use restrained cosmetic language, not clinical or guaranteed outcomes. The old catalogue is not proof of efficacy.
- Confirm delivery countries and lead times. Germany is the base shipping assumption; international delivery is explicitly subject to a separate offer.
- Confirm exact legal-name/address/email/phone details taken from the current storefront.
- Review B2B contractual and privacy wording against final operations before accepting binding orders. No claim of legal certification.

## Sources and imagery

The reference storefront is https://faltenfreiimschlaf.myshopify.com/collections/produkte?page=1 . Public imprint and terms were retrieved from that storefront on 2026-10-23. Product descriptions are newly written in DE and RU. The imprint's historical brand story supports the 2022 collaboration with Anna Trocka. The founder portrait is extracted from the supplied catalogue, not AI-generated.

PW photographs are explicitly labelled AI product visualizations. The single atlas was generated with the built-in image generation tool; it has sixteen equal cells, fifteen of which correspond to the agreed PW assortment. Exact products, volumes, white jars, gold diagonal labels and FF logo were specified. WebP encoding is used for delivery; originals retained in the task workspace. VK images come from the owner's storefront, including video poster frames where no standalone image exists. Full generation brief is in `docs/image-brief.txt`.

Legal source references: EU Regulation 655/2013 (cosmetic claims), §14 and §312i BGB, §377 HGB, GDPR and TDDDG. Website publication is not represented as a legal compliance audit.
