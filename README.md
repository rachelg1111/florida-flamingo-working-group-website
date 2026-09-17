# Florida Flamingo Working Group website

A standalone Next.js/TypeScript replacement for the organization's WordPress site, built for review. The existing website, domain, email, DNS, and Gallery Logix infrastructure have not been changed.

## Start

Node 22 or newer recommended. Run `npm ci`, `npm run dev`. Build with `npm run build`; production server with `npm start`. `npm test` checks form validation; `python scripts/check-site.py` checks the production build's routes, links, metadata, image responses, and preview submission protection.

## Content editing

- `content/pages.json`: About, work, research priorities/resources, and campaign copy. Markdown is supported; raw HTML is not rendered.
- `content/members.json`: all 29 original working-group members.
- `content/site.ts`: leadership, featured publications, navigation, donation URL.
- `app/page.tsx`: home storytelling.
- `app/[slug]/page.tsx`: section layouts, news items, involvement, ecology, and privacy.
- `public/images`: locally bundled organization imagery; source/rights register in `docs/audit/media.json`.

Edit content through a branch and pull request. Preview and review before merging. Never run `scripts/prepare-content.py` over edited content; it is a one-time migration script retained for provenance. The audit snapshot is not a live content feed.

No CMS, database, personal account IDs, Gallery Logix code, or runtime connection to WordPress is required. The code and media are portable to another Next.js hosting provider.

## Preview protections

Indexing is disabled unless `SITE_LAUNCH_APPROVED=true`. Form collection is disabled unless `FORMS_ENABLED=true`, an HTTPS `FORM_WEBHOOK_URL`, and `FORM_WEBHOOK_SECRET` are all supplied. Never set those from Gallery Logix. `.env.example` documents dedicated project configuration. Do not change live-domain DNS for review.

The preview forms validate entries and show a clearly labeled demo confirmation without transmitting records or images. A real-report link leads to the unchanged existing FFWG website.

See `docs/HANDOFF.md`, `docs/AUDIT.md`, and `docs/LAUNCH.md` for review items, setup, transfer, and launch/rollback instructions.
