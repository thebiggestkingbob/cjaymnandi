import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:3042';
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(base))throw new Error('Use the local test server.');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
await mkdir('/tmp/cjay-collage',{recursive:true});
try{
  for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600});
    const errors=[],failed=[],requests=new Map();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/photography/')){requests.set(r.url(),(requests.get(r.url())||0)+1);if(r.status()>=400)failed.push(r.url());}});
    await page.goto(`${base}/photos`);await page.locator('.collage-photo img[src]').first().waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('.collage-photo img[src]')].slice(0,4).every(i=>i.complete&&i.naturalWidth>0));
    const viewport=page.getByRole('region',{name:'Photographic wall'}),track=page.locator('.collage-track');
    const offset=()=>track.evaluate(e=>-new DOMMatrix(getComputedStyle(e).transform).m42);
    const period=Number(await viewport.getAttribute('data-period'));
    const start=await offset();await page.waitForTimeout(1100);assert.ok(await offset()>start+20,'ambient movement starts and rises at a steady speed');
    const tileCount=await page.locator('.collage-photo').count();assert.ok(tileCount<=146,'bounded repeated content');
    assert.equal(new Set(await page.locator('.collage-photo[data-copy="0"]').evaluateAll(items=>items.map(i=>i.dataset.photo))).size,65);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const visiblePhoto=async()=>{
      const item=await page.locator('.collage-photo').evaluateAll(items=>{const v=document.querySelector('.collage-viewport').getBoundingClientRect();return items.findIndex(e=>{const b=e.getBoundingClientRect();return b.top>v.top+8&&b.bottom<v.bottom-8&&b.left>=0&&b.right<=innerWidth})});
      assert.ok(item>=0,'a complete photograph is visible');return page.locator('.collage-photo').nth(item);
    };
    if(width>600){const tile=await visiblePhoto();const y=await offset();await tile.hover({force:true});await page.waitForTimeout(450);const scale=await tile.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);assert.ok(Math.abs(scale-1.25)<.001);assert.ok(await offset()>y+10,'hover does not pause');}
    const tile=await visiblePhoto(),id=await tile.getAttribute('data-photo');await tile.click({force:true});
    const viewer=page.getByRole('dialog',{name:'Photograph viewer'});await viewer.waitFor();
    await viewer.locator('img').waitFor();assert.equal(await viewer.locator('img').evaluate(i=>getComputedStyle(i).objectFit),'contain');
    const before=await offset();await page.waitForTimeout(1100);assert.ok(await offset()>before+20,'movement continues behind viewer');
    await page.screenshot({path:`/tmp/cjay-collage/viewer-${width}.png`});
    const atClose=await offset();await page.keyboard.press('Escape');await viewer.waitFor({state:'hidden'});
    assert.ok(Math.abs(await offset()-atClose)<15,'viewer close does not reset position');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-photo')),id,'viewer restores focus');
    await page.getByRole('button',{name:'PAUSE',exact:true}).click();const paused=await offset();await page.waitForTimeout(500);assert.ok(Math.abs(await offset()-paused)<1,'explicit pause');
    // Three entire traversals, including exact wrap boundaries in both directions.
    for(let cycle=0;cycle<3;cycle++){
      for(let phase=0;phase<period;phase+=650){
        const now=await offset();const delta=(phase-now)/.6;
        await viewport.dispatchEvent('wheel',{deltaY:delta,deltaMode:0});
        assert.equal(await page.locator('.collage-photo').count(),tileCount);
        const coverage=await viewport.evaluate(v=>{const b=v.getBoundingClientRect();return [...v.querySelectorAll('.collage-photo')].some(e=>{const r=e.getBoundingClientRect();return r.top<b.top+120&&r.bottom>b.top+40})});assert.ok(coverage,'wall covers the seam/viewport');
      }
      const phase=await offset();await viewport.dispatchEvent('wheel',{deltaY:(period+35)/.6,deltaMode:0});
      const actual=await offset();assert.ok(Math.abs(actual-((phase+35)%period))<12,'whole-period wrap has no reset');
    }
    await viewport.dispatchEvent('wheel',{deltaY:(37-(await offset()))/.6,deltaMode:0});await page.waitForTimeout(600);
    const seamBefore=await viewport.screenshot({style:'.lax-film{visibility:hidden!important}'});
    await viewport.dispatchEvent('wheel',{deltaY:period*3/.6,deltaMode:0});await page.waitForTimeout(200);
    const seamAfter=await viewport.screenshot({style:'.lax-film{visibility:hidden!important}'});
    assert.ok(seamBefore.equals(seamAfter),'the photo layer is pixel-identical after three periods, with moving background film masked');
    const downloads=await page.evaluate(()=>{
      const counts={};for(const r of performance.getEntriesByType('resource'))if(r.name.includes('/photography/')&&r.transferSize>0)counts[r.name]=(counts[r.name]||0)+1;return counts;
    });
    assert.ok(Object.values(downloads).every(n=>n===1),'repeated instances reuse cached image data');
    assert.equal(failed.length,0,'responsive images load successfully');
    await viewport.dispatchEvent('wheel',{deltaY:(period*.5-(await offset()))/.6,deltaMode:0});
    await page.getByRole('button',{name:'RESUME',exact:true}).click();
    const reverseStart=await offset();await viewport.dispatchEvent('wheel',{deltaY:-300,deltaMode:0});await page.waitForTimeout(200);
    assert.ok(await offset()<reverseStart-100,'manual input reverses active movement');
    await page.waitForTimeout(4000);const ambientStart=await offset();await page.waitForTimeout(1000);const ambientDelta=(await offset()-ambientStart+period)%period;
    assert.ok(ambientDelta>20&&ambientDelta<45,'ambient speed returns after manual momentum');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
    const hiddenAt=await offset();await page.waitForTimeout(400);assert.ok(Math.abs(await offset()-hiddenAt)<1,'inactive document does not advance');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);

    const rect=await viewport.boundingBox();
    if(width<600){
      const y=await offset(),cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:width/2,y:rect.y+300}]});for(let step=1;step<=5;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:width/2,y:rect.y+300-step*32}]});await page.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();assert.ok(await offset()!==y,'touch swipe changes position');
      await page.tap('.collage-pause'); // Clears swipe momentum and pauses.
    }
    await page.screenshot({path:`/tmp/cjay-collage/wall-${width}.png`});
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.collage-viewport.is-still').waitFor();
    assert.equal(await track.evaluate(e=>getComputedStyle(e).transform),'none');
    assert.equal(await page.locator('.collage-photo[data-copy="1"]').count(),0);
    await viewport.evaluate(e=>{e.scrollTop=e.scrollHeight});assert.ok(await viewport.evaluate(e=>e.scrollTop)>0,'all photographs remain manually accessible');
    await page.screenshot({path:`/tmp/cjay-collage/reduced-${width}.png`});
    await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.collage-viewport:not(.is-still)').waitFor();
    await page.setViewportSize({width:width===1440?1024:430,height:740});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: 65 photos; desktop/390/320px layouts; steady upward motion; 1.25 hover without pausing; uncropped viewer/focus/Escape; explicit pause; three full loop traversals; reverse/forward input; bounded DOM; touch; reduced-motion native browsing; resize; all requested images load. Screenshots: /tmp/cjay-collage.');
}finally{await browser.close();}
