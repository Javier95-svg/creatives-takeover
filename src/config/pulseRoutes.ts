import { getFounderTool, type FounderToolKey } from '@/config/founderToolCatalog';

export interface PulseRouteContext {
  pathPrefix: string;
  toolName: string;
  toolPurpose: string;
}

function founderToolContext(key: FounderToolKey, pathPrefix?: string): PulseRouteContext {
  const tool = getFounderTool(key);
  return {
    pathPrefix: pathPrefix ?? tool.route,
    toolName: tool.name,
    toolPurpose: tool.purpose,
  };
}

export const PULSE_ROUTE_CONTEXTS: PulseRouteContext[] = [
  {
    pathPrefix: "/",
    toolName: "Creatives Takeover",
    toolPurpose: "helping visitors understand the product, find the right tool, and decide where to start",
  },
  founderToolContext('icp_builder'),
  founderToolContext('icp_builder', '/bizmap-ai/icp-builder'),
  founderToolContext('pmf_lab'),
  founderToolContext('pmf_lab', '/bizmap-ai/pmf-lab'),
  founderToolContext('demo_studio'),
  founderToolContext('tech_stack'),
  founderToolContext('tech_stack', '/bizmap-ai/tech-stack'),
  founderToolContext('gtm_strategist'),
  founderToolContext('gtm_strategist', '/client-acquisition'),
  founderToolContext('pitch_deck_analyzer'),
  founderToolContext('pitch_deck_analyzer', '/insighta/pitch-deck-analyzer'),
  founderToolContext('directories'),
  {
    pathPrefix: "/marketplace",
    toolName: "Service Marketplace",
    toolPurpose: "helping the founder compare service providers and start direct conversations",
  },
  founderToolContext('vc_search'),
  founderToolContext('vc_search', '/insighta/vc-search'),
  founderToolContext('accelerator_hunt'),
  founderToolContext('accelerator_hunt', '/insighta/accelerator-hunt'),
  founderToolContext('email_templates'),
  founderToolContext('email_templates', '/insighta/email-templates'),
  founderToolContext('insighta_test'),
  founderToolContext('insighta_test', '/insighta/test'),
  founderToolContext('traction_engine'),
  founderToolContext('traction_engine', '/insighta/traction-engine'),
  {
    pathPrefix: "/decision-sprint",
    toolName: "Decision Sprint",
    toolPurpose: "helping the founder validate assumptions and choose the next move",
  },
  {
    pathPrefix: "/validate",
    toolName: "Validate Journey",
    toolPurpose: "helping the founder test demand and make evidence-based decisions",
  },
];

function matchesPathPrefix(pathname: string, pathPrefix: string): boolean {
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

export function getPulseRouteContext(pathname: string): PulseRouteContext | null {
  return PULSE_ROUTE_CONTEXTS.find(({ pathPrefix }) => matchesPathPrefix(pathname, pathPrefix)) ?? null;
}

export function shouldShowPulseForPath(pathname: string): boolean {
  return getPulseRouteContext(pathname) !== null;
}
