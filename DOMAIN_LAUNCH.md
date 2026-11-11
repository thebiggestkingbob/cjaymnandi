# cjaymnandi.co.za — countdown and domain setup

Confirmed launch: **Wednesday, 18 November 2026 at 00:00 midnight South African time**.
This is **17 November 2026 at 22:00 UTC**, represented as `2026-11-18T00:00:00+02:00` in `lib/launch/schedule.ts`.

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
7. Review the countdown on desktop/mobile and verify the displayed midnight SAST deadline. Confirm the reviewed countdown deployment is Ready before announcing the domain.

Share a screenshot of the Vercel domain DNS instructions if help matching the GoDaddy fields is needed. No account password is required.

## Release validation

Before launch: apex root and `/archive` show countdown, static artwork loads, privacy remains readable, and the Vercel review hostname still shows the full experience. On a local fixed-clock test, the gate opens at exactly `2026-11-17T22:00:00Z`, at midnight SAST regardless of the visitor's timezone.

After activation: verify the primary domain, www redirect, HTTPS, and that no domain forwarding masks the URL. Confirm live Vercel deployment status separately from DNS readiness.

## Motion

Only changing digits slide/fade into place. The page has a short staggered entrance, gentle digit hover lift and understated link underlines. All animations and transitions are disabled by the global reduced-motion preference rule. No animation is needed for the timer to function.

## Video-led countdown design

The timer is the large central stage element, with the landing visualizer behind it and a black scrim for contrast. No green tint is applied to the film. It starts muted where autoplay is allowed; reduced-motion and data-saving preferences keep the still poster until the visitor chooses Play Film. A pause control is available in the footer.

## Watch and connect during the countdown

The Watch Visualizer action opens the official YouTube video `OlXTom_jz-s` in a website player, with a direct YouTube fallback. Opening it pauses the local background film; closing removes the iframe and resumes the background only if it was previously playing and motion/data preferences allow it. The timer continues while watching, and a viewer is not redirected mid-video when the deadline arrives; the normal launch redirect resumes after the player is closed.

The countdown includes the supplied Instagram, X and TikTok profiles as labelled icon links. On fine mouse pointers the clock tilts gently around its centre, resetting when the pointer leaves. Touch and reduced-motion users get a stationary clock. The sunflower cursor is 64px for a more visible hover cue.
