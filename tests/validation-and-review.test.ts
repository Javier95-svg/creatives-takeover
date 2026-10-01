import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identityOverlap,validateFeedback} from '../supabase/functions/_shared/validation-attendance.ts';
import {reviewEvidence} from '../supabase/functions/_shared/gtm-review-evidence.ts';
import {acquisitionCost,summarizeConnectedResults,connectedFunnel} from '../src/lib/connectedResults.ts';
import {verifyConnectionEvent} from '../supabase/functions/_shared/connection-events.ts';
test('attendance matches two booked identities and cannot inflate overlap through reconnects',()=>{
 const start='2026-09-01T10:00:00Z';const s=(subject:string|null,a:string,b:string|null)=>({subject,startTime:`2026-09-01T${a}Z`,endTime:b?`2026-09-01T${b}Z`:null});
 const rows=[s('founder','10:00:00','10:25:00'),s('reviewer','10:05:00','10:20:00'),s('reviewer','10:06:00','10:21:00'),s(null,'10:00:00','10:25:00')];
 assert.deepEqual(identityOverlap(rows,'founder','reviewer',start),{status:'verified',overlapSeconds:960});
 assert.equal(identityOverlap(rows,'founder','unknown',start).status,'review');assert.equal(identityOverlap(rows,'founder',null,start).status,'review');
 assert.equal(identityOverlap(rows,'founder','founder',start).status,'review');
 assert.equal(identityOverlap([s('founder','10:00:00','10:25:00'),s('reviewer','10:11:00','10:25:00')],'founder','reviewer',start).status,'review');
});
test('critical feedback is valid and unfinished feedback is rejected',()=>{
 assert.throws(()=>validateFeedback({clarity:'Good'},false));
 assert.equal(validateFeedback({clarity:'Unclear offer',objections:'I would not buy',willingnessToTry:'No interest',willingnessToPay:'I will not pay',suggestedChange:'Change your target buyer'},false).willingnessToPay,'I will not pay');
});
test('GTM review uses compatible completed windows and requires sample coverage',()=>{
 const row=(date:string,metric='Replies',decision='kill',sample=10)=>({target_metric:metric,decision,sample_size:sample,pass:false,traction_engine_weekly_logs:{week_start_date:date}});
 const rows=[row('2026-09-14'),row('2026-09-21'),row('2026-09-28','Replies','double_down'),row('2026-09-21','Clicks','double_down',500)];
 const rule={observationWindowWeeks:2,minSampleSize:20};const reviewed=reviewEvidence(rows,'Replies',rule,'2026-09-28');assert.equal(reviewed.decision,'kill');assert.equal(reviewed.sample,20);assert.equal(reviewed.history.length,2);
 assert.equal(reviewEvidence(rows.slice(1),'Replies',rule,'2026-09-28').decision,'collect_evidence');
 assert.equal(reviewEvidence([row('2026-09-14'),row('2026-09-21','Replies','iterate')],'Replies',rule,'2026-09-28').decision,'iterate');
});
test('financial summaries retain unknown attribution and never combine currencies',()=>{
 const row=(id:string,currency:string)=>({id,metric:'net_payments',value:100,currency,definition:{unit:'minor_currency',customer:'same',source:'stripe'},period_start:'2026-09-01',period_end:'2026-09-02',captured_at:'2026-09-03',provenance:'provider',status:'complete'});
 const result=summarizeConnectedResults([row('1','usd'),row('2','eur')],'2026-09-01','2026-09-30');assert.equal(result.revenue.length,2);assert.equal(result.paidCustomers,1);assert.equal(result.unattributed,2);
 assert.equal(acquisitionCost(100,10,true,false),null);assert.equal(acquisitionCost(100,0,true,true),null);assert.equal(acquisitionCost(100,10,true,true),10);
});
test('CRM and billing joins require one unambiguous participant and recorded campaign',()=>{
 const contact={kind:'contact',participant_key:'hash',captured_at:'2026-09-05',original:{hs_analytics_first_url:'https://product.test/?utm_campaign=play',lifecyclestage:'salesqualifiedlead'}};
 const payment={kind:'payment',participant_key:'hash',captured_at:'2026-09-06',summary:{source:'stripe'},original:{customer:'cus_1',paid:true,status:'succeeded',amount:100,amount_refunded:0}};
 const result=connectedFunnel([contact,payment],'play','2026-09-01','2026-09-30');assert.equal(result.matchedPaidCustomers,1);assert.equal(result.qualified,1);
 assert.equal(connectedFunnel([contact,{...contact},payment],'play','2026-09-01','2026-09-30').matchedPaidCustomers,0);
});
test('provider events require authentic bodies, fresh Stripe signatures and the selected form',async()=>{
 const secret='a-long-test-secret-not-a-real-credential',now=Date.parse('2026-09-30T12:00:00Z');
 const mac=async(body:string,hex=false)=>{const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(body)));return hex?Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''):btoa(String.fromCharCode(...bytes));};
 const raw=JSON.stringify({id:'evt_1',type:'charge.refunded'}),stamp=String(now/1000),headers=new Headers({'stripe-signature':`t=${stamp},v1=${await mac(stamp+'.'+raw,true)}`});
 assert.equal((await verifyConnectionEvent('stripe',raw,headers,secret,{},now)).id,'evt_1');
 await assert.rejects(verifyConnectionEvent('stripe',raw+' ',headers,secret,{},now),/signature/);
 await assert.rejects(verifyConnectionEvent('stripe',raw,headers,secret,{},now+301000),/Expired/);
 const tally=JSON.stringify({eventId:'e',data:{formId:'form'}}),tallyHeaders=new Headers({'tally-signature':await mac(tally)});
 assert.equal((await verifyConnectionEvent('tally',tally,tallyHeaders,secret,{formId:'form'})).id,'e');
 await assert.rejects(verifyConnectionEvent('tally',tally,tallyHeaders,secret,{formId:'different'}),/Unexpected form/);
});
