import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeRepairFiles} from '../supabase/functions/_shared/mvp-outcome-repair.ts';
test('repair merge preserves unrelated files and rejects dependency, duplicate and invented paths',()=>{
 const files=[{filename:'index.html',content:'old'},{filename:'style.css',content:'retained'},{filename:'package.json',content:'{}'}];
 assert.equal(mergeRepairFiles(files,[{filename:'index.html',content:'new'}])[1].content,'retained');
 assert.equal(files[0].content,'old');
 for(const patch of [[{filename:'server.js',content:'new'}],[{filename:'package.json',content:'changed'}],[{filename:'index.html',content:'one'},{filename:'index.html',content:'two'}]])assert.throws(()=>mergeRepairFiles(files,patch));
});
