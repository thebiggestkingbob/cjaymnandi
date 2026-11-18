import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import {musicMetadataFixture} from './fixtures/music-metadata.mjs';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3065';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Use a local application server.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});await mkdir('/tmp/cjay-queue',{recursive:true});
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/https:\/\/(open.spotify.com|www.youtube.com)\/embed\//,r=>r.fulfill({contentType:'text/html',body:'<html><body>Player fixture</body></html>'}));
 await musicMetadataFixture(page);await page.route('https://open.spotify.com/embed/iframe-api/v1',async r=>r.fulfill({contentType:'application/javascript',body:await readFile('scripts/fixtures/spotify-api.js','utf8')}));
 await page.goto(base);await page.waitForFunction(()=>window.__musicState&&!window.__musicState.isPaused);await page.evaluate(()=>{window.__queueFrame=document.querySelector('.site-music-embed iframe');});
 const nav=async name=>{if(width<1100)await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation',{name:'Website navigation'}).getByRole('button',{name,exact:true}).click();};
 await nav('MUSIC');const panel=page.locator('.lax-dialog');await panel.getByRole('heading',{name:'LAX!',exact:true}).waitFor();
 assert.equal(await panel.locator('.release-card').count(),2);assert.equal(await panel.locator('.release-list iframe').count(),0,'independent Spotify players have been removed');
 for(const card of await panel.locator('.release-card').all()){const height=await card.evaluate(e=>e.offsetHeight);assert.ok(height===152,'release cards contain no oversized empty embed space');}
 const choose=async id=>{await panel.locator(`[data-release="${id}"] .release-play`).click();await page.waitForFunction(id=>document.querySelector('.site-music-player').dataset.currentRelease===id,id);await page.getByRole('button',{name:'Hide music player'}).click();};
 for(const id of ['5Q4uyRnSm7ar6qHgOaU6SK','0dXvoI3H71ehlBrJ5kTBBw']){
   await choose(id);assert.equal(await page.evaluate(()=>window.__musicControllers),1);assert.equal(await page.evaluate(()=>document.querySelector('.site-music-embed iframe')===window.__queueFrame),true);
   assert.equal(await page.evaluate(()=>window.__musicLoads.at(-1).oldPaused),true,'old release is paused before loading a new one');
   assert.equal(await panel.locator('.release-play[aria-pressed="true"]').count(),1,'only one release can be playing');
 }
 await choose('5Q4uyRnSm7ar6qHgOaU6SK');await page.waitForFunction(()=>window.__musicState.position>=2000);
 await page.evaluate(()=>window.__finishMusic());await page.waitForFunction(()=>document.querySelector('.site-music-player').dataset.currentRelease==='0dXvoI3H71ehlBrJ5kTBBw');
 await page.evaluate(()=>window.__emitMusicUpdate({duration:180000,position:180000,isPaused:true}));assert.equal(await page.locator('.site-music-player').getAttribute('data-current-release'),'0dXvoI3H71ehlBrJ5kTBBw','duplicate end does not skip the next song');
 await page.waitForFunction(()=>window.__musicState.position>=2000);await panel.locator('[data-release="0dXvoI3H71ehlBrJ5kTBBw"] .release-play').click();
 await page.evaluate(()=>window.__finishMusic());assert.equal(await page.locator('.site-music-player').getAttribute('data-current-release'),'0dXvoI3H71ehlBrJ5kTBBw','explicit pause does not advance');
 await choose('5Q4uyRnSm7ar6qHgOaU6SK');await page.waitForTimeout(400);
 await panel.locator('[data-video="Xc4u61qS5uQ"] button').click();assert.equal(await page.evaluate(()=>window.__musicState.isPaused),true);
 await panel.locator('[data-video="ZKFxonhUVdA"] button').click();assert.equal(await panel.locator('iframe[src*="autoplay=1"]').count(),1,'a second video stops the first');
 await choose('0dXvoI3H71ehlBrJ5kTBBw');assert.equal(await panel.locator('iframe[src*="autoplay=1"]').count(),0,'choosing a song stops video playback');
 assert.equal(await page.locator('.site-music-embed iframe').count(),1);assert.equal(await page.locator('.site-music-embed iframe').evaluate(e=>Math.round(e.getBoundingClientRect().height)),152);
 const text=await page.locator('body').innerText();assert.doesNotMatch(text,/[☰◖▂▅▃▇▶✕×\p{Extended_Pictographic}]/u,'site controls contain no decorative emoji/symbol text');
 await panel.evaluate(e=>{e.querySelector('.release-list').scrollIntoView({block:'center'});});await page.screenshot({path:`/tmp/cjay-queue/music-${width}.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();
}console.log('PASS: one shared controller/frame, exclusive song/video playback, pause-before-switch, end-to-next without duplicate skips, manual pause respected, compact cards/player, no emoji controls, desktop/mobile. Spotify completion is simulated; provider advertising/preview limits cannot be removed.');}finally{await browser.close();}
