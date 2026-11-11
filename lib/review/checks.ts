import { formsReady } from '../email/settings.ts';
export type Check = { status: 'ready'|'pending'|'unavailable'; message: string };
export type ReviewReport = {
  connection: Check; schema: Check; forms: Check; checkout: Check; email: Check; missing: string[];
};
type Environment = Record<string,string|undefined>;
const requiredPaths = ['/mailing_list_signups','/booking_enquiries','/contact_rate_limits','/rpc/submit_site_contact_v2','/contact_email_outbox','/contact_unsubscribe_tokens','/rpc/confirm_contact_subscription','/rpc/unsubscribe_contact','/rpc/claim_contact_emails','/rpc/finish_contact_email','/rpc/record_contact_email_event'];

export async function checkProjectReadiness(env: Environment, fetcher: typeof fetch = fetch): Promise<ReviewReport> {
  const missing = ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','CONTACT_OPERATOR_NAME','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','EMAIL_TOKEN_SECRET','CRON_SECRET'].filter(name=>!env[name]?.trim());
  if (env.CONTACT_PRIVACY_APPROVED !== 'true') missing.push('CONTACT_PRIVACY_APPROVED');
  for(const flag of ['CONTACT_DATABASE_VERIFIED','EMAIL_SENDER_VERIFIED','EMAIL_DELIVERY_VERIFIED','EMAIL_SENDING_ENABLED','EMAIL_RETRY_SCHEDULE_VERIFIED'])if(env[flag]!=='true')missing.push(flag);
  if (env.CONTACT_FORMS_ENABLED !== 'true') missing.push('CONTACT_FORMS_ENABLED');
  const report: ReviewReport = {
    connection: {status:'pending',message:'Supabase URL and publishable key are needed for this check.'},
    schema: {status:'pending',message:'The server-only key and all three database migrations must be checked.'},
    forms: {status:'pending',message:'Contact forms are not ready for live submissions.'},
    checkout: {status:'pending',message:'Sales are disabled. Price, Yoco verification and private delivery are still needed.'},
    email: {status:'pending',message:'Transactional delivery is implemented but must be verified; newsletters are not enabled.'},
    missing,
  };
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return report;
  let endpoint: URL;
  try {
    endpoint = new URL('/rest/v1/',env.SUPABASE_URL);
    if(endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error();
  } catch {report.connection={status:'unavailable',message:'Check the Supabase project URL. It must be an HTTPS API URL.'};return report;}
  async function probe(key: string) {
    const headers: Record<string,string> = {apikey:key,Accept:'application/openapi+json'};
    // Legacy JWT keys need their role passed to PostgREST explicitly.
    if(key.startsWith('eyJ')) headers.Authorization=`Bearer ${key}`;
    return fetcher(endpoint,{headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  }
  try {
    const connection=await probe(env.SUPABASE_PUBLISHABLE_KEY);
    if(!connection.ok){report.connection={status:'unavailable',message:`Supabase returned HTTP ${connection.status}. Check the project status and publishable key.`};return report;}
    const publicSchema=await connection.json();
    if(!publicSchema.paths || typeof publicSchema.paths !== 'object') throw new Error();
    report.connection={status:'ready',message:'Vercel can reach the Supabase Data API with the publishable key.'};
    if(!env.SUPABASE_SECRET_KEY) return report;
    const response=await probe(env.SUPABASE_SECRET_KEY);
    if(!response.ok){report.schema={status:'unavailable',message:`Server-key check returned HTTP ${response.status}. Check the server-only secret key.`};return report;}
    const schema=await response.json();
    if(!requiredPaths.every(path=>Object.hasOwn(schema.paths||{},path))){report.schema={status:'pending',message:'The required tables or submission function are not visible. Check all three migrations and server-key permissions.'};return report;}
    report.schema={status:'ready',message:'Contact storage, email queue and submission/delivery functions are visible. No records were read or written.'};
    if(missing.length===0 && formsReady(env)) report.forms={status:'ready',message:'Configuration and schema checks passed. A controlled signup and booking test is still required.'};
    if(!formsReady(env))report.forms={status:'pending',message:'Complete privacy, database and delivery verification before opening forms.'};
    if(env.EMAIL_DELIVERY_VERIFIED==='true'&&env.EMAIL_SENDER_VERIFIED==='true'&&env.RESEND_API_KEY)report.email={status:'ready',message:'Transactional delivery is configured and marked verified. This read-only check does not prove a new email was delivered.'};

  } catch {const key=report.connection.status==='ready'?'schema':'connection';report[key]={status:'unavailable',message:'The API check could not complete. Check connectivity, project status and configuration.'};}
  return report;
}
