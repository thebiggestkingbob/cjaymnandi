# cjaymnandi.co.za — countdown and domain setup

Confirmed launch: **Friday, 13 November 2026 at 12:00 midday South African time**.
This is **10:00 UTC**, represented as `2026-11-13T12:00:00+02:00` in `lib/launch/schedule.ts`.

## Deployment behavior

`proxy.ts` serves the countdown on `cjaymnandi.co.za` and `www.cjaymnandi.co.za` before the launch instant. Direct page paths (including `/archive`) also show the countdown. Contact API requests on those domains return unavailable before launch. Assets and the privacy page remain accessible.

The existing Vercel domains keep the full website available for review. The countdown itself can be reviewed at `/countdown`. At the deadline, the custom-domain gate opens automatically and countdown visitors are sent to `/`. The countdown uses a server-time reference rather than the visitor's clock, with a single schedule shared by server routing and the client display. The countdown response is not cached. No Supabase, email or Yoco connection is needed.

This is a timed public landing gate, not access control for private content. The Vercel review URL and public media remain accessible. Payments and contact forms still retain their separate activation requirements after the countdown ends.

The launch time can be changed in one file and redeployed; it does not change content, media, payments, contacts or database tables. Deployment status is separate from these instructions; confirm the latest commit is Ready in Vercel.

## Connect GoDaddy to Vercel

1. In the `cjaymnandi` Vercel project, open **Settings → Domains**.
2. Add `cjaymnandi.co.za` and `www.cjaymnandi.co.za`. Use the apex as primary and redirect `www` to it, unless the owner prefers otherwise.
3. Copy the **exact DNS records Vercel displays for this project**. Do not guess an IP address or reuse another project's CNAME.
4. In GoDaddy, open the domain's **DNS → Manage DNS**. Add or update the apex (`@`) and `www` records as Vercel instructs. If DNS is hosted elsewhere, make the changes with the authoritative DNS provider instead.
5. Preserve email (MX), TXT verification/SPF/DKIM and unrelated subdomains. Remove a conflicting A/AAAA/CNAME only for the hostname Vercel identifies. Do not change nameservers just to connect hosting.
6. Wait for Vercel to show valid configuration and HTTPS certificate readiness, then test both apex and www. A DNS record being saved is not proof of propagation or a valid certificate.
7. Review the countdown on desktop/mobile and verify the displayed midday SAST deadline. Confirm the reviewed countdown deployment is Ready before announcing the domain.

Share a screenshot of the Vercel domain DNS instructions if help matching the GoDaddy fields is needed. No account password is required.

## Release validation

Before launch: apex root and `/archive` show countdown, static artwork loads, privacy remains readable, and the Vercel review hostname still shows the full experience. On a local fixed-clock test, the gate opens at exactly `2026-11-13T10:00:00Z`, not at midnight or at a visitor's local noon.

After activation: verify the primary domain, www redirect, HTTPS, and that no domain forwarding masks the URL. Confirm live Vercel deployment status separately from DNS readiness.

## Motion

Only changing digits slide/fade into place. The page has a short staggered entrance, gentle digit hover lift and understated link underlines. All animations and transitions are disabled by the global reduced-motion preference rule. No animation is needed for the timer to function.
