# Review and operating handoff

## Delivered implementation

Eleven public pages with all eight original main paths preserved. Responsive layouts, keyboard focus styles, skip link, mobile navigation, local optimized photography, accessible labels, paper citations, leadership/member directory, existing donation link, dedicated campaign history, page metadata, social metadata, favicon, structured organization data, sitemap/robots configuration, and honest form review mode.

## Submission service

Preview forms collect nothing. To enable live receiving, choose an organization-owned HTTPS service accepting multipart form data. It must durably store submissions and photo files, enforce distributed rate limits/spam protection, verify the bearer secret, and return 2xx only after acceptance. It must support deletion/access controls and permission flags. Use the `reference`/`Idempotency-Key` to deduplicate retries. Route notification emails to an approved organizational inbox. Never put the bearer secret in browser code.

The site API checks same-origin requests, required fields, dates, integer counts, consent, a honeypot, message length, file count, total size, MIME types, and image signatures. It forwards only after validation. It caps total uploads at 3 MB and handles failed delivery without a false success screen. It does not log form bodies. Deployments remain in review mode until the service and privacy retention are approved; do not turn on collection just to make the demo look complete.

Before activation, validate a synthetic sighting with and without a photo, contact inquiry, rejected upload, retry behavior, receipt/storage/notification, restricted staff access, and deletion. End-to-end delivery cannot be certified before a real receiving service is configured.

## GitHub

The dedicated repository is https://github.com/rachelg1111/florida-flamingo-working-group-website. Rachel created it and enabled access for the connected GitHub app. GitHub reports it as public. The initial build is proposed on `website/initial-review` through a pull request into `main`. Main begins with a README-only bootstrap commit. Merge the website only after Rachel approves.

This project is independent of ArtLogix and its integrations. Connect only this repository to the dedicated FFWG Vercel project when account access is available. Use the review branch for staging and verify the deployment. Do not put secrets in committed files.

## Routine updates

Use a pull request to update the content files described in README. Preview each change and have a second person verify scientific or legislative copy. Keep publication dates separate from the site's refresh date. Re-check roster affiliations periodically. Add dated news entries only when there is an actual source or an approved organizational announcement.

## Review still needed

- Browser visual review at mobile (390 px), tablet (768 px), and desktop (1440 px); 200% text enlargement; keyboard navigation and mobile-menu behavior.
- Real-browser form interactions, geolocation consent/denial, and photo-picker errors.
- Core Web Vitals/Lighthouse performance measurement after deployment.
- Photograph permissions/credits and member affiliation confirmations.
- Submission service connection and end-to-end delivery verification.
