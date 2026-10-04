import {buildBriefErrors,createBuildBrief,type MVPBuildBrief} from './mvp-build-brief.ts';
import {deriveCapabilities,unsupportedRequest} from './mvp-capabilities.ts';
import {WORKFLOW_STARTERS,type WorkflowDefinition} from './mvp-workflow.ts';
export function planFromPrompt(idea:string,customer=''):MVPBuildBrief {
 const brief=createBuildBrief(idea);
 brief.customer=customer.trim()||'The people described in this app idea';
 const profile=deriveCapabilities(brief).profile;
 const starter=profile==='lead_capture_v2'?'lead_capture':profile==='request_management'?'request_management':profile==='private_records'?'customer_portal':null;
 if(starter){brief.task=WORKFLOW_STARTERS[starter].task;brief.features=[...WORKFLOW_STARTERS[starter].features];}
 return brief;
}
export function automaticWorkflow(brief:MVPBuildBrief):WorkflowDefinition|undefined {
 if(buildBriefErrors(brief).length||brief.delivery==='preview')return;
 const profile=deriveCapabilities(brief).profile;
 // Never certify bookings, dashboards or payments with a generic record test.
 const starter=profile==='lead_capture_v2'?'lead_capture':profile==='private_records'?'customer_portal':profile==='request_management'?'request_management':undefined;
 if(!starter)return;
 const defaults=WORKFLOW_STARTERS[starter];
 return {version:1,starter,customer:brief.customer,task:brief.task,outcome:defaults.outcome,features:[...brief.features]};
}
export function launchRequirement(brief:MVPBuildBrief|undefined,hasWorkflow:boolean):string|null {
 if(!brief)return hasWorkflow?null:'Describe your app first.';
 const errors=buildBriefErrors(brief);if(errors.length)return errors[0];
 const excluded=unsupportedRequest(brief.idea);if(excluded)return excluded;
 const profile=deriveCapabilities(brief).profile;
 if(profile==='static_landing')return brief.ctaUrl?null:'Add the destination for your main button in App details.';
 if(brief.delivery==='preview')return 'This draft uses preview data. Connect working services before launch.';
 if(!hasWorkflow)return 'This app needs an outcome check that is not available yet. You can edit and export the draft.';
 return null;
}
