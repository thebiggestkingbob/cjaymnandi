# Secure contact and transactional email release

## Audit findings and corrections

- Previous migrations collected consent and saved requests, but there was no transactional delivery, confirmation or unsubscribe pipeline.
- Collection previously depended only on a privacy flag and database key. It now also requires verified database, sender, actual delivery and retry scheduling, with sending explicitly enabled.
- New migration `202611110003_contact_email.sql` is additive. Existing mailing records remain pending, not silently confirmed. It removes the old `consent=true` constraint so withdrawal can set consent false.
- Separate booking consent is optional and unchecked. A booking alone queues only owner notification and the customer's transactional receipt. Marketing requires a separate checkbox and email confirmation.
- Request UUID plus fingerprint prevents duplicate submissions; database locks enforce five requests per client and per mailbox per ten-minute window. Confirmation requests also have a one-hour cooldown. All duplicate signup responses are generic.
- Outbox messages are saved in the same database transaction as the request. Payloads are AES-GCM encrypted; confirmation/unsubscribe tokens are random 256-bit capabilities and indexed only as hashes in subscriber rows. All new tables use RLS and deny public roles.
- Workers claim leased jobs with `SKIP LOCKED`. Resend requests use stable per-job idempotency keys. Transient errors back off; permanent failures and exhausted retries remain visible. Retries stop after six attempts or twenty hours, within Resend's idempotency window.
- Signed Resend/Svix webhooks distinguish provider acceptance from delivery, handle early/duplicate events, and suppress bounced/complaining recipients. Failures log only references and safe codes, never email bodies, addresses, tokens or keys.
- Unsubscribe remains available when collection is disabled. Older unsubscribe links remain valid even after a confirmation is reissued. GET does not mutate consent. Normal links use URL fragments and clear them from the address bar; RFC 8058 one-click POST uses a capability URL. Restrict access-log retention and never track preference links with analytics.

## Current verification status

Local database persistence and the application-to-queue-to-provider-adapter-to-delivery-event flow are tested using disposable PostgreSQL-compatible PGlite and a local email adapter. These are not live Supabase or real email delivery tests.

The actual-delivery verification command was attempted but blocked because this workspace has no `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_DOMAIN_ID` or `EMAIL_TOKEN_SECRET`. Current environment metadata also reports no injected credentials or runtime variables. The connected tools cannot inspect the current Vercel settings; earlier screenshots proved only Production URL/publishable-key variable names, not current values or connectivity. No remote migrations or configuration flags have been changed.

## Sender and mailbox

Official sender, reply contact and booking inbox: **hello@cjaymnandi.co.za**. This is fixed in `lib/email/settings.ts`. The functioning mailbox does not itself provide website API delivery credentials. The implementation uses Resend; no mailbox password is required by the application.

Verify `cjaymnandi.co.za` in Resend using its exact DNS instructions. Preserve the existing mailbox's MX records and unrelated DNS settings. Do not replace root MX or create multiple conflicting SPF records. The sending service's domain verification and the existing inbound mailbox must both continue working.

## Apply the migrations once

1. `202611100001_contacts.sql`
2. `202611100002_contact_submission.sql`
3. `202611110003_contact_email.sql`

Skip any already-applied migration. Do not reset tables. Use a backup/review process for the existing database. The new application submits through `submit_site_contact_v2`; legacy private functions remain for compatibility but do not implement the new delivery workflow.

Only `status='confirmed' AND consent=true` subscribers are eligible for future marketing. Newsletter broadcasting is not part of this implementation. Unsubscribed or suppressed addresses are not reactivated by repeat signup requests; support must handle any explicit rejoin process separately.

## Vercel/server configuration

Use secure Vercel environment settings and separate Preview/Production values as appropriate. Never prefix private keys with `NEXT_PUBLIC_`, put them in source, or paste them in chat.

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | HTTPS API URL for the chosen project |
| `SUPABASE_PUBLISHABLE_KEY` | Public-role read-only connectivity diagnostic |
| `SUPABASE_SECRET_KEY` | Server-only database/RPC access; legacy service-role key also supported |
| `RESEND_API_KEY` | Transactional email API access |
| `RESEND_WEBHOOK_SECRET` | Signing secret from the configured Resend webhook |
| `EMAIL_TOKEN_SECRET` | At least 32 random characters; encrypts queued payloads and derives privacy-preserving rate buckets |
| `CRON_SECRET` | Bearer authentication for `/api/email/dispatch` |
| `RESEND_DOMAIN_ID` | Needed by the controlled live verification script to inspect the verified sending domain |
| `CONTACT_OPERATOR_NAME` | Approved privacy operator/business name |

Keep `EMAIL_TOKEN_SECRET` stable. Rotate it only after draining/cancelling encrypted queued jobs or implementing a versioned key migration; losing it makes old payloads unreadable. Credentials need permission to send from the verified domain. The live test additionally needs Resend domain/email read access.

All activation values default to `false`: `CONTACT_FORMS_ENABLED`, `CONTACT_PRIVACY_APPROVED`, `CONTACT_DATABASE_VERIFIED`, `EMAIL_SENDER_VERIFIED`, `EMAIL_DELIVERY_VERIFIED`, `EMAIL_RETRY_SCHEDULE_VERIFIED`, `EMAIL_SENDING_ENABLED`.

A set of flags is not evidence: approve them only after the corresponding checks. Code and examples do not activate production forms. Vercel environment edits require a redeploy.

## Webhook and reliable retries

Configure `https://www.cjaymnandi.co.za/api/email/events` in Resend for delivered, bounced, complained, failed and suppressed events, and save its signing secret. The countdown includes a STAY UPDATED signup dialog using the same server-gated contact form as the full experience. The contact API and these preference/delivery endpoints bypass the countdown page rewrite; signature/capability/Bearer checks still apply.

New submissions start a bounded post-response worker using Next.js `after()`. Also configure an authenticated scheduler to GET `/api/email/dispatch` approximately every two minutes with `Authorization: Bearer <CRON_SECRET>`. Verify scheduling before approving its flag. No schedule is automatically installed: Vercel Hobby's daily cron limit is insufficient for this retry policy; use an appropriate plan or an external authenticated scheduler. Do not put the secret in query strings.

Monitor `contact_email_outbox` for pending, failed and bounced jobs and Vercel's safe error logs. A provider-accepted message is not a delivered message. Do not blindly resend failed jobs with a new idempotency key. Resolve permanent errors and account for whether the provider already accepted the original.

## Verify real persistence and delivery, then activate

With production collection and background sending still disabled, put the verification credentials securely in the execution environment and run:

```sh
npm run verify:live -- --send-test-email
```

This explicitly sends two labelled booking-test messages, both to `hello@cjaymnandi.co.za`. It verifies the Resend domain, saves a labelled enquiry and outbox in Supabase, sends only those jobs, waits for Resend to report delivery, and checks that the signed webhook recorded delivered status. It does not send to customer addresses, alter flags or remove records. Inspect the mailbox for actual receipt and placement. Labelled test records remain for review; delete only those references if desired.

Then perform a controlled mailing-list test: GET must not confirm automatically; click Confirm, verify confirmed status, unsubscribe and verify suppression; replaying the confirmation must not resubscribe. Test booking with and without its separate marketing checkbox, duplicates, provider failure/retry and webhook replay. Do not activate collection until these live checks and the privacy/retention review pass. Define contact/outbox retention and who responds to bookings. Do not send newsletters until an unsubscribe-aware campaign process is implemented.

## Automated checks

Use Node.js 24 for the native TypeScript verification scripts.

```sh
npm test
npm run typecheck
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

The browser test intercepts all email-provider traffic into a local adapter, uses fixture addresses, exercises the real application API and local database migrations, and tests delivery callbacks, confirmation and unsubscribe. It never proves actual inbox delivery or live Supabase deployment readiness.

## Approved experience retained

The countdown deadline is 18 November 2026, 00:00 SAST (17 November, 22:00 UTC). Source audit found the earlier 13 November deadline and aligned it with the latest brief. Video/audio files, palette, timer motion and YouTube experience are unchanged. Post-countdown navigation is Home, Buy, About, Music, Content, Shop, Events, Bookings. Checkout remains disabled.
