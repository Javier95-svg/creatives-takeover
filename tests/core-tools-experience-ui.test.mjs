import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Exercise real components in a browser without authentication or production writes.
test('weekly workspace components work on mobile, preserve records and support keyboard use', async () => {
  const result = await build({stdin:{loader:'tsx',resolveDir:process.cwd(),contents:`
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import Summary from './src/components/core-tools/WorkflowSummary';
    import Cohort from './src/components/core-tools/CohortInput';
    import Trend from './src/components/core-tools/WeeklyTrend';
    import Actions from './src/components/gtm/GTMWeeklyActions';
    import Brief from './src/components/pmf/ValidationBrief';
    const task={id:'one',playId:'p',title:'Contact five buyers',detail:'Ask about their last purchase.',timeEstimateMinutes:30,output:'Five conversations',status:'todo'};
    const plan={tasks:[task,{...task,id:'two',title:'Follow up'}],assets:[]};
    function App(){const [cohort,setCohort]=useState({startEvent:'purchase',returnEvent:'purchase',windowDays:7,periodStart:'2020-01-01',periodEnd:'2020-01-08',cohortSize:10,returned:4});const [brief,setBrief]=useState(null);return <main className="mx-auto max-w-5xl space-y-5 p-4">
      <Summary title="This week" objective="Test demand for a faster proposal service" evidence="Five interviews collected" next="Speak with another target customer" action="Record feedback" onAction={()=>window.acted=true} example="Ask about a recent purchase."/>
      <Brief storageKey="test-brief" onSaved={setBrief}/>
      <Actions plan={plan} tasks={[task]} onUpdatePlan={async value=>{window.updated=value;if(window.failSave)throw Error('Offline');}}/>
      <Cohort value={cohort} onChange={value=>{window.cohort=value;setCohort(value);}}/>
      <Trend logs={[{week_start_date:'2026-09-28',combined_score:80,calculation_version:2}]}/>
    </main>};createRoot(document.getElementById('root')).render(<App/>);
  `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"test"'},plugins:[{name:'boundaries',setup(b){
    b.onResolve({filter:/^sonner$/},()=>({path:'sonner',namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const toast={success:m=>window.notice=m,error:m=>window.notice=m};'}));
    b.onResolve({filter:/^@\//},a=>{const file=path.resolve('src',a.path.slice(2));return {path:file+(['.tsx','.ts'].find(ext=>existsSync(file+ext))||'')};});
  }}]});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://ct.test/**',route=>route.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div></body></html>'}));
    await page.goto('https://ct.test/');
    const css = readdirSync('dist/assets').filter(file=>file.endsWith('.css'));
    assert.ok(css.length,'Build the app first so this test checks actual CSS');
    for(const file of css)await page.addStyleTag({content:readFileSync(path.join('dist/assets',file),'utf8')});
    await page.addScriptTag({content:result.outputFiles[0].text});
    await page.getByRole('button',{name:'Record feedback'}).focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>window.acted),true);
    assert.ok(await page.getByText('40% returned: 4 of 10 customers.').isVisible());
    await page.getByText('Start with a measurement example',{exact:true}).click();
    await page.getByLabel('Business type').selectOption('commerce');
    await page.getByRole('button',{name:'Use this example'}).click();
    const cohort=await page.evaluate(()=>window.cohort);assert.equal(cohort.windowDays,30);assert.equal(cohort.cohortSize,null);assert.equal(cohort.returned,null);assert.equal(cohort.periodStart,'');
    await page.getByRole('button',{name:'Mark task complete'}).click();
    const updated=await page.evaluate(()=>window.updated);assert.equal(updated.tasks[0].status,'done');assert.equal(updated.tasks[1].status,'todo');
    await page.evaluate(()=>window.failSave=true);await page.getByRole('button',{name:'Mark task complete'}).click();
    await page.waitForFunction(()=>window.notice?.includes('Could not save completion'));
    assert.equal(await page.getByText('Not recorded',{exact:true}).count(),5);
    for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No page overflow at ${width}px`);}
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
