import { chromium } from '@playwright/test';
import { request } from 'node:http';
import assert from 'node:assert/strict';
import { remainingTime, shouldShowCountdown } from '../lib/launch/schedule.ts';

const base = new URL(process.argv[2] || 'http://127.0.0.1:3020');
if (!['127.0.0.1','localhost'].includes(base.hostname)) throw new Error('Run hostname-routing checks against a local server only.');
const get = (path,host,method='GET') => new Promise((resolve,reject)=>{
  const req=request(new URL(path,base),{method,headers:{host}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}))});req.on('error',reject);req.end();
});
for(const host of ['cjaymnandi.co.za','www.cjaymnandi.co.za']){
  for(const path of ['/','/archive']){
    const result=await get(path,host);assert.equal(result.status,200);
    assert.equal(result.body.includes('THE WORLD OPENS ON FRIDAY THE 13TH'),shouldShowCountdown(host));
    if(shouldShowCountdown(host))assert.match(result.headers['cache-control'],/no-store/);
  }
  const privacy=await get('/privacy',host);assert.equal(privacy.status,200);assert.ok(privacy.body.includes('Privacy.'));
  const cover=await get('/media/lax-cover.jpg',host,'HEAD');assert.equal(cover.status,200);assert.match(cover.headers['content-type'],/image\/jpeg/);
  if(shouldShowCountdown(host)){const api=await get('/api/contact',host,'POST');assert.equal(api.status,503);assert.match(api.body,/12:00 SAST/);}
}
const review=await get('/','cjaymnandi.vercel.app');assert.equal(review.status,200);assert.ok(review.body.includes('WELCOME TO THE WORLD OF'));
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
try {
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport,timezoneId:'America/New_York'});
    await page.addInitScript(()=>{Date.now=()=>0});
    await page.goto(new URL('/countdown',base).href);await page.getByText('Friday, 13 November 2026 · 12:00 SAST',{exact:true}).waitFor();
    if(remainingTime().total>0){
      await page.waitForFunction(()=>{const el=document.querySelector('.launch-digit');return el&&/^\d+$/.test(el.textContent||'')});
      const total=async()=>{const [d,h,m,s]=(await page.locator('.launch-digit').allTextContents()).map(Number);return d*86400+h*3600+m*60+s};
      const before=await total();assert.ok(Math.abs(before-remainingTime().total)<5,'timer follows server, not skewed visitor Date.now');
      await page.waitForTimeout(1300);assert.ok(await total()<before);
      assert.equal(await page.locator('.launch-digit-glyph').first().evaluate(e=>getComputedStyle(e).animationName),'launch-digit-enter');
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.launch-digit-glyph').first().evaluate(e=>getComputedStyle(e).animationName),'none');
      assert.equal(await page.locator('.launch-link').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
      await page.emulateMedia({reducedMotion:'no-preference'});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`/tmp/cjay-countdown-${viewport.width}.png`,fullPage:true});await page.close();
  }
  console.log('PASS: custom-domain countdown/root and archive routing, privacy/assets, prelaunch API gate, review-host isolation, no-cache, desktop/mobile clock with skewed visitor time and a foreign timezone.');
} finally {await browser.close();}
