import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
const base=new URL(process.argv[2]||'http://127.0.0.1:3024');
if(!['127.0.0.1','localhost'].includes(base.hostname))throw new Error('Run hostname checks against a local server only.');
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(open.spotify.com|www.youtube.com)\/embed\//,r=>r.fulfill({body:'<html><body>External player fixture</body></html>',contentType:'text/html'}));
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);await page.goto(new URL('/review',base).href);
    await page.getByRole('button',{name:'CHECK CONNECTION & READINESS'}).click();
    await page.locator('.readiness-results').waitFor();assert.equal(await page.locator('.readiness-results>div').count(),5);
    assert.equal(await page.locator('.review-steps>li').count(),8);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`/tmp/cjay-review-${viewport.width}.png`,fullPage:true});
    for(const panel of ['music','archive','store','bookings','about','connect','support','shop','events']){
      await page.goto(new URL(`/?panel=${panel}`,base).href);await page.locator('dialog[open]').waitFor();
      if(panel==='store')assert.equal(await page.getByRole('button',{name:'CHECKOUT COMING SOON'}).isDisabled(),true);
      if(panel==='archive')assert.equal(await page.locator('.archive iframe').count(),5);
    }
    await page.goto(new URL('/?panel=unexpected',base).href);assert.equal(await page.locator('dialog[open]').count(),0);
  }
  const origin=base.origin;
  assert.equal((await fetch(new URL('/api/review',base),{method:'POST',headers:{origin}})).status,200);
  assert.equal((await fetch(new URL('/api/review',base),{method:'POST',headers:{origin:'https://untrusted.example'}})).status,403);
  assert.equal((await fetch(new URL('/api/review',base))).status,405);
  const denied=await new Promise((resolve,reject)=>{const req=request(new URL('/review',base),{headers:{host:'untrusted.example'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end()});
  assert.equal(denied,404);assert.deepEqual(errors,[]);
  console.log('PASS: desktop/mobile review, real local read-only endpoint, eight walkthrough links, seven deep-linked panels, safe invalid queries, API origin/method guards, non-review host denial, no runtime exceptions. Third-party iframe content stubbed; live Vercel/Supabase not tested.');
}finally{await browser.close();}
