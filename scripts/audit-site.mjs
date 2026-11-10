// Local E2E: real application + PostgreSQL-compatible PGlite, a local Data API
// adapter, and stubbed third-party iframe documents. Never writes to live Supabase.
import { chromium } from '@playwright/test';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';

const db = new PGlite(); let failDatabase = false, app, browser;
const server = createServer(async (req, res) => {
  if (req.url !== '/rest/v1/rpc/submit_site_contact') {res.writeHead(404);res.end();return;}
  if (req.headers.apikey !== 'local-test-key') {res.writeHead(401);res.end();return;}
  let body = ''; for await (const chunk of req) body += chunk;
  res.setHeader('Content-Type','application/json');
  if (failDatabase) {res.writeHead(503);res.end(JSON.stringify({code:'unavailable',message:'Local fixture unavailable'}));return;}
  try {
    const data = JSON.parse(body);
    await db.query('select public.submit_site_contact($1,$2,$3)',[data.p_kind,JSON.stringify(data.p_payload),data.p_client_hash]);
    res.end('null');
  } catch(error) {res.writeHead(400);res.end(JSON.stringify({code:error.code,message:error.message}));}
});
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for(const file of ['202611100001_contacts.sql','202611100002_contact_submission.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const apiPort = server.address().port, port = process.env.AUDIT_PORT || '3018';
  const base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',port],{
    env:{...process.env, SUPABASE_URL:`http://127.0.0.1:${apiPort}`,SUPABASE_SECRET_KEY:'local-test-key',
      CONTACT_FORMS_ENABLED:'true',CONTACT_PRIVACY_APPROVED:'true',CONTACT_OPERATOR_NAME:'Local test operator',CONTACT_SUPPORT_EMAIL:'support@example.com'},
    stdio:['ignore','pipe','pipe'],
  });
  let appOutput='';app.stdout.on('data',d=>{appOutput+=d});app.stderr.on('data',d=>{appOutput+=d});
  let ready=false;
  for(let i=0;i<40;i++){try {if((await fetch(base)).ok){ready=true;break}}catch{}await delay(500)}
  if(!ready)throw new Error(`Local application did not start. ${appOutput.slice(-2000)}`);
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(open.spotify.com|www.youtube.com)\/embed\//,r=>r.fulfill({contentType:'text/html',body:'<html><body>External player layout fixture</body></html>'}));
  async function navigate(name,width){if(width<850)await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation',{name:'Website navigation'}).getByRole('button',{name,exact:true}).click();await page.locator('dialog[open]').waitFor();await page.waitForTimeout(350);}
  async function close(){await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});}
  await mkdir('/tmp/cjay-audit',{recursive:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(base);
    await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=3&&!v.paused&&v.currentTime>0});
    await page.getByRole('button',{name:/SOUND OFF/}).click();
    await page.waitForFunction(()=>!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>0);
    await navigate('MUSIC',viewport.width);await page.locator('dialog').getByRole('heading',{name:'LAX!',exact:true}).waitFor();assert.equal(await page.locator('audio').evaluate(a=>a.paused),true);await close();
    await navigate('STORE',viewport.width);
    await page.waitForFunction(()=>{const img=document.querySelector('.lax-cover img');return img?.complete&&img.naturalWidth>0});
    assert.equal(await page.getByRole('button',{name:'CHECKOUT COMING SOON'}).isDisabled(),true);await close();
    await navigate('CONNECT',viewport.width);
    const signup=page.getByRole('form',{name:'Mailing-list signup'});await signup.getByLabel('EMAIL ADDRESS').fill(`fan${viewport.width}@example.com`);
    await signup.getByRole('checkbox').check();await signup.getByRole('button',{name:'JOIN THE MAILING LIST'}).click();
    await signup.getByRole('status').filter({hasText:'recorded'}).waitFor();await close();
    await navigate('BOOKINGS',viewport.width);
    const booking=page.getByRole('form',{name:'Booking enquiry'});await booking.getByLabel('YOUR NAME').fill('Test promoter');await booking.getByLabel('EMAIL ADDRESS').fill(`promoter${viewport.width}@example.com`);await booking.getByLabel('TELL US ABOUT YOUR EVENT').fill('Local automated test enquiry.');
    failDatabase=true;await booking.getByRole('button',{name:'SEND ENQUIRY'}).click();await booking.getByRole('status').filter({hasText:'could not save'}).waitFor();
    assert.equal(await booking.getByLabel('TELL US ABOUT YOUR EVENT').inputValue(),'Local automated test enquiry.');
    failDatabase=false;await booking.getByRole('button',{name:'SEND ENQUIRY'}).click();await booking.getByRole('status').filter({hasText:'not a confirmed booking'}).waitFor();
    await page.screenshot({path:`/tmp/cjay-audit/booking-${viewport.width}.png`,fullPage:true});await close();
    if(viewport.width<850)assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).evaluate(e=>e===document.activeElement),true);
    await navigate('ARCHIVE',viewport.width);assert.equal(await page.locator('.archive iframe').count(),5);await close();
    await navigate('ABOUT',viewport.width);await page.getByRole('button',{name:'SUPPORT',exact:true}).click();await page.getByRole('heading',{name:'HERE TO HELP.'}).waitFor();await page.getByRole('link',{name:'EMAIL SUPPORT'}).waitFor();await close();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForTimeout(500);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);await page.emulateMedia({reducedMotion:'no-preference'});
  }
  assert.equal((await db.query('select count(*)::int as total from mailing_list_signups')).rows[0].total,2);
  assert.equal((await db.query('select count(*)::int as total from booking_enquiries')).rows[0].total,2);
  const submit=(data,headers={})=>fetch(`${base}/api/contact`,{method:'POST',headers:{'content-type':'application/json',origin:base,...headers},body:JSON.stringify(data)});
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
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile landing, media/audio, six navigation panels, cover, disabled checkout, forms -> real API -> local SQL storage, error/retry, rate limit, CSRF, payload limits, private support/privacy, reduced motion and direct archive route.');
  console.log('External provider iframe documents were stubbed. Live Vercel, Supabase, Spotify and YouTube remain UNVERIFIED. No live records were created.');
} finally {
  await browser?.close();if(app)app.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));await db.close();
}
