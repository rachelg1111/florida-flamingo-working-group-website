# Build status — September 17, 2026

## Passed
- Next.js production build and TypeScript checks.
- Six form-validation tests.
- Eleven routes return HTTP 200 with distinct titles and one h1 each.
- All internal routes and linked fragments resolve in the rendered HTML.
- Eight distinct rendered image responses return an image content type; alt attributes are present.
- Preview no-index header/robots, 404 behavior, and disabled form POST (503) are correct.
- Original PayPal, House bill, BirdLife, and senator-finder links responded successfully. Scientific/agency and Senate content checked separately.

## Not verified / blocked
- Browser visual/interaction testing: cloud-browser tab discovery times out. No desktop, tablet, mobile, focus, hydration, or Core Web Vitals pass is claimed.
- DOI publisher pages (2018 and genomics) blocked automated retrieval. Original URLs retained; agency/university summaries checked. Flamingo Specialist Group returned 403.
- Dedicated repository: https://github.com/rachelg1111/florida-flamingo-working-group-website. Initial implementation is proposed on `website/initial-review` through a pull request into `main`. GitHub reports the repository as public.
- Vercel project `florida-flamingo-working-group` is confirmed in Rachel's dashboard. A screenshot also confirms it is connected to `rachelg1111/florida-flamingo-working-group-website`. Connector lookups previously returned 404 despite the dashboard showing the project; do not create a duplicate. The initial review branch needs a verified Git-triggered preview build. Production remains on the existing WordPress site and no live-domain changes are authorized.
- Real form receiving/storage/notifications: not connected. The preview expressly uses demonstration mode, with links to the original real forms.

No Gallery Logix infrastructure, live WordPress, DNS, domains, or email settings were modified. No real reports, contact messages, or payments were submitted.
