// Local E2E: real application + PostgreSQL-compatible PGlite, a local Data API
// adapter, and stubbed third-party iframe documents. Never writes to live Supabase.
import { chromium } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';

const db = new PGlite(); let failDatabase = false, app, browser;
const deliveredMessages=[];
const rpc={submit_site_contact_v2:['p_kind','p_payload','p_client_hash','p_email_hash','p_request_id','p_fingerprint','p_confirmation_hash','p_unsubscribe_hash','p_jobs'],claim_contact_emails:['p_limit'],finish_contact_email:['p_id','p_lease','p_provider_id','p_error','p_retryable'],record_contact_email_event:['p_event_id','p_provider_id','p_type'],confirm_contact_subscription:['p_hash'],unsubscribe_contact:['p_hash']};
const server = createServer(async (req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;res.setHeader('Content-Type','application/json');
 if(req.url==='/mock-email'){
  const providerId=randomUUID(),message=JSON.parse(body);deliveredMessages.push({...message,providerId});
  await db.query('select public.record_contact_email_event($1,$2,$3)',[`early-${providerId}`,providerId,'email.delivered']);
  res.end(JSON.stringify({id:providerId}));return;
 }
 const fn=req.url?.split('/').pop(),keys=rpc[fn];
 if(!keys){res.writeHead(404);res.end();return;}
 if(req.headers.apikey!=='local-test-key'){res.writeHead(401);res.end();return;}
 if(failDatabase&&fn==='submit_site_contact_v2'){res.writeHead(503);res.end(JSON.stringify({code:'unavailable',message:'Local fixture unavailable'}));return;}
 try{const data=JSON.parse(body),values=keys.map(k=>typeof data[k]==='object'&&data[k]!==null?JSON.stringify(data[k]):data[k]);const placeholders=values.map((_,i)=>`$${i+1}`).join(',');
  const result=await db.query(`select * from public.${fn}(${placeholders})`,values);
  const value=fn==='claim_contact_emails'?result.rows:result.rows[0]?.[fn]??null;res.end(JSON.stringify(value));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({code:error.code,message:error.message}));}
});
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of ['202611100001_contacts.sql','202611100002_contact_submission.sql','202611110003_contact_email.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const apiPort = server.address().port, port = process.env.AUDIT_PORT || '3018';
  const base = `http://127.0.0.1:${port}`;
  const temp=await mkdtemp(`${tmpdir()}/cjay-mail-fixture-`),hook=`${temp}/fetch.mjs`;
  await writeFile(hook,`const original=globalThis.fetch;globalThis.fetch=(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(url==='https://api.resend.com/emails')return original('http://127.0.0.1:${apiPort}/mock-email',init);return original(input,init)};`);
  app = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',port],{
    env:{...process.env, SUPABASE_URL:`http://127.0.0.1:${apiPort}`,SUPABASE_SECRET_KEY:'local-test-key',
      CONTACT_FORMS_ENABLED:'true',CONTACT_PRIVACY_APPROVED:'true',CONTACT_OPERATOR_NAME:'Local test operator',CONTACT_SUPPORT_EMAIL:'hello@cjaymnandi.co.za',CONTACT_DATABASE_VERIFIED:'true',EMAIL_DELIVERY_VERIFIED:'true',EMAIL_SENDER_VERIFIED:'true',EMAIL_RETRY_SCHEDULE_VERIFIED:'true',EMAIL_SENDING_ENABLED:'true',EMAIL_TOKEN_SECRET:'test-only-secret-'.repeat(4),RESEND_API_KEY:'local-email-key',RESEND_WEBHOOK_SECRET:'whsec_'+Buffer.from('a'.repeat(32)).toString('base64'),CRON_SECRET:'local-cron-key',NODE_OPTIONS:`${process.env.NODE_OPTIONS||''} --import=${pathToFileURL(hook).href}`},
    stdio:['ignore','pipe','pipe'],
  });
  let appOutput='';app.stdout.on('data',d=>{appOutput+=d});app.stderr.on('data',d=>{appOutput+=d});
  let ready=false;
  for(let i=0;i<40;i++){try {if((await fetch(base)).ok){ready=true;break}}catch{}await delay(500)}
  if(!ready)throw new Error(`Local application did not start. ${appOutput.slice(-2000)}`);
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(open.spotify.com|www.youtube.com)\/embed\//,r=>r.fulfill({contentType:'text/html',body:'<html><body>External player layout fixture</body></html>'}));
  async function navigate(name,width){if(name==='CONNECT'){await page.getByRole('button',{name:'STAY CONNECTED',exact:true}).click();await page.locator('dialog[open]').waitFor();return;}name=({STORE:'BUY',ARCHIVE:'CONTENT'})[name]||name;if(width<1100)await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation',{name:'Website navigation'}).getByRole('button',{name,exact:true}).click();await page.locator('dialog[open]').waitFor();await page.waitForTimeout(350);}
  async function close(){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});}
  await mkdir('/tmp/cjay-audit',{recursive:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(base);
    assert.deepEqual(await page.locator('#website-navigation button').allTextContents(),['HOME','BUY','ABOUT','MUSIC','CONTENT','SHOP','EVENTS','BOOKINGS']);
    for(const name of ['SHOP','EVENTS']){await navigate(name,viewport.width);await page.locator('dialog h2').waitFor();await close();}
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=3&&!v.paused&&v.currentTime>0});
    await page.locator('.lax-audio').dblclick();
    await page.waitForFunction(()=>document.querySelector('.lax-audio').getAttribute('aria-pressed')===String(!document.querySelector('audio').paused));
    assert.equal(await page.locator('.lax-media-notice').count(),0);
    if(!await page.locator('audio').first().evaluate(a=>a.paused))await page.locator('.lax-audio').click();
    await page.getByRole('button',{name:/SOUND OFF/}).click();
    await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>0);
    await navigate('MUSIC',viewport.width);await page.locator('dialog').getByRole('heading',{name:'LAX!',exact:true}).waitFor();assert.equal(await page.locator('audio').first().evaluate(a=>a.paused),true);
    await page.locator('dialog audio').evaluate(async a=>{window.__musicAudio=a;await a.play()});
    await page.waitForFunction(()=>!window.__musicAudio.paused&&window.__musicAudio.currentTime>0);
    await page.getByRole('button',{name:'EXPLORE THE ARCHIVE'}).click();await page.locator('.archive').waitFor();
    await page.waitForFunction(()=>window.__musicAudio.paused);
    await page.goBack();await page.locator('dialog').getByRole('heading',{name:'LAX!',exact:true}).waitFor();
    await page.goForward();await page.locator('.archive').waitFor();await close();
    await navigate('STORE',viewport.width);
    await page.waitForFunction(()=>{const img=document.querySelector('.lax-cover img');return img?.complete&&img.naturalWidth>0});
    assert.equal(await page.getByRole('button',{name:'CHECKOUT COMING SOON'}).isDisabled(),true);await close();
    await navigate('CONNECT',viewport.width);
    const signup=page.getByRole('form',{name:'Mailing-list signup'});await signup.getByLabel('EMAIL ADDRESS').fill(`fan${viewport.width}@example.com`);
    await signup.getByRole('checkbox').check();await signup.getByRole('button',{name:'JOIN THE MAILING LIST'}).click();
    await signup.getByRole('status').filter({hasText:'recorded'}).waitFor();await close();
    await navigate('BOOKINGS',viewport.width);
    const booking=page.getByRole('form',{name:'Booking enquiry'});await booking.getByLabel('YOUR NAME').fill('Test promoter');await booking.getByLabel('EMAIL ADDRESS').fill(`promoter${viewport.width}@example.com`);await booking.getByLabel('TELL US ABOUT YOUR EVENT').fill('Local automated test enquiry.');
    await page.getByRole('button',{name:'SUPPORT',exact:true}).click();await page.getByRole('heading',{name:'HERE TO HELP.'}).waitFor();
    await page.goBack();await booking.waitFor();assert.equal(await booking.getByLabel('TELL US ABOUT YOUR EVENT').inputValue(),'Local automated test enquiry.');
    await close();await navigate('BOOKINGS',viewport.width);assert.equal(await booking.getByLabel('YOUR NAME').inputValue(),'Test promoter');
    failDatabase=true;await booking.getByRole('button',{name:'SEND ENQUIRY'}).click();await booking.getByRole('status').filter({hasText:'could not save'}).waitFor();
    assert.equal(await booking.getByLabel('TELL US ABOUT YOUR EVENT').inputValue(),'Local automated test enquiry.');
    failDatabase=false;await booking.getByRole('button',{name:'SEND ENQUIRY'}).click();await booking.getByRole('status').filter({hasText:'not a confirmed booking'}).waitFor();
    await page.screenshot({path:`/tmp/cjay-audit/booking-${viewport.width}.png`,fullPage:true});
    await page.getByRole('button',{name:'SUPPORT',exact:true}).click();await page.goBack();await booking.getByRole('status').filter({hasText:'not a confirmed booking'}).waitFor();
    assert.equal(await booking.getByRole('button',{name:'RECEIVED'}).isDisabled(),true);await close();
    if(viewport.width<850)assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).evaluate(e=>e===document.activeElement),true);
    await navigate('CONNECT',viewport.width);await page.getByRole('form',{name:'Mailing-list signup'}).getByRole('status').filter({hasText:'recorded'}).waitFor();await close();
    await navigate('ARCHIVE',viewport.width);assert.equal(await page.locator('.archive iframe').count(),5);await close();
    await navigate('ABOUT',viewport.width);await page.getByRole('button',{name:'SUPPORT',exact:true}).click();await page.getByRole('heading',{name:'HERE TO HELP.'}).waitFor();await page.getByRole('link',{name:'EMAIL SUPPORT'}).waitFor();await close();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('video').paused);await page.reload();await page.waitForTimeout(500);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.equal((await db.query('select count(*)::int as total from mailing_list_signups')).rows[0].total,2);
  assert.equal((await db.query('select count(*)::int as total from booking_enquiries')).rows[0].total,2);
  const submit=(data,headers={})=>fetch(`${base}/api/contact`,{method:'POST',headers:{'content-type':'application/json',origin:base,'idempotency-key':randomUUID(),...headers},body:JSON.stringify(data)});
  assert.equal((await submit({kind:'mailing',email:'fan@example.com',consent:false})).status,400);
  assert.equal((await submit({}, {origin:'https://untrusted.example'})).status,403);
  assert.equal((await submit({}, {'content-type':'text/plain'})).status,415);
  assert.equal((await submit({message:'x'.repeat(33000)})).status,413);
  assert.equal((await fetch(`${base}/api/contact`)).status,405);
  assert.equal((await submit({kind:'mailing',email:'fan1440@example.com',consent:true})).status,200);
  assert.equal((await submit({kind:'mailing',email:'over-limit@example.com',consent:true})).status,429);
  assert.equal((await db.query('select count(*)::int as total from mailing_list_signups')).rows[0].total,2);
  await page.goto(`${base}/privacy`);await page.getByText('Local test operator operates this website.',{exact:false}).waitFor();
  await page.goto(`${base}/archive`);await page.locator('dialog[open] .archive').waitFor();
  for(let i=0;i<40;i++){const state=await db.query("select count(*)::int n from contact_email_outbox where status in ('pending','sending')");if(state.rows[0].n===0)break;await delay(250)}
  assert.equal(deliveredMessages.length,6);assert.ok(deliveredMessages.every(m=>m.from==='C.JayMnandi <hello@cjaymnandi.co.za>'));
  const confirmationMail=deliveredMessages.find(m=>m.to[0]==='fan1440@example.com');
  const confirmToken=confirmationMail.text.match(/confirm#token=([\w-]+)/)[1],unsubscribeToken=confirmationMail.text.match(/unsubscribe#token=([\w-]+)/)[1];
  await page.goto(`${base}/confirm#token=${confirmToken}`);await page.getByRole('button',{name:'CONFIRM MY EMAIL'}).waitFor();
  assert.equal((await db.query("select status from mailing_list_signups where email='fan1440@example.com'")).rows[0].status,'pending');
  await page.getByRole('button',{name:'CONFIRM MY EMAIL'}).click();await page.getByRole('status').filter({hasText:'Your email is confirmed'}).waitFor();
  await page.goto(`${base}/unsubscribe#token=${unsubscribeToken}`);await page.getByRole('button',{name:'UNSUBSCRIBE',exact:true}).click();await page.getByRole('status').filter({hasText:'unsubscribe request is complete'}).waitFor();
  assert.equal((await db.query("select status from mailing_list_signups where email='fan1440@example.com'")).rows[0].status,'unsubscribed');
  const eventBody=JSON.stringify({type:'email.delivered',data:{email_id:confirmationMail.providerId}}),timestamp=String(Math.floor(Date.now()/1000)),eventId='verified-route-test',signature=createHmac('sha256',Buffer.from('a'.repeat(32))).update(`${eventId}.${timestamp}.${eventBody}`).digest('base64');
  assert.equal((await fetch(`${base}/api/email/events`,{method:'POST',body:eventBody})).status,401);
  for(let i=0;i<2;i++)assert.equal((await fetch(`${base}/api/email/events`,{method:'POST',headers:{'svix-id':eventId,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`},body:eventBody})).status,200);
  assert.equal((await db.query('select count(*)::int n from contact_email_events where id=$1',[eventId])).rows[0].n,1);
  assert.equal((await fetch(`${base}/api/email/dispatch`)).status,401);
  assert.equal((await fetch(`${base}/api/email/dispatch`,{headers:{Authorization:'Bearer local-cron-key'}})).status,200);
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile landing, media/audio, eight navigation entries, cover, disabled checkout, forms -> real API -> local SQL storage -> encrypted outbox -> local email adapter -> signed delivery callback, confirmation and unsubscribe, preserved drafts/receipts, browser Back/Forward, inline music playback/cleanup, error/retry, rate limit, CSRF, payload limits, private support/privacy, reduced motion and direct archive route.');
  console.log('External provider iframe documents were stubbed. Live Vercel, Supabase, Spotify and YouTube remain UNVERIFIED. No live records were created.');
} finally {
  await browser?.close();if(app)app.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));await db.close();
}
