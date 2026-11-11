const url = process.env.SUPABASE_URL;
const contacts = process.argv.includes('--contacts');
const key = contacts ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Supabase is not configured. Set SUPABASE_URL and the required API key in .env.local or the process environment (publishable key by default, server secret for --contacts).');
  process.exit(1);
}
try {
  const endpoint = new URL('/rest/v1/', url);
  if (endpoint.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  const headers = { apikey: key, Accept: 'application/openapi+json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(`Supabase Data API check failed (HTTP ${response.status}). Check project status, URL, publishable key and network access.`);
    process.exitCode = 1;
  } else {
    if (contacts) {
      const schema = await response.json();
      const paths = schema.paths || {};
      const required = ['/mailing_list_signups', '/booking_enquiries', '/contact_rate_limits', '/rpc/submit_site_contact_v2','/contact_email_outbox','/contact_unsubscribe_tokens','/rpc/confirm_contact_subscription','/rpc/unsubscribe_contact','/rpc/claim_contact_emails','/rpc/finish_contact_email','/rpc/record_contact_email_event'];
      if (!required.every(path => Object.hasOwn(paths, path))) {
        console.error('Connection works, but the required contact schema is not available. Apply all three migrations and check server-key permissions.');
        process.exitCode = 1;
      } else console.log('Contact tables and submission function are visible to the server key. No records were read or written; an end-to-end submission test is still required.');
    } else console.log('Supabase Data API connection verified. Table permissions and application workflows require separate validation.');
  }
} catch {
  console.error('Cannot reach Supabase. Check the project URL, network allowlist and TLS configuration.');
  process.exitCode = 1;
}
