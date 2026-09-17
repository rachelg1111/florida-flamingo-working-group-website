# Transfer and launch plan — no live changes authorized yet

## Transfer before launch

1. Obtain leadership approval of the replacement and record the accepted staging deployment.
2. Have FFWG create/own its GitHub organization and Vercel team, with at least two organization-controlled administrators and appropriate billing. Do not put personal recovery email addresses in the long-term operating documentation.
3. In the dedicated repository settings, transfer the repository to the FFWG organization. The receiving owner accepts. Confirm issues, history, branches, PRs, permissions, and required checks; update local git remotes.
4. In the dedicated Vercel project settings, use Transfer Project to move to the FFWG team. Verify current Vercel plan/transfer prerequisites in official docs at that time. Do not transfer unrelated projects. Accept only explicitly approved costs.
5. Reconnect the transferred GitHub repository and verify its Vercel GitHub App installation has access to this repository. Re-enter or rotate project-specific form secrets as appropriate; verify dedicated environments, integrations, deployment protection, and build configuration.
6. Create a fresh preview from the transferred repo. Test pages, assets, forms, and organization-controlled notification/access before considering DNS. Confirm future builds no longer depend on Rachel's account.

## Before domain cutover

Obtain explicit approval to launch. Export current registrar/DNS records, including TTLs, apex/www, MX, SPF, DKIM, DMARC, verification TXT and any unrelated records. Do not change email records. Back up WordPress files/database/uploads and preserve its working hosting and an accessible fallback address. Establish who can restore DNS and their availability.

Retain all eight original routes. Normalize trailing slashes consistently; Next.js handles trailing slash normalization. Do not redirect real pages to the homepage. For the default `/2026/09/14/hello-world/` post, leadership may approve a redirect to `/news/` or its retirement; do not treat it as a scientific resource. Check any additional server access-log URLs before launch because the public sitemap is not proof of every historic URL.

Confirm image rights, roster, scientific review, donation recipient, form destination, retention/privacy policy, and accessibility/browser checks. Set the production `SITE_URL` to the approved HTTPS canonical domain and `SITE_LAUNCH_APPROVED=true` only for the approved production deployment. Keep previews noindex. Connect both apex and www only after approval, choose a canonical host, and use Vercel's exact current DNS instructions.

## Cutover

Change only the web-hosting records that were explicitly approved. Verify TLS/HTTPS, apex/www redirect, original paths, 404s, images, canonical tags, robots/sitemap, structured data, social previews, forms/attachments/delivery, and outbound links. Check mobile and desktop. Confirm email still works. Submit the sitemap to the organization's search-console property where authorized.

## Rollback

If pages, TLS, or submission delivery fail materially, restore the documented former apex/www DNS values. Preserve email records. Return to the existing WordPress installation; do not delete it or its forms. Account for DNS TTL and verify public resolution. Pause new form delivery if necessary without deleting received records, reconcile any submissions, then diagnose on staging. Keep WordPress and backups through an agreed stability period; decommission only on separate explicit approval.
