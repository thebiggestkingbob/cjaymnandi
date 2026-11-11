import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { unseal } from './crypto.ts';
import { sendTransactional,DeliveryError } from './provider.ts';
import type { EmailMessage } from './messages.ts';
export function privateDatabase(){if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SECRET_KEY)throw new Error('private_database_missing');return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)})}})}
export async function dispatchEmails(){
  if(process.env.EMAIL_SENDING_ENABLED!=='true'||process.env.EMAIL_DELIVERY_VERIFIED!=='true'||process.env.EMAIL_SENDER_VERIFIED!=='true'||!process.env.RESEND_API_KEY||!process.env.EMAIL_TOKEN_SECRET)return {processed:0,failed:0};
  const db=privateDatabase();const {data,error}=await db.rpc('claim_contact_emails',{p_limit:3});
  if(error){console.error('contact_email_worker',{code:'claim_failed'});return {processed:0,failed:1};}
  const outcomes=await Promise.all((data||[]).map(async(job:{id:string;lease_token:string;payload:string})=>{
    let providerId:string|null=null,code:string|null=null,retryable=false;
    try{const message=unseal<EmailMessage>(job.payload,process.env.EMAIL_TOKEN_SECRET!);providerId=await sendTransactional(message,`contact-${job.id}`,process.env.RESEND_API_KEY!)}
    catch(error){code=error instanceof DeliveryError?error.code:'payload_invalid';retryable=error instanceof DeliveryError&&error.retryable;}
    const {error:ackError}=await db.rpc('finish_contact_email',{p_id:job.id,p_lease:job.lease_token,p_provider_id:providerId,p_error:code,p_retryable:retryable});
    if(code||ackError)console.error('contact_email_worker',{jobId:job.id,code:ackError?'ack_failed':code});
    return Boolean(code||ackError);
  }));return {processed:outcomes.length,failed:outcomes.filter(Boolean).length};
}
