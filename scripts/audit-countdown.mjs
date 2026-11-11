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
    const page=await browser.newPage({viewport,timezoneId:'America/New_York',hasTouch:viewport.width<550,isMobile:viewport.width<550});
    await page.route('https://www.youtube.com/embed/**',r=>r.fulfill({body:'<html lang="en"><head><title>YouTube test fixture</title></head><body>External player fixture</body></html>',contentType:'text/html'}));
    await page.addInitScript(()=>{Date.now=()=>0});
    await page.goto(new URL('/countdown',base).href);await page.waitForFunction(()=>{const v=document.querySelector('.launch-art video');return v&&v.readyState>=3&&!v.paused&&v.currentTime>0});await page.getByText('Friday, 13 November 2026 · 12:00 SAST',{exact:true}).waitFor();
    if(remainingTime().total>0){
      await page.waitForFunction(()=>{const el=document.querySelector('.launch-digit');return el&&/^\d+$/.test(el.textContent||'')});
      const total=async()=>{const [d,h,m,s]=(await page.locator('.launch-digit').allTextContents()).map(Number);return d*86400+h*3600+m*60+s};
      const box=await page.locator('.launch-clock').boundingBox();
      assert.ok(Math.abs(box.x+box.width/2-viewport.width/2)<3,'clock is horizontally centered');
      assert.ok(Math.abs(box.y+box.height/2-viewport.height/2)<15,'clock is vertically centered');
      const digitSize=await page.locator('.launch-digit').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      assert.ok(digitSize>=(viewport.width>1000?150:48),'timer is the primary large element');
      assert.equal(await page.locator('.launch-page').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
      const overlay=await page.locator('.launch-art').evaluate(e=>getComputedStyle(e,'::after').backgroundImage);
      assert.match(overlay,/rgba\(0, 0, 0,/);
      await page.getByRole('button',{name:'PAUSE FILM',exact:true}).click();
      assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
      await page.getByRole('button',{name:'PLAY FILM',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('video').paused);
      const before=await total();assert.ok(Math.abs(before-remainingTime().total)<5,'timer follows server, not skewed visitor Date.now');
      await page.waitForTimeout(1300);assert.ok(await total()<before);
      assert.equal(await page.locator('.launch-digit-glyph').first().evaluate(e=>getComputedStyle(e).animationName),'launch-digit-enter');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('video').paused);
      assert.equal(await page.locator('.launch-digit-glyph').first().evaluate(e=>getComputedStyle(e).animationName),'none');
      assert.equal(await page.locator('.launch-link').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.getByRole('button',{name:'PLAY FILM',exact:true}).click();
      await page.waitForFunction(()=>!document.querySelector('video').paused);
    }
    const socials=page.getByRole('navigation',{name:'C.JayMnandi social profiles'});
    for(const [name,url] of [['Instagram','https://www.instagram.com/c.jaymnandi/'],['X','https://x.com/C_JayMnandi'],['TikTok','https://www.tiktok.com/@c_jaymnandi/']])assert.equal(await socials.getByRole('link',{name:`${name} (opens in a new tab)`,exact:true}).getAttribute('href'),url);
    if(viewport.width>1000){
      await page.mouse.move(viewport.width*.85,viewport.height*.35);await page.waitForTimeout(500);
      const tilt=await page.locator('.launch-clock-motion').evaluate(e=>e.style.getPropertyValue('--clock-tilt-y'));
      assert.notEqual(tilt,'0deg');const tilted=await page.locator('.launch-clock').boundingBox();assert.ok(Math.abs(tilted.x+tilted.width/2-viewport.width/2)<20,'pointer tilt stays centre anchored');
      await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('video').paused);assert.equal(await page.locator('.launch-clock-motion').evaluate(e=>getComputedStyle(e).transform),'none');await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'PLAY FILM',exact:true}).click();
    }
    const clockBefore=await page.locator('.launch-digit').allTextContents();
    const watch=page.getByRole('button',{name:'WATCH VISUALIZER',exact:true});
    if(viewport.width>1000)assert.match(await watch.evaluate(e=>getComputedStyle(e).cursor),/32 32/);
    await watch.click();const player=page.getByRole('dialog',{name:'LAX! · Official visualizer'});await player.waitFor();
    assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
    assert.match(await player.locator('iframe').getAttribute('src'),/youtube.com\/embed\/OlXTom_jz-s/);
    assert.equal(await player.getByRole('link',{name:'Open on YouTube'}).getAttribute('href'),'https://www.youtube.com/watch?v=OlXTom_jz-s');
    await page.waitForTimeout(1400);assert.notDeepEqual(await page.locator('.launch-digit').allTextContents(),clockBefore,'countdown continues while watching');
    await page.keyboard.press('Escape');await player.waitFor({state:'hidden'});assert.equal(await page.locator('iframe').count(),0);assert.equal(await watch.evaluate(e=>e===document.activeElement),true);await page.waitForFunction(()=>!document.querySelector('video').paused);
    await page.emulateMedia({reducedMotion:'reduce'});await watch.click();await player.getByRole('button',{name:'Close visualizer'}).click();await player.waitFor({state:'hidden'});assert.equal(await page.locator('video').evaluate(v=>v.paused),true);await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'PLAY FILM',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.waitForTimeout(1000);
    await page.locator('video').evaluate(v=>{v.currentTime=15});
    await page.waitForTimeout(300);
    await page.screenshot({path:`/tmp/cjay-countdown-${viewport.width}.png`,fullPage:true});await page.close();
  }
  console.log('PASS: custom-domain countdown/root and archive routing, privacy/assets, prelaunch API gate, review-host isolation, no-cache, desktop/mobile large centred clock, real video, black overlay, pause/resume, reduced-motion pause, skewed visitor time and a foreign timezone; social links/icons, centre-anchored pointer tilt, larger sunflower cursor, YouTube modal lifecycle and uninterrupted countdown. YouTube iframe content stubbed; actual external playback not verified.');
} finally {await browser.close();}
