export interface PulseRouteContext {
  pathPrefix: string;
  toolName: string;
  toolPurpose: string;
}

export const PULSE_ROUTE_CONTEXTS: PulseRouteContext[] = [
  {
    pathPrefix: "/",
    toolName: "Creatives Takeover",
    toolPurpose: "helping visitors understand the product, find the right tool, and decide where to start",
  },
  {
    pathPrefix: "/icp-builder",
    toolName: "ICP Builder",
    toolPurpose: "helping the founder define their ideal customer, pain points, and positioning",
  },
  {
    pathPrefix: "/bizmap-ai/icp-builder",
    toolName: "ICP Builder",
    toolPurpose: "helping the founder define their ideal customer, pain points, and positioning",
  },
  {
    pathPrefix: "/pmf-lab",
    toolName: "PMF Lab",
    toolPurpose: "helping the founder interpret validation evidence and product-market fit signals",
  },
  {
    pathPrefix: "/bizmap-ai/pmf-lab",
    toolName: "PMF Lab",
    toolPurpose: "helping the founder interpret validation evidence and product-market fit signals",
  },
  {
    pathPrefix: "/demo-studio",
    toolName: "Demo Studio",
    toolPurpose: "helping the founder build an interactive demo, record a VSL, and publish a launch page",
  },
  {
    pathPrefix: "/tech-stack",
    toolName: "Tech Stack Builder",
    toolPurpose: "helping the founder choose practical tools and implementation paths",
  },
  {
    pathPrefix: "/bizmap-ai/tech-stack",
    toolName: "Tech Stack Builder",
    toolPurpose: "helping the founder choose practical tools and implementation paths",
  },
  {
    pathPrefix: "/go-to-market",
    toolName: "GTM Strategist",
    toolPurpose: "helping the founder plan positioning, channels, and first customers",
  },
  {
    pathPrefix: "/client-acquisition",
    toolName: "GTM Strategist",
    toolPurpose: "helping the founder plan positioning, channels, and first customers",
  },
  {
    pathPrefix: "/pitch-deck-analyzer",
    toolName: "Pitch Deck Analyzer",
    toolPurpose: "helping the founder improve fundraising clarity and investor readiness",
  },
  {
    pathPrefix: "/insighta/pitch-deck-analyzer",
    toolName: "Pitch Deck Analyzer",
    toolPurpose: "helping the founder improve fundraising clarity and investor readiness",
  },
  {
    pathPrefix: "/directories",
    toolName: "Directories",
    toolPurpose: "helping the founder find relevant launch, investor, and growth resources",
  },
  {
    pathPrefix: "/vc-search",
    toolName: "VC Search",
    toolPurpose: "helping the founder identify relevant investors and prepare outreach",
  },
  {
    pathPrefix: "/insighta/vc-search",
    toolName: "VC Search",
    toolPurpose: "helping the founder identify relevant investors and prepare outreach",
  },
  {
    pathPrefix: "/accelerator-hunt",
    toolName: "Accelerator Hunt",
    toolPurpose: "helping the founder find accelerator opportunities that fit their stage",
  },
  {
    pathPrefix: "/insighta/accelerator-hunt",
    toolName: "Accelerator Hunt",
    toolPurpose: "helping the founder find accelerator opportunities that fit their stage",
  },
  {
    pathPrefix: "/email-templates",
    toolName: "Email Templates",
    toolPurpose: "helping the founder write clearer outreach and follow-up messages",
  },
  {
    pathPrefix: "/insighta/email-templates",
    toolName: "Email Templates",
    toolPurpose: "helping the founder write clearer outreach and follow-up messages",
  },
  {
    pathPrefix: "/insighta-test",
    toolName: "Insighta Test",
    toolPurpose: "helping the founder understand market and opportunity signals",
  },
  {
    pathPrefix: "/insighta/test",
    toolName: "Insighta Test",
    toolPurpose: "helping the founder understand market and opportunity signals",
  },
  {
    pathPrefix: "/traction-engine",
    toolName: "Traction Engine",
    toolPurpose: "helping the founder turn traction signals into practical growth actions",
  },
  {
    pathPrefix: "/insighta/traction-engine",
    toolName: "Traction Engine",
    toolPurpose: "helping the founder turn traction signals into practical growth actions",
  },
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
