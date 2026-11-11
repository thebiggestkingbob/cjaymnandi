# Supabase and contact forms

Project: `lqbiogmmfjhbibhgufex`.
API URL: `https://lqbiogmmfjhbibhgufex.supabase.co`.

The Vercel screenshot shows `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` saved for Production. Their values, the latest deployment, and live table state have not been verified from this workspace. This workspace currently has neither those bindings nor network access to the project.

## What the code now prepares

- `/api/contact`: same-origin JSON POST only, bounded body size, server validation, honeypot, generic duplicate-signup response, and private database writes.
- Booking and mailing-list forms: clear consent, pending/success/failure states, input retained on failures, no promise of a confirmed booking or automated email.
- Private tables and a transactional submission function. Anonymous and authenticated public roles cannot read, write or call the submission function.
- A shared database rate limit: five successful contact submissions per hashed client network address per ten-minute window. No raw IP address is stored. Expired counters are deleted on subsequent submissions.
- Support panel and a draft privacy page. Forms are disabled by default.

## Activate after review

1. Apply migrations once, in order, using Supabase SQL Editor or the Supabase migration tooling:
   - `supabase/migrations/202611100001_contacts.sql`
   - `supabase/migrations/202611100002_contact_submission.sql`
   If the first migration was already applied, do not rerun it. Do not reset existing tables.
2. In Vercel server environment settings, retain the existing URL/publishable key and add `SUPABASE_SECRET_KEY` using the project's **server secret** (`sb_secret_…`) or legacy service-role key. This is a separate server-only credential; do not replace the publishable key, paste a secret into chat, or prefix it with `NEXT_PUBLIC_`.
3. Supply the approved public `CONTACT_OPERATOR_NAME` and `CONTACT_SUPPORT_EMAIL`. Review the privacy page with the responsible operator, including retention, international processing and consent handling. Then set `CONTACT_PRIVACY_APPROVED=true`.
4. In a test/preview environment, set `CONTACT_FORMS_ENABLED=true` and redeploy. Save environment settings in this cloud workspace separately if agent-side connection tests are wanted. Allow `lqbiogmmfjhbibhgufex.supabase.co` in its outbound network settings.
5. Run `npm run supabase:check`, then `npm run supabase:check -- --contacts`. The latter inspects schema visibility using the server key; it does not read customer rows or write a submission. Node 24 supports `NODE_USE_ENV_PROXY=1` when running through the cloud HTTPS proxy.
6. Perform controlled live signup and booking tests, confirm the records in Supabase, and confirm public access is denied. Clearly label test submissions and delete only those test records after checking. Choose who monitors the tables, or implement an email notification workflow, before opening enquiries publicly.
7. Only after those checks, enable the production flags and redeploy. To disable collection, set `CONTACT_FORMS_ENABLED=false` and redeploy. The API also checks the flag at request time.

The static page's form availability and privacy text are rendered using build-time environment settings, so changes require a redeploy. The server route checks configuration independently and fails closed if disabled or incomplete.

## Verify locally

```sh
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
npm run build
npm run typecheck
```

`npm test` validates both SQL migrations against PostgreSQL-compatible PGlite and checks private access, deduplication, consent and rate limits. `test:e2e` starts a disposable local PGlite database, a local Supabase Data API adapter, and Next.js. It uses only `example.com` fixture addresses and stubs Spotify/YouTube iframe documents. It verifies application-to-database flow locally, not managed Supabase infrastructure or third-party playback. Use an installed Playwright Chromium if `CHROMIUM_PATH` is omitted. The test requires Node 24 for native TypeScript loading.

## Still separate

These forms store requests; they do not send booking notifications, confirm bookings, subscribe anyone with a mailing provider, or send newsletters. Select the mail provider, configure the sending domain, test delivery and implement unsubscribe/suppression handling before sending broadcasts. Keep mailing consent separate from booking and purchase requests.

Yoco payments, order fulfilment, private download storage and payment emails are not implemented. Supabase configuration does not enable checkout.

## Check from Vercel itself

Use `/review` on the project's Vercel hostname and run **Check connection & readiness** when cloud-workspace egress or credentials prevent agent-side validation. This checks the deployed environment, not the local workspace. The read-only result never returns keys or customer rows and cannot activate forms. See `VERCEL_REVIEW.md` for limits and walkthrough links.
