// Run: PLAYWRIGHT_MODULE=/path/to/@playwright/test node tests/presentation.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url = pathToFileURL(path.resolve(__dirname,'../present.html')).href;
 await page.goto(url);
 await page.locator('#fullscreen').click();
 await page.waitForFunction(()=>!!document.fullscreenElement);
 assert.equal(await page.locator('.slide:not([hidden])').getAttribute('data-slide'),'1');
 for(let slide=1;slide<=8;slide++) {
  const current=page.locator('.slide:not([hidden])');
  assert.equal(await current.getAttribute('data-slide'),String(slide));
  const max=await current.evaluate(el=>Math.max(0,...[...el.querySelectorAll('[data-reveal]')].map(e=>+e.dataset.reveal)));
  for(let step=1;step<=max;step++) {
   await page.keyboard.press('PageDown');
   await page.waitForFunction(({slide,step})=>document.querySelector(`.page-${slide}`).dataset.build===String(step),{slide,step});
  }
  await page.waitForTimeout(600);
  await page.screenshot({path:`/tmp/voyage-v2-${slide}.png`});
  assert(await page.evaluate(()=>!!document.fullscreenElement),'fullscreen persists');
  const ratio=await current.evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height});
  assert(Math.abs(ratio-16/9)<.001);
  if(slide<8)await page.keyboard.press('PageDown');
 }
 // The last click stays at the final reveal.
 await page.keyboard.press('PageDown');assert.equal(await page.locator('.slide:not([hidden])').getAttribute('data-slide'),'8');
 await page.keyboard.press('Home');
 await page.keyboard.press('PageDown');
 await page.keyboard.press('PageDown');
 await page.keyboard.press('PageDown');
 assert.equal(await page.locator('.slide:not([hidden])').getAttribute('data-slide'),'2');
 await page.keyboard.press('PageUp');
 assert.equal(await page.locator('.page-1').getAttribute('data-build'),'2');
 await page.keyboard.press('PageUp');assert.equal(await page.locator('.page-1').getAttribute('data-build'),'1');
 await page.keyboard.press('b');assert(await page.locator('#blank').isVisible());
 await page.keyboard.press('PageDown');assert(!(await page.locator('#blank').isVisible()));
 assert.equal(await page.locator('.page-1').getAttribute('data-build'),'1');
 await page.keyboard.press('n');assert(await page.locator('#notes').isVisible());
 await page.keyboard.press('PageDown');assert(!(await page.locator('#notes').isVisible()));
 await page.keyboard.press('5');assert.equal(await page.locator('.page-5').getAttribute('data-build'),'0');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('.page-5').getAttribute('data-build'),'2');
 assert.equal(await page.locator('.page-5 .task-tile').count(),40);
 assert.equal(await page.locator('.page-5 .team-task').count(),10);
 const separated = await page.locator('.page-5').evaluate(slide => {
   const matrix = slide.querySelector('.task-matrix').getBoundingClientRect();
   const metric = slide.querySelector('.ai-metrics > div:last-child').getBoundingClientRect();
   return metric.left > matrix.right;
 });
 assert(separated, 'AI metric must not overlap the task matrix');
 await page.evaluate(()=>document.exitFullscreen());
 await page.reload();assert.equal(await page.locator('.page-5').getAttribute('data-build'),'2');
 // Holding a clicker key must not skip the next reveal.
 await page.keyboard.down('ArrowRight');await page.keyboard.down('ArrowRight');await page.keyboard.up('ArrowRight');
 assert.equal(await page.locator('.page-5').getAttribute('data-build'),'3');
 for(const viewport of [{width:390,height:844},{width:1024,height:768},{width:1920,height:1080}]) {
  await page.setViewportSize(viewport);
  const geometry=await page.locator('.slide:not([hidden])').evaluate(e=>{const r=e.getBoundingClientRect();return {ratio:r.width/r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom,w:innerWidth,h:innerHeight}});
  assert(Math.abs(geometry.ratio-16/9)<.001,JSON.stringify(geometry));
  assert(geometry.left>=-.1&&geometry.right<=geometry.w+.1&&geometry.top>=-.1&&geometry.bottom<=geometry.h+.1);
 }
 await page.setViewportSize({width:1440,height:900});
 for(let i=1;i<=8;i++){
  await page.goto(pathToFileURL(path.resolve(__dirname,`../slide-${String(i).padStart(2,'0')}.html`)).href);
  assert.equal(await page.locator('.unrevealed').count(),0);
  assert(await page.locator('.slide').evaluate(e=>e.scrollHeight===e.clientHeight),'slide overflow '+i);
  for(const image of await page.locator('img').all()) assert(await image.evaluate(e=>e.complete&&e.naturalWidth>0),'image loaded');
 }
 await page.goto(url + '#slide=7&step=3');
 assert.match(await page.locator('.page-7').innerText(), /실행을 성과로 만듭니다/);
 assert.match(await page.locator('.page-8 .recognition-proof').textContent(), /끝까지 업무에 적용합니다/);
 assert.equal(await page.locator('.page-4 .knowledge-illustration img').getAttribute('src'), 'assets/knowledge-loop.png');
 assert.equal(await page.locator('.page-6 .ecosystem-illustration img').getAttribute('src'), 'assets/global-ecosystem.png');
 await page.goto(url + '#slide=2&step=3');
 await page.waitForTimeout(600);
 assert(await page.locator('.page-2').evaluate(slide => {
   const blocks = slide.querySelector('.system-pillars').getBoundingClientRect();
   const message = slide.querySelector('.system-message').getBoundingClientRect();
   return message.top >= blocks.bottom;
 }), 'Slide 2 closing message must not overlap the three pillars');
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: all 8 slides, all reveal steps, fullscreen continuity, reverse navigation, key repeat, notes, blackout, refresh, 16:9 at three viewport sizes, images and standalone files.');
})().catch(error=>{console.error(error);process.exitCode=1});
