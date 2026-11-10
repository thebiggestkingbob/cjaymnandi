import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getContactConfig } from '../../../lib/contact/config';
import { validateContact } from '../../../lib/contact/validation';

export const runtime = 'nodejs';
const maxBytes = 32768;
function reply(status: number, message: string, headers: Record<string, string> = {}) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try {
    // Next may use an internal hostname in request.url behind a proxy. The Host
    // header is the public destination used by the browser, not x-forwarded-host.
    const source = new URL(origin || '');
    sameOrigin = source.host === request.headers.get('host') && source.protocol === new URL(request.url).protocol;
  } catch {}
  if (!sameOrigin) return reply(403, 'Please submit this form from our website.');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply(415, 'Send this form as JSON.');
  if (!getContactConfig().ready) return reply(503, 'This form is not open yet. Please use the official contact links.');
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400, 'Please complete the form.');
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return reply(413, 'Your message is too long. Please shorten it.'); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return reply(400, 'Please check the form and try again.'); }
  const result = validateContact(input);
  if (!result.ok) return reply(400, result.message);
  const success = result.kind === 'mailing' ? 'Your signup request has been recorded.' : 'Your booking enquiry has been received. This is not a confirmed booking.';
  if (result.honeypot) return reply(200, success);
  // Vercel supplies this header. Other environments share one conservative rate bucket.
  const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
  const clientHash = createHmac('sha256', process.env.SUPABASE_SECRET_KEY!).update(ip).digest('hex');
  try {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
    });
    const { error } = await client.rpc('submit_site_contact', {
      p_kind: result.kind, p_payload: result.payload, p_client_hash: clientHash,
    });
    if (error) {
      if (error.code === 'P0001' && error.message === 'contact_rate_limit') return reply(429, 'Please wait ten minutes before sending another request.', { 'Retry-After': '600' });
      return reply(503, 'We could not save your request. Please try again later or use the official contact links.');
    }
    return reply(200, success);
  } catch { return reply(503, 'We could not save your request. Please try again later or use the official contact links.'); }
}
