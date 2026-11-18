import {musicMetadataFixture} from './fixtures/music-metadata.mjs';
import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:3060';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(base))throw new Error('Use a local application server.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('/tmp/cjay-media',{recursive:true});
try{
  for(const width of [1440,390]){
    const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route(/https:\/\/(open.spotify.com|www.youtube.com)\/embed\//,r=>r.fulfill({contentType:'text/html',body:'<html><body>External player fixture</body></html>'}));
    await musicMetadataFixture(page);
    await page.route('https://open.spotify.com/embed/iframe-api/v1',async r=>r.fulfill({contentType:'application/javascript',body:await readFile('scripts/fixtures/spotify-api.js','utf8')}));
    await page.route('https://i.ytimg.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#005028"/><text x="30" y="130" fill="white">Thumbnail test fixture</text></svg>'}));
    await page.goto(base);await page.waitForFunction(()=>window.__musicState&&!window.__musicState.isPaused);
    await page.evaluate(()=>{window.__frame=document.querySelector('.site-music-embed iframe');});
    const startUrl=page.url();await page.getByRole('button',{name:'WATCH VISUALIZER',exact:true}).click();
    const viewer=page.getByRole('dialog',{name:'LAX! · Official visualizer'});await viewer.waitFor();
    assert.match(await viewer.locator('iframe').getAttribute('src'),/youtube.com\/embed\/OlXTom_jz-s\?.*autoplay=1/);
    assert.equal(page.url(),startUrl,'watching the visualizer never redirects the page');
    assert.equal(await page.evaluate(()=>window.__musicState.isPaused),true,'explicit video playback avoids overlapping background audio');
    await viewer.getByRole('button',{name:'Close visualizer'}).click();await page.waitForFunction(()=>!window.__musicState.isPaused);
    const nav=async name=>{if(width<1100)await page.getByRole('button',{name:'Toggle navigation'}).click();await page.getByRole('navigation',{name:'Website navigation'}).getByRole('button',{name,exact:true}).click();};
    await nav('MUSIC');const panel=page.locator('.lax-dialog');await panel.getByRole('heading',{name:'LAX!',exact:true}).waitFor();
    for(const id of ['5Q4uyRnSm7ar6qHgOaU6SK','0dXvoI3H71ehlBrJ5kTBBw'])assert.equal(await panel.locator(`[data-release="${id}"]`).count(),1,'existing and new music are directly available in Music');
    assert.equal(await panel.locator('[data-release="1IIfSDNRJTULIwjKg5j6RK"],[data-release="3fRud4kn6iXSPimTlWgbJf"]').count(),0,'duplicate album editions are removed');
    for(const id of ['OlXTom_jz-s','Xc4u61qS5uQ','ZKFxonhUVdA','89--pR19iUg','6c42u8MHtfc']){
      assert.equal(await panel.locator(`[data-video="${id}"]`).count(),1,'new features and existing films are retained');
      assert.equal(await panel.locator(`[data-video="${id}"] img`).getAttribute('loading'),'eager');
      assert.ok(await page.locator(`head link[rel="preload"][href*="/vi/${id}/"]`).count()>=1,'thumbnail preload hints are present');
    }
    await page.waitForFunction(()=>[...document.querySelectorAll('.inline-video-poster img')].every(i=>i.complete&&i.naturalWidth>0));
    for(const id of ['OlXTom_jz-s','Xc4u61qS5uQ','ZKFxonhUVdA']){
      const url=page.url(),card=panel.locator(`[data-video="${id}"]`);
      await card.getByRole('button').click();assert.match(await card.locator('iframe').getAttribute('src'),new RegExp(`/embed/${id}\\?.*autoplay=1`));
      assert.equal(page.url(),url,'feature play buttons stay on the website');
      assert.equal(await page.evaluate(()=>window.__musicState.isPaused),true);
      await nav('ABOUT');await panel.getByRole('heading',{name:'JUPITER VIBEZ.'}).waitFor();await page.waitForFunction(()=>!window.__musicState.isPaused);
      await nav('MUSIC');await panel.getByRole('heading',{name:'LAX!',exact:true}).waitFor();
    }
    await panel.getByRole('button',{name:'EXPLORE THE ARCHIVE'}).click();await page.locator('.archive').waitFor();
    for(const id of ['2JYLBbngIOycsumS0b9TCA','5Q4uyRnSm7ar6qHgOaU6SK','0dXvoI3H71ehlBrJ5kTBBw'])assert.equal(await page.locator(`.archive [data-release="${id}"]`).count(),1);
    await nav('CONTENT');await page.waitForFunction(()=>Math.abs(document.querySelector('#gallery').getBoundingClientRect().top)<.1);
    await page.waitForFunction(()=>[...document.querySelectorAll('.collage-photo img[src]')].slice(0,3).every(i=>i.complete&&i.naturalWidth>0));
    const wall=await page.locator('.collage-viewport').boundingBox();assert.ok(Math.abs(wall.y)<1&&Math.abs(wall.height-900)<1,'photography fills the full screen behind header and footer');
    assert.equal(await page.locator('.home-gallery .collage').evaluate(e=>getComputedStyle(e).paddingTop),'0px');assert.equal(await page.locator('.home-gallery .collage').evaluate(e=>getComputedStyle(e).paddingBottom),'0px');
    assert.equal(await page.locator('.home-gallery').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 80, 40)','the clip cannot show through photo gutters or loading space');
    assert.equal(await page.locator('.lax-header').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.equal(await page.evaluate(()=>document.querySelector('.site-music-embed iframe')===window.__frame),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`/tmp/cjay-media/full-gallery-${width}.png`});assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: full music catalogue in Music and Archive; canonical album deduplication; official visualizer and three feature URLs play inline without page navigation; eager preloaded thumbnails; existing music/films retained; player continuity around video playback; full-viewport gallery behind transparent header/footer; desktop/mobile. External media and SDK are simulated, not real streaming verification.');
}finally{await browser.close();}
