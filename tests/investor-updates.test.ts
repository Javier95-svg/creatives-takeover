import assert from 'node:assert/strict';
import test from 'node:test';
import { deterministicSections, finalizedSnapshot, normalizeSections, type EvidenceItem } from '../supabase/functions/_shared/investor-update.ts';

const evidence: EvidenceItem[] = [
  { key:'traction.score',label:'Average traction score',value:72,quality:'platform-verified',source:'Traction Engine',change:20 },
  { key:'traction.revenue',label:'Recorded revenue',value:1200,quality:'founder-reported',source:'Weekly log' },
  { key:'metric.goal.mrr',label:'KPI current value — MRR',value:800,quality:'founder-reported',source:'KPI current value' },
  { key:'pitch.latest',label:'Pitch-deck analysis',value:null,quality:'missing',source:'Pitch Deck Analyzer' },
];

test('deterministic draft preserves evidence quality and never emits missing evidence',()=>{
  const sections=deterministicSections('stakeholder',{name:'Acme'},evidence);
  assert.match(sections.traction.join(' '),/72/);
  assert.doesNotMatch(JSON.stringify(sections),/Pitch-deck analysis/);
  assert.doesNotMatch(JSON.stringify(sections),/target/i);
});

test('fundraising and stakeholder templates use the same facts but different context',()=>{
  const stakeholder=deterministicSections('stakeholder',{name:'Acme',description:'Makes widgets'},evidence);
  const fundraising=deterministicSections('fundraising',{name:'Acme',description:'Makes widgets'},evidence);
  assert.notEqual(stakeholder.summary,fundraising.summary);
  assert.deepEqual(stakeholder.traction,fundraising.traction);
  assert.match(fundraising.summary,/Makes widgets/);
});

test('founder edits are bounded and control characters are removed',()=>{
  const normalized=normalizeSections({summary:'hello\u0000 world',wins:Array.from({length:20},(_,i)=>`win ${i}`),asks:['<script>alert(1)</script>']});
  assert.equal(normalized.summary,'hello world');
  assert.equal(normalized.wins.length,12);
  assert.equal(normalized.asks[0],'<script>alert(1)</script>'); // React renders this as text, never HTML.
});

test('final snapshot contains only approved sections and provenance notes',()=>{
  const snapshot=finalizedSnapshot({audience:'stakeholder',title:'Update',periodStart:'2026-10-01',periodEnd:'2026-10-31',sections:{summary:'Approved',wins:['One']},evidence,finalizedAt:'2026-11-01T00:00:00Z'});
  assert.equal(snapshot.sections.summary,'Approved');
  assert.equal(snapshot.evidenceNotes[0].quality,'platform-verified');
  assert.equal(snapshot.evidenceNotes.some((note)=>note.label==='Pitch-deck analysis'),false);
  assert.equal('value' in snapshot.evidenceNotes[0],false);
  assert.equal(JSON.stringify(snapshot).includes('target_value'),false);
});
