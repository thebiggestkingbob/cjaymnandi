const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.local or the process environment.');
  process.exit(1);
}
try {
  const endpoint = new URL('/rest/v1/', url);
  if (endpoint.protocol !== 'https:') throw new Error('Supabase URL must use HTTPS.');
  const response = await fetch(endpoint, {
    headers: { apikey: key, Accept: 'application/openapi+json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(`Supabase Data API check failed (HTTP ${response.status}). Check project status, URL, publishable key and network access.`);
    process.exitCode = 1;
  } else {
    console.log('Supabase Data API connection verified. Table permissions and application workflows require separate validation.');
  }
} catch {
  console.error('Cannot reach Supabase. Check the project URL, network allowlist and TLS configuration.');
  process.exitCode = 1;
}
