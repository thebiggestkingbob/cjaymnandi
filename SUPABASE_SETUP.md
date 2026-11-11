# Supabase contact setup

Project: `lqbiogmmfjhbibhgufex` · API: `https://lqbiogmmfjhbibhgufex.supabase.co`.

Read **CONTACT_EMAIL_SETUP.md** for the current audited configuration, three ordered migrations, server-only credentials, transactional delivery, consent/unsubscribe handling, retry scheduling, production gates and live verification procedure. These instructions supersede the earlier two-migration, storage-only setup.

The current workspace has no injected Supabase or delivery credentials. Vercel's earlier screenshot showed the URL/publishable-key variable names for Production, but current values, live schema and delivery have not been inspected or verified here. A working public key does not authorise private submissions.

For a read-only connectivity/schema diagnostic, use `npm run supabase:check` and `npm run supabase:check -- --contacts`. In this managed cloud runtime Node 24 can use `NODE_USE_ENV_PROXY=1` with the inherited HTTPS proxy; allow the project hostname and `api.resend.com` before live tests. Do not bypass TLS or destination policy.

All production activation flags remain false by default. The `/review` page is a non-sensitive summary, not an authenticated administration or activation tool. It never sends mail or creates customer records. Actual test delivery requires the explicit `npm run verify:live -- --send-test-email` command and credentials supplied securely.
