import test from 'node:test';
import assert from 'node:assert/strict';
import {MVPProjectSaveQueue} from '../src/lib/mvp-builder/saveQueue.ts';

test('overlapping saves serialize and flush the latest edit before reporting saved',async()=>{
 let revision=1,saved=0,active=0,maxActive=0;const writes:number[]=[];
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const queue=new MVPProjectSaveQueue(async()=>{active++;maxActive=Math.max(maxActive,active);const snapshot=revision;writes.push(snapshot);if(writes.length===1)await gate;saved=snapshot;active--;return saved===revision?'saved':'changed';});
 const first=queue.save();revision=2;const second=queue.save();release();
 assert.equal(await first,true);assert.equal(await second,true);assert.equal(saved,2);assert.equal(maxActive,1);assert.deepEqual(writes,[1,2]);
});
test('a failed save retains the draft and explicit retry writes its latest content',async()=>{
 let revision=1,failed=true,saved=0;
 const queue=new MVPProjectSaveQueue(async()=>{if(failed)return 'failed';saved=revision;return 'saved';});
 assert.equal(await queue.save(),false);revision=2;failed=false;assert.equal(await queue.save(),true);assert.equal(saved,2);
});
test('a rejected transport releases the queue for retry',async()=>{
 let calls=0;const queue=new MVPProjectSaveQueue(async()=>{if(++calls===1)throw Error('Network unavailable');return 'saved';});
 assert.equal(await queue.save(),false);assert.equal(await queue.save(),true);
});
