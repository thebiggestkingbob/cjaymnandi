// Explicit, controlled live verification. Never enables production flags.
import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {prepareMessages} from '../lib/email/messages.ts';
import {unseal} from '../lib/email/crypto.ts';
import {sendTransactional} from '../lib/email/provider.ts';
import {officialEmail} from '../lib/email/settings.ts';
const required=['SUPABASE_URL','SUPABASE_SECRET_KEY','RESEND_API_KEY','RESEND_DOMAIN_ID','EMAIL_TOKEN_SECRET'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length){console.error(`Live verification blocked: missing ${missing.join(', ')}. Set values securely; do not send keys in chat.`);process.exit(1)}
if(!process.argv.includes('--send-test-email')){console.error('Use --send-test-email to authorise two labelled booking-test messages to hello@cjaymnandi.co.za. No other recipients are used.');process.exit(1)}
if(process.env.CONTACT_FORMS_ENABLED==='true'||process.env.EMAIL_SENDING_ENABLED==='true'){console.error('Keep production collection and background sending off during the controlled verification.');process.exit(1)}
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const reference=randomUUID();
try{
 const domain=await fetch(`https://api.resend.com/domains/${encodeURIComponent(process.env.RESEND_DOMAIN_ID)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`},signal:AbortSignal.timeout(15000)});
 if(!domain.ok)throw new Error('Domain verification could not be checked. The test key needs the appropriate Resend read permissions.');
 const domainData=await domain.json();if(domainData.status!=='verified'||domainData.name!=='cjaymnandi.co.za')throw new Error('The cjaymnandi.co.za sending domain is not verified.');
 const payload={name:'AUTOMATED DELIVERY VERIFICATION',email:officialEmail,message:`Controlled test ${reference}. No customer data.`,consent:false};
 const prepared=prepareMessages('booking',payload,reference,process.env.EMAIL_TOKEN_SECRET);
 const hash=text=>createHash('sha256').update(text).digest('hex');
 const {error}=await db.rpc('submit_site_contact_v2',{p_kind:'booking',p_payload:payload,p_client_hash:hash(`live-test-ip:${reference}`),p_email_hash:hash(`live-test-email:${reference}`),p_request_id:reference,p_fingerprint:hash(JSON.stringify(payload)),p_confirmation_hash:prepared.confirmationHash,p_unsubscribe_hash:prepared.unsubscribeHash,p_jobs:prepared.jobs});
 if(error)throw new Error('Database submission failed; check the three migrations and server-key permissions.');
 const saved=await db.from('booking_enquiries').select('id').eq('request_id',reference);
 if(saved.error||saved.data?.length!==1)throw new Error('Database persistence could not be verified.');
 const jobs=await db.from('contact_email_outbox').select('id,payload').eq('request_id',reference);
 if(jobs.error||jobs.data?.length!==2)throw new Error('Atomic email queue could not be verified.');
 console.log(`Database persistence verified. Controlled test reference: ${reference}`);
 for(const job of jobs.data){
  const lease=randomUUID();const locked=await db.from('contact_email_outbox').update({status:'sending',attempts:1,lease_token:lease,lease_until:new Date(Date.now()+120000).toISOString()}).eq('id',job.id).eq('status','pending').select('id');
  if(locked.error||locked.data?.length!==1)throw new Error('Test email lease failed.');
  const message=unseal(job.payload,process.env.EMAIL_TOKEN_SECRET);if(message.to!==officialEmail)throw new Error('Unexpected test recipient.');
  const providerId=await sendTransactional(message,`contact-${job.id}`,process.env.RESEND_API_KEY);
  const ack=await db.rpc('finish_contact_email',{p_id:job.id,p_lease:lease,p_provider_id:providerId,p_error:null,p_retryable:false});if(ack.error)throw new Error('Provider acceptance could not be saved.');
  let delivered=false;
  for(let attempt=0;attempt<12;attempt++){
   const response=await fetch(`https://api.resend.com/emails/${encodeURIComponent(providerId)}`,{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('Delivery lookup failed. Provider acceptance alone is not delivery verification.');
   const event=await response.json();if(event.last_event==='delivered'){delivered=true;break}if(['bounced','failed','complained'].includes(event.last_event))throw new Error(`Test email was not delivered (${event.last_event}).`);await delay(5000);
  }
  if(!delivered)throw new Error('Provider delivery was not confirmed within the test window.');
  console.log(`Provider reports delivery for test job ${job.id}.`);
 }
 const final=await db.from('contact_email_outbox').select('status').eq('request_id',reference);
 if(final.error||!final.data.every(job=>job.status==='delivered'))throw new Error('Provider delivery succeeded, but the signed webhook has not recorded it. Verify the webhook configuration.');
 console.log('Database persistence, provider delivery, and signed delivery-webhook persistence verified. Check the hello@ mailbox for receipt before approving launch. Flags remain unchanged. Labelled test records were retained for audit.');
}catch(error){console.error(error instanceof Error?error.message:'Live verification failed.');console.error(`Production remains disabled. Inspect only the labelled test reference ${reference}; never reset customer tables.`);process.exitCode=1}
