export async function checkStaticLanding({page,ctaUrl,assertions,errors,timeout=15000}) {
 page.setDefaultTimeout(timeout);
 const target=new URL(ctaUrl);
 if(target.protocol!=='https:'||target.username||target.password)throw Error('Configure a valid HTTPS call to action');
 await page.goto('http://ct-app.test/');
 const cta=page.getByTestId('ct-cta');
 await cta.waitFor({state:'visible'});
 if(await cta.getAttribute('href')!==ctaUrl)throw Error('The primary call to action does not match the plan');
 const broken=await page.locator('a[href^="#"]').evaluateAll(links=>links.some(a=>{const id=a.getAttribute('href').slice(1);return !id||!document.getElementById(decodeURIComponent(id));}));
 if(broken)throw Error('A navigation link has no matching section');
 await page.setViewportSize({width:390,height:844});
 if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))throw Error('The landing page overflows on mobile');
 assertions.responsive_ui=true;
 // Observe the requested destination, while preventing any real external action.
 let navigated=false;
 await page.context().route(ctaUrl,route=>{navigated=true;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Isolated CTA destination</title>'});});
 await cta.click();
 await page.waitForTimeout(100);
 if(!navigated)throw Error('The call to action did not navigate');
 if(errors.length)throw Error('The page raised a browser error');
 Object.assign(assertions,{customer_task:true,cta_navigation:true,no_runtime_errors:true});
}
