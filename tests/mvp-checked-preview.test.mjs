import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
test('checked artifact renders without WebContainers and cannot call a live database',async()=>{
 const bundle=await build({stdin:{contents:"export {checkedPreviewDocument} from './src/lib/mvp-builder/checkedPreview.ts'",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'previewTools',platform:'browser'});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();let remoteRequests=0;
  await page.route('https://private-db.test/**',route=>{remoteRequests++;return route.abort();});
  await page.setContent('<main id="root"></main>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{
   const html=window.previewTools.checkedPreviewDocument([{filename:'index.html',content:'<div id="result"></div><script type="module" src="/assets/app.js"></script>'},{filename:'assets/app.js',content:'document.getElementById("result").textContent="Checked version";fetch("https://private-db.test/write",{method:"POST"}).catch(()=>{});'}]);
   const frame=document.createElement('iframe');frame.id='checked';frame.sandbox='allow-scripts';frame.srcdoc=html;document.getElementById('root').append(frame);
  });
  await page.frameLocator('#checked').getByText('Checked version',{exact:true}).waitFor();
  await page.waitForTimeout(100);assert.equal(remoteRequests,0);
  const sandbox=await page.locator('#checked').getAttribute('sandbox');assert.equal(sandbox,'allow-scripts');
 }finally{await browser.close();}
});
