import { createHmac, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { after } from 'next/server';
import { prepareMessages } from '../../../lib/email/messages';
import { dispatchEmails } from '../../../lib/email/worker';
import { getContactConfig } from '../../../lib/contact/config';
import { validateContact } from '../../../lib/contact/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;
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
  const requestId=request.headers.get('idempotency-key')||'';
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId))return reply(400,'Please reload the form and try again.');
  const success = result.kind === 'mailing' ? 'Your signup request has been recorded. Check your inbox for a confirmation link if needed.' : 'Your booking enquiry has been received. This is not a confirmed booking.';
  if (result.honeypot) return reply(200, success);
  // Vercel supplies this header. Other environments share one conservative rate bucket.
  const ip = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
  const clientHash = createHmac('sha256', process.env.EMAIL_TOKEN_SECRET!).update(`ip:${ip}`).digest('hex');
  try {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
    });
    const prepared=prepareMessages(result.kind,result.payload,requestId,process.env.EMAIL_TOKEN_SECRET!);
    const { error } = await client.rpc('submit_site_contact_v2', {
      p_kind: result.kind,p_payload:result.payload,p_client_hash:clientHash,
      p_email_hash:createHmac('sha256',process.env.EMAIL_TOKEN_SECRET!).update(`email:${result.payload.email}`).digest('hex'),
      p_request_id:requestId,p_fingerprint:createHash('sha256').update(`${result.kind}:${JSON.stringify(result.payload)}`).digest('hex'),
      p_confirmation_hash:prepared.confirmationHash,p_unsubscribe_hash:prepared.unsubscribeHash,p_jobs:prepared.jobs,
    });
    if (error) {
      if (error.code === 'P0001' && error.message === 'contact_rate_limit') return reply(429, 'Please wait ten minutes before sending another request.', { 'Retry-After': '600' });
      console.error('contact_submission',{reference:requestId,code:error.code||'database_error'});
      if(error.code==='22023'&&error.message==='request_conflict')return reply(409,'This form changed. Please reload it before retrying.');
      return reply(503, 'We could not save your request. Please try again later or use the official contact links.');
    }
    after(async()=>{try{await dispatchEmails()}catch{console.error('contact_email_worker',{code:'dispatch_failed'})}});
    return Response.json({message:success,reference:requestId},{headers:{'Cache-Control':'no-store','X-Request-ID':requestId}});
  } catch { console.error('contact_submission',{reference:requestId,code:'request_failed'});return reply(503, 'We could not save your request. Please try again later or use the official contact links.'); }
}
