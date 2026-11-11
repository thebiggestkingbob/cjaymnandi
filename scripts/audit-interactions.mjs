import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3027';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto(base);
    if(width<850){await page.getByRole('button',{name:'Toggle navigation'}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).getAttribute('aria-expanded'),'false');assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).evaluate(e=>e===document.activeElement),true);await page.getByRole('button',{name:'Toggle navigation'}).click();}
    await page.getByRole('navigation').getByRole('button',{name:'MUSIC',exact:true}).click();await page.locator('dialog[open]').waitFor();
    await page.locator('dialog audio').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'Close panel'}).focus();for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement?.closest('dialog'))),true);}
    await page.locator('dialog').evaluate(d=>{d.querySelector('[aria-label="Close panel"]').click();d.querySelector('[aria-label="Close panel"]').click();d.querySelector('.panel-links button').click()});
    await page.waitForTimeout(350);await page.getByRole('heading',{name:'HERE TO HELP.'}).waitFor();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
    await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
  }
  await page.route('**/media/lax-cover.jpg',r=>r.abort());await page.goto(`${base}/?panel=store`);
  await page.getByText('Artwork is temporarily unavailable.',{exact:true}).waitFor();await page.unroute('**/media/lax-cover.jpg');await page.getByRole('button',{name:'RETRY ARTWORK'}).click();await page.waitForFunction(()=>{const i=document.querySelector('.lax-cover img');return i&&i.complete&&i.naturalWidth>0});
  await page.route('**/media/visualizer.mp4',r=>r.abort());await page.goto(base);await page.getByRole('status').filter({hasText:'visualizer is temporarily unavailable'}).waitFor();await page.unroute('**/media/visualizer.mp4');await page.getByRole('button',{name:'WATCH FILM',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=3&&!v.paused&&v.currentTime>0});assert.equal(await page.locator('.lax-media-notice').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: 320/390/768/1440px layouts, mobile Escape/focus, keyboard modal trap, rapid close/reopen, artwork retry and actual video-network failure/recovery.');
}finally{await browser.close()}
