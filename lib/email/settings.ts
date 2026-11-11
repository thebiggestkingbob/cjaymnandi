export const officialEmail = 'hello@cjaymnandi.co.za';
export const canonicalSite = 'https://www.cjaymnandi.co.za';
export const consentVersion = 'lax-marketing-v2';

export function emailConfigured(env: Record<string,string|undefined>) {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_TOKEN_SECRET && env.EMAIL_TOKEN_SECRET.length>=32 && env.RESEND_WEBHOOK_SECRET);
}
export function formsReady(env: Record<string,string|undefined>) {
  return env.CONTACT_FORMS_ENABLED==='true' && env.CONTACT_PRIVACY_APPROVED==='true' &&
    env.EMAIL_RETRY_SCHEDULE_VERIFIED==='true' && Boolean(env.CRON_SECRET) && env.EMAIL_SENDING_ENABLED==='true' && env.CONTACT_DATABASE_VERIFIED==='true' && env.EMAIL_DELIVERY_VERIFIED==='true' && env.EMAIL_SENDER_VERIFIED==='true' &&
    Boolean(env.CONTACT_OPERATOR_NAME?.trim() && env.SUPABASE_URL && env.SUPABASE_SECRET_KEY && emailConfigured(env));
}
