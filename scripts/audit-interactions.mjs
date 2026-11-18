import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3027';
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.goto(base);
    if(width<1100){await page.getByRole('button',{name:'Toggle navigation'}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).getAttribute('aria-expanded'),'false');assert.equal(await page.getByRole('button',{name:'Toggle navigation'}).evaluate(e=>e===document.activeElement),true);await page.getByRole('button',{name:'Toggle navigation'}).click();}
    await page.getByRole('navigation').getByRole('button',{name:'MUSIC',exact:true}).click();await page.locator('dialog[open]').waitFor();
    await page.getByTitle('Play LAX! on Spotify').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'Close panel'}).focus();assert.equal(await page.locator('.lax-header').isVisible(),true,'transparent navigation stays available over panels');
    await page.locator('.lax-dialog').evaluate(d=>{d.querySelector('[aria-label="Close panel"]').click();d.querySelector('[aria-label="Close panel"]').click();d.querySelector('.panel-links button').click()});
    await page.waitForTimeout(350);await page.getByRole('heading',{name:'HERE TO HELP.'}).waitFor();assert.equal(await page.locator('.lax-dialog').evaluate(d=>d.open),true);
    await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
  }
  for(const panel of ['buy','store','shop','events']){await page.goto(`${base}/?panel=${panel}`);assert.equal(await page.locator('dialog[open]').count(),0);}
  await page.route('**/media/visualizer.mp4',r=>r.abort());await page.goto(base);await page.getByRole('status').filter({hasText:'visualizer is temporarily unavailable'}).waitFor();await page.unroute('**/media/visualizer.mp4');await page.getByRole('button',{name:'PLAY VISUALIZER',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('video');return v.readyState>=3&&!v.paused&&v.currentTime>0});assert.equal(await page.locator('.lax-media-notice').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: 320/390/768/1440px layouts, mobile Escape/focus, keyboard panel controls with persistent navigation, rapid close/reopen, hidden unfinished deep links and actual video-network failure/recovery.');
}finally{await browser.close()}
