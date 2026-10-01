import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function evaluateRelease(briefs,evidence){
 const failures=[];
 const categories=['landing','app','dashboard','store','saas','internal'];
 const runs=Array.isArray(evidence.builds)?evidence.builds:[];
 const founders=Array.isArray(evidence.founders)?evidence.founders:[];
 const expected=new Set(briefs.map(b=>b.id));
 if(briefs.length!==30||expected.size!==30||categories.some(c=>briefs.filter(b=>b.category===c).length!==5))failures.push('Expected five distinct briefs for each of six categories.');
 if(runs.length!==30||new Set(runs.map(r=>r.briefId)).size!==30||runs.some(r=>!expected.has(r.briefId)))failures.push('All 30 representative builds need distinct recorded results.');
 const good=runs.filter(r=>r.outcomePassed===true&&Number.isInteger(r.repairs)&&r.repairs>=0&&r.repairs<=2&&typeof r.revision==='string'&&r.revision.length>0&&typeof r.evidenceUrl==='string'&&r.evidenceUrl.length>0);
 if(good.length<27)failures.push('Fewer than 27 builds passed within two included repairs.');
 for(const key of ['moduleRegressions','accessIsolation','failedWrites','expiredSessions','bookingContention','paymentLifecycle','editRetestPublishRestore','workerOutage','provisioningInterruption','noDuplicateCharges','liveConfiguration']){
  if(evidence.gates?.[key]?.passed!==true||!evidence.gates?.[key]?.evidenceUrl)failures.push('Missing passing evidence: '+key);
 }
 if(!Array.isArray(evidence.openCriticalRegressions)||evidence.openCriticalRegressions.length)failures.push('Critical regression register is missing or has open issues.');
 if(founders.length!==12||new Set(founders.map(f=>f.participantId)).size!==12||categories.some(c=>founders.filter(f=>f.category===c).length!==2))failures.push('Twelve distinct founder observations, two per category, are required.');
 if(founders.some(f=>!f.nontechnical||!f.evidenceUrl||f.usedSql||f.usedServiceKey||f.usedTerminal))failures.push('Founder observations must demonstrate the nontechnical setup promise.');
 if(founders.filter(f=>f.published===true&&f.coached===false).length<10)failures.push('Fewer than ten founders published without coaching.');
 const median=values=>{if(!values.length||values.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0))return Infinity;const a=[...values].sort((a,b)=>a-b);return(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
 if(median(founders.map(f=>f.previewMinutes))>=10)failures.push('Median preview time is not under ten minutes.');
 if(median(founders.map(f=>f.publishMinutesExcludingMerchantVerification))>=30)failures.push('Median publication time is not under thirty minutes.');
 if(founders.some(f=>typeof f.creditsUsed!=='number'||typeof f.repairAttempts!=='number'||typeof f.returnedWithinSevenDays!=='boolean'))failures.push('Pilot cost, repairs and seven-day return observations are incomplete.');
 return {eligibleForEight:failures.length===0,passedBuilds:good.length,totalBriefs:30,failures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(!process.argv[2]){console.error('Usage: node scripts/check-mvp-release-gates.mjs path/to/observed-evidence.json');process.exitCode=1;}
 else{
  const briefs=JSON.parse(await readFile(new URL('../tests/fixtures/mvp-release-briefs.json',import.meta.url),'utf8'));
  const evidence=JSON.parse(await readFile(process.argv[2],'utf8'));
  const result=evaluateRelease(briefs,evidence);console.log(JSON.stringify(result,null,2));if(!result.eligibleForEight)process.exitCode=1;
 }
}
