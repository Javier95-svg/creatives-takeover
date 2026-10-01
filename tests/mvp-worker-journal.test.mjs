import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CleanupJournal} from '../workers/mvp-workflow/journal.mjs';
import {evaluateRelease} from '../scripts/check-mvp-release-gates.mjs';
import {readFile} from 'node:fs/promises';
test('cleanup survives controller restarts and rejects paths outside its directory',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ct-cleanup-'));
 try{
  const id='10000000-0000-0000-0000-000000000001',record={id,emails:['ct-test@example.invalid'],users:[]};
  await new CleanupJournal(dir).save(record);
  assert.deepEqual(await new CleanupJournal(dir).entries(),[record]);
  assert.throws(()=>new CleanupJournal(dir).path('../secrets'),/Invalid/);
  await new CleanupJournal(dir).remove(id);
  assert.deepEqual(await new CleanupJournal(dir).entries(),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('a fixture list and component tests alone never qualify for an 8/10 claim',async()=>{
 const briefs=JSON.parse(await readFile('tests/fixtures/mvp-release-briefs.json','utf8'));
 const result=evaluateRelease(briefs,{});
 assert.equal(result.eligibleForEight,false);assert.equal(result.passedBuilds,0);
 assert.ok(result.failures.some(f=>f.includes('Twelve')));
 assert.ok(result.failures.some(f=>f.includes('paymentLifecycle')));
});
