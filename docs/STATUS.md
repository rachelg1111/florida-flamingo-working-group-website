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
- Vercel deploy action reported a preview deployment at https://florida-flamingo-working-group-8cjl0a50j.vercel.app with ID dpl_6xGxeAp3xZpaW3vrRtebtDZkJVdh. Subsequent deployment/project/log lookups returned 404, and the connected fetch could not access it. Direct HTTP redirects to Vercel sign-in. A working deployment has NOT been verified; do not call this a completed staging delivery or make another project without resolving its account state.
- Real form receiving/storage/notifications: not connected. The preview expressly uses demonstration mode, with links to the original real forms.

No Gallery Logix infrastructure, live WordPress, DNS, domains, or email settings were modified. No real reports, contact messages, or payments were submitted.
