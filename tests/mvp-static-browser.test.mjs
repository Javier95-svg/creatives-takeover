import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {checkStaticLanding} from '../workers/mvp-workflow/static-outcome.mjs';
test('static outcome checks exercise the CTA and reject fake navigation',async t=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [kind,link] of [
   ['working','<a data-testid="ct-cta" href="https://destination.test/book">Book</a>'],
   ['noop','<a data-testid="ct-cta" href="https://destination.test/book" onclick="event.preventDefault()">Book</a>'],
   ['wrong destination','<a data-testid="ct-cta" href="https://wrong.test">Book</a>'],
   ['broken navigation','<a href="#missing">About</a><a data-testid="ct-cta" href="https://destination.test/book">Book</a>'],
  ])await t.test(kind,async()=>{
   const context=await browser.newContext();
   try{
    await context.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width">'+link}));
    const page=await context.newPage(),assertions={};
    const run=()=>checkStaticLanding({page,ctaUrl:'https://destination.test/book',assertions,errors:[],timeout:1000});
    if(kind==='working'){await run();assert.equal(assertions.cta_navigation,true);assert.equal(assertions.database_write,undefined);}
    else await assert.rejects(run());
   }finally{await context.close();}
  });
 }finally{await browser.close();}
});
