import {test} from 'node:test';
import assert from 'node:assert/strict';
import {automaticWorkflow,planFromPrompt,launchRequirement} from '../supabase/functions/_shared/mvp-builder-journey.ts';
test('a prompt creates a reviewable plan without a category or technical test selection',()=>{
 const brief=planFromPrompt('Private project notes for my customers');
 assert.ok(brief.customer);assert.equal(brief.delivery,'preview');assert.equal(automaticWorkflow(brief),undefined);
 brief.delivery='connected';assert.equal(automaticWorkflow(brief)?.starter,'customer_portal');
});
test('automatic checks never certify a store, booking or dashboard as a saved note',()=>{
 for(const idea of ['A handmade store','Book yoga classes','A revenue dashboard']){
  const brief=planFromPrompt(idea);brief.delivery='connected';assert.equal(automaticWorkflow(brief),undefined);assert.match(launchRequirement(brief,false)!,/not available/);
 }
});
test('static launch requires a destination and cloud workflows cannot launch preview data',()=>{
 const brief=planFromPrompt('A portfolio website');assert.match(launchRequirement(brief,false)!,/destination/);
 brief.ctaUrl='https://example.com';assert.equal(launchRequirement(brief,false),null);
 const notes=planFromPrompt('Private notes');assert.match(launchRequirement(notes,false)!,/preview data/);
});

test('plain lead capture and requester portals choose their actual workflow',()=>{for(const [idea,starter]of [['Collect leads for my studio','lead_capture'],['A customer portal for support requests','request_management']]){const b=planFromPrompt(idea);b.delivery='connected';assert.equal(automaticWorkflow(b)?.starter,starter);assert.ok(b.features.length<=3);}});
