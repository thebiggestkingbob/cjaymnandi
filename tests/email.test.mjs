import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {newToken,tokenHash,seal,unseal,verifyWebhook} from '../lib/email/crypto.ts';
import {prepareMessages} from '../lib/email/messages.ts';
import {sendTransactional,DeliveryError} from '../lib/email/provider.ts';
import {formsReady,officialEmail} from '../lib/email/settings.ts';
const secret='test-only-'.repeat(5);
async function database(){const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');for(const file of ['202611100001_contacts.sql','202611100002_contact_submission.sql','202611110003_contact_email.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));return db}
async function submit(db,kind,payload,options={}){
 const id=options.id||randomUUID(),prepared=prepareMessages(kind,payload,id,secret);
 const client=options.client||tokenHash(randomUUID()),emailHash=tokenHash(`email:${payload.email}`),fingerprint=options.fingerprint||createHash('sha256').update(JSON.stringify([kind,payload])).digest('hex');
 const result=await db.query('select public.submit_site_contact_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) as receipt',[kind,JSON.stringify(payload),client,emailHash,id,fingerprint,prepared.confirmationHash,prepared.unsubscribeHash,JSON.stringify(prepared.jobs)]);
 return {id,prepared,result,client};
}

test('production collection cannot open with legacy flags or merely a working mailbox',()=>{
 assert.equal(officialEmail,'hello@cjaymnandi.co.za');assert.equal(formsReady({CONTACT_FORMS_ENABLED:'true',CONTACT_PRIVACY_APPROVED:'true',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test',CONTACT_OPERATOR_NAME:'Artist'}),false);
 const env={CONTACT_FORMS_ENABLED:'true',CONTACT_PRIVACY_APPROVED:'true',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SECRET_KEY:'test',CONTACT_OPERATOR_NAME:'Artist',RESEND_API_KEY:'test',EMAIL_TOKEN_SECRET:secret,RESEND_WEBHOOK_SECRET:'test',CRON_SECRET:'test-cron',EMAIL_RETRY_SCHEDULE_VERIFIED:'true',EMAIL_SENDING_ENABLED:'true',EMAIL_DELIVERY_VERIFIED:'true',EMAIL_SENDER_VERIFIED:'true',CONTACT_DATABASE_VERIFIED:'true'};
 assert.equal(formsReady(env),true);for(const flag of ['CONTACT_PRIVACY_APPROVED','EMAIL_DELIVERY_VERIFIED','EMAIL_SENDER_VERIFIED','CONTACT_DATABASE_VERIFIED'])assert.equal(formsReady({...env,[flag]:'false'}),false);
});
test('tokens and outbox payloads are private; bookings never imply marketing consent',()=>{
 const token=newToken();assert.equal(token.length,43);assert.notEqual(tokenHash(token),token);
 const encrypted=seal({token},secret);assert.equal(encrypted.includes(token),false);assert.equal(unseal(encrypted,secret).token,token);assert.throws(()=>unseal(encrypted,'wrong-secret'.repeat(4)));
 const booking=prepareMessages('booking',{email:'test@example.com',name:'Test',message:'Event'},randomUUID(),secret);
 assert.equal(booking.jobs.length,2);assert.ok(!booking.jobs.some(j=>j.kind==='mailing_confirmation'));
 assert.equal(booking.jobs.find(j=>j.kind==='booking_owner').recipient,officialEmail);
 assert.equal(prepareMessages('booking',{email:'test@example.com',consent:true},randomUUID(),secret).jobs.length,3);
});
test('transactional provider uses fixed sender and stable idempotency; failures are typed without leaking provider bodies',async()=>{
 const message={to:'hello@cjaymnandi.co.za',reply_to:officialEmail,subject:'Test',text:'Test'};let capture;
 assert.equal(await sendTransactional(message,'stable-id','test-key',async(url,init)=>{capture={url,init};return Response.json({id:'provider-1'})}),'provider-1');
 assert.equal(capture.url,'https://api.resend.com/emails');assert.equal(capture.init.headers['Idempotency-Key'],'stable-id');assert.match(JSON.parse(capture.init.body).from,/hello@cjaymnandi.co.za/);
 await assert.rejects(sendTransactional(message,'same','key',async()=>new Response('private error',{status:503})),e=>e instanceof DeliveryError&&e.retryable&&!e.message.includes('private error'));
 await assert.rejects(sendTransactional(message,'same','key',async()=>new Response('',{status:400})),e=>!e.retryable);
});
test('delivery webhook rejects bad signatures and expired timestamps',()=>{
 const key=Buffer.from('a'.repeat(32)),secret=`whsec_${key.toString('base64')}`,now=Date.now(),timestamp=String(Math.floor(now/1000)),body='{"type":"email.delivered"}',id='event-1';
 const signature=createHmac('sha256',key).update(`${id}.${timestamp}.${body}`).digest('base64');const headers=new Headers({'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`});
 assert.equal(verifyWebhook(body,headers,secret,now),true);assert.equal(verifyWebhook(body+'x',headers,secret,now),false);assert.equal(verifyWebhook(body,headers,secret,now+301000),false);
});

test('database persistence, private roles, idempotency, double opt-in, unsubscribe and mailbox rate limits',async()=>{
 const db=await database();try{
  for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from public.contact_email_outbox'),/permission denied/);await assert.rejects(db.query("select public.unsubscribe_contact('hash')"),/permission denied/);await db.exec('reset role')}
  await db.exec('set role service_role');
  const payload={email:'fan@example.com',consent:true},first=await submit(db,'mailing',payload);
  const job=(await db.query('select * from public.contact_email_outbox')).rows[0];assert.equal(job.status,'pending');assert.equal(job.payload.includes('https://'),false);
  const mail=unseal(job.payload,secret),confirmation=mail.text.match(/confirm#token=([\w-]+)/)[1],unsubscribe=mail.text.match(/unsubscribe#token=([\w-]+)/)[1];
  assert.equal((await db.query('select status from public.mailing_list_signups')).rows[0].status,'pending');
  await submit(db,'mailing',payload,{id:first.id});await submit(db,'mailing',payload);assert.equal((await db.query('select count(*)::int n from public.contact_email_outbox')).rows[0].n,1);
  await assert.rejects(submit(db,'mailing',payload,{id:first.id,fingerprint:'b'.repeat(64)}),/request_conflict/);
  await db.query("update public.mailing_list_signups set confirmation_expires_at=now()-interval '1 second'");assert.equal((await db.query('select public.confirm_contact_subscription($1) ok',[tokenHash(confirmation)])).rows[0].ok,false);
  await db.query("update public.mailing_list_signups set confirmation_expires_at=now()+interval '1 hour'");assert.equal((await db.query('select public.confirm_contact_subscription($1) ok',[tokenHash(confirmation)])).rows[0].ok,true);
  await db.query('select public.unsubscribe_contact($1)',[tokenHash(unsubscribe)]);await db.query('select public.unsubscribe_contact($1)',[tokenHash(unsubscribe)]);
  assert.equal((await db.query('select status from public.mailing_list_signups')).rows[0].status,'unsubscribed');assert.equal((await db.query('select public.confirm_contact_subscription($1) ok',[tokenHash(confirmation)])).rows[0].ok,false);
  await submit(db,'mailing',payload);assert.equal((await db.query('select count(*)::int n from public.contact_email_outbox')).rows[0].n,1);
  const booking={name:'Test',email:'booking@example.com',message:'Event',consent:false};const saved=await submit(db,'booking',booking);await submit(db,'booking',booking,{id:saved.id});
  assert.equal((await db.query('select count(*)::int n from public.booking_enquiries')).rows[0].n,1);assert.equal((await db.query('select marketing_consent from public.booking_enquiries')).rows[0].marketing_consent,false);
  assert.equal((await db.query('select count(*)::int n from public.mailing_list_signups')).rows[0].n,1);
  for(let i=0;i<5;i++)await submit(db,'booking',{...booking,email:'limited@example.com'});
  await assert.rejects(submit(db,'booking',{...booking,email:'limited@example.com'}),/contact_rate_limit/);
  assert.equal((await db.query("select count(*)::int n from public.booking_enquiries where email='limited@example.com'")).rows[0].n,5);
  await submit(db,'mailing',{email:'resend@example.com',consent:true});let old=(await db.query("select * from public.mailing_list_signups where email='resend@example.com'")).rows[0];const oldHash=old.unsubscribe_hash;
  await db.query("update public.mailing_list_signups set confirmation_issued_at=now()-interval '2 hours' where id=$1",[old.id]);await submit(db,'mailing',{email:'resend@example.com',consent:true});assert.notEqual((await db.query('select unsubscribe_hash from public.mailing_list_signups where id=$1',[old.id])).rows[0].unsubscribe_hash,oldHash);
  await db.query('select public.unsubscribe_contact($1)',[oldHash]);assert.equal((await db.query('select status from public.mailing_list_signups where id=$1',[old.id])).rows[0].status,'unsubscribed');

 }finally{await db.close()}
});
test('durable outbox leases, retry backoff, early delivery events, duplicate webhooks and bounce suppression',async()=>{
 const db=await database();try{
  await db.exec('set role service_role');await submit(db,'mailing',{email:'delivery@example.com',consent:true});
  const first=(await db.query('select * from public.claim_contact_emails(3)')).rows[0];assert.equal((await db.query('select * from public.claim_contact_emails(3)')).rows.length,0);
  await db.query("select public.record_contact_email_event('early','provider-1','email.delivered')");await db.query('select public.finish_contact_email($1,$2,$3,null,false)',[first.id,first.lease_token,'provider-1']);
  assert.equal((await db.query('select status from public.contact_email_outbox')).rows[0].status,'delivered');
  await db.query("select public.record_contact_email_event('bounce','provider-1','email.bounced')");await db.query("select public.record_contact_email_event('bounce','provider-1','email.bounced')");await db.query("select public.record_contact_email_event('late','provider-1','email.delivered')");
  assert.equal((await db.query('select status from public.contact_email_outbox')).rows[0].status,'bounced');assert.equal((await db.query('select status from public.mailing_list_signups')).rows[0].status,'suppressed');
  await submit(db,'booking',{email:'delivery@example.com',name:'Test',message:'Transactional enquiry',consent:false});
  const jobs=(await db.query('select * from public.claim_contact_emails(3)')).rows;assert.equal(jobs.length,2);
  await db.query("select public.finish_contact_email($1,$2,null,'provider_http_503',true)",[jobs[0].id,jobs[0].lease_token]);assert.equal((await db.query('select * from public.claim_contact_emails(3)')).rows.length,0);
  await db.query("update public.contact_email_outbox set available_at=now()-interval '1 second' where id=$1",[jobs[0].id]);const retry=(await db.query('select * from public.claim_contact_emails(3)')).rows[0];assert.equal(retry.attempts,2);
  await db.query("select public.finish_contact_email($1,$2,null,'provider_http_400',false)",[retry.id,retry.lease_token]);
  await db.query("update public.contact_email_outbox set lease_until=now()-interval '1 second' where id=$1",[jobs[1].id]);const recovered=(await db.query('select * from public.claim_contact_emails(3)')).rows[0];assert.notEqual(recovered.lease_token,jobs[1].lease_token);
  await db.query('select public.finish_contact_email($1,$2,$3,null,false)',[jobs[1].id,jobs[1].lease_token,'stale-id']);assert.equal((await db.query('select provider_id from public.contact_email_outbox where id=$1',[jobs[1].id])).rows[0].provider_id,null);
  await db.query('update public.contact_email_outbox set attempts=6 where id=$1',[recovered.id]);await db.query('select * from public.claim_contact_emails(3)');assert.equal((await db.query('select status from public.contact_email_outbox where id=$1',[recovered.id])).rows[0].status,'sending');
  await db.query('select public.finish_contact_email($1,$2,$3,null,false)',[recovered.id,recovered.lease_token,'provider-2']);assert.equal((await db.query('select status from public.contact_email_outbox where id=$1',[recovered.id])).rows[0].status,'accepted');
  await submit(db,'mailing',{email:'cancel-in-flight@example.com',consent:true});const inflight=(await db.query('select * from public.claim_contact_emails(3)')).rows[0];
  const token=unseal(inflight.payload,secret).text.match(/unsubscribe#token=([\w-]+)/)[1];await db.query('select public.unsubscribe_contact($1)',[tokenHash(token)]);
  await db.query('select public.finish_contact_email($1,$2,$3,null,false)',[inflight.id,inflight.lease_token,'cancelled-provider']);const cancelled=(await db.query('select status,provider_id from public.contact_email_outbox where id=$1',[inflight.id])).rows[0];assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.provider_id,'cancelled-provider');assert.equal((await db.query("select consent from public.mailing_list_signups where email='cancel-in-flight@example.com'")).rows[0].consent,false);

 }finally{await db.close()}
});
