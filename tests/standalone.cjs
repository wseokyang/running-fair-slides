// Run: PLAYWRIGHT_MODULE=/path/to/@playwright/test node tests/standalone.cjs
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const isolated=await fs.mkdtemp(path.join(os.tmpdir(),'voyage-single-'));
 let browser;
 try {
  const file=path.join(isolated,'presentation.html');
  await fs.copyFile(path.resolve(__dirname,'../Learning-Voyage.html'),file);
  browser=await chromium.launch();
  const context=await browser.newContext({offline:true,viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push(r.url()));
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  assert.equal(await page.locator('.slide').count(),8);
  assert(await page.evaluate(()=>[...document.images].every(img=>img.naturalWidth>0&&img.src.startsWith('data:'))));
  await page.locator('#fullscreen').click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  for(let n=1;n<=8;n++){
   const slide=page.locator('.slide:not([hidden])');
   assert.equal(await slide.getAttribute('data-slide'),String(n));
   const max=await slide.evaluate(s=>Math.max(0,...[...s.querySelectorAll('[data-reveal]')].map(e=>+e.dataset.reveal)));
   for(let step=1;step<=max;step++){
    await page.keyboard.press('PageDown');
    assert.equal(await slide.getAttribute('data-build'),String(step));
   }
   assert(await page.evaluate(()=>!!document.fullscreenElement));
   if(n<8)await page.keyboard.press('PageDown');
  }
  await page.keyboard.press('PageUp');assert.equal(await page.locator('.page-8').getAttribute('data-build'),'1');
  // The file's overview is internal and keeps presentation state/fullscreen intact.
  await page.locator('.page-8 [data-contents]').click();
  assert(await page.locator('#portable-contents').isVisible());
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('.page-8').getAttribute('data-build'),'1');
  await page.locator('.contents-grid button').nth(3).click();
  assert(!(await page.locator('#portable-contents').isVisible()));
  await page.waitForFunction(()=>document.querySelector('.slide:not([hidden])').dataset.slide==='4');
  assert.equal(await page.locator('.slide:not([hidden])').getAttribute('data-slide'),'4');
  assert(await page.evaluate(()=>!!document.fullscreenElement));
  await page.keyboard.press('PageDown');assert.equal(await page.locator('.page-4').getAttribute('data-build'),'1');
  await page.keyboard.press('n');assert(await page.locator('#notes').isVisible());
  await page.keyboard.press('PageDown');assert(!(await page.locator('#notes').isVisible()));
  await page.evaluate(()=>document.exitFullscreen());
  await page.reload();assert.equal(await page.locator('.page-4').getAttribute('data-build'),'1');
  await page.setViewportSize({width:390,height:844});
  const ratio=await page.locator('.slide:not([hidden])').evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height});
  assert(Math.abs(ratio-16/9)<.001);
  assert(requests.every(url=>url===pathToFileURL(file).href||url.startsWith(pathToFileURL(file).href+'#')||url.startsWith('data:')),requests.join('\n'));
  assert.deepEqual(errors,[]);
  console.log('PASS: isolated HTML only, network offline, all images, 8 slides and all builds, fullscreen, internal contents, reverse navigation, notes, refresh, 16:9; no external requests.');
 } finally {if(browser)await browser.close();await fs.rm(isolated,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
