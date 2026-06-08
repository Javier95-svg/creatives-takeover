export interface PulseRouteContext {
  pathPrefix: string;
  toolName: string;
  toolPurpose: string;
}

export const PULSE_ROUTE_CONTEXTS: PulseRouteContext[] = [
  {
    pathPrefix: "/icp-builder",
    toolName: "ICP Builder",
    toolPurpose: "helping the founder define their ideal customer, pain points, and positioning",
  },
  {
    pathPrefix: "/pmf-lab",
    toolName: "PMF Lab",
    toolPurpose: "helping the founder interpret validation evidence and product-market fit signals",
  },
  {
    pathPrefix: "/demo-studio",
    toolName: "Demo Studio",
    toolPurpose: "helping the founder shape a demo, waitlist, or validation page",
  },
  {
    pathPrefix: "/tech-stack",
    toolName: "Tech Stack Builder",
    toolPurpose: "helping the founder choose practical tools and implementation paths",
  },
  {
    pathPrefix: "/go-to-market",
    toolName: "GTM Strategist",
    toolPurpose: "helping the founder plan positioning, channels, and first customers",
  },
  {
    pathPrefix: "/pitch-deck-analyzer",
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
    pathPrefix: "/accelerator-hunt",
    toolName: "Accelerator Hunt",
    toolPurpose: "helping the founder find accelerator opportunities that fit their stage",
  },
  {
    pathPrefix: "/email-templates",
    toolName: "Email Templates",
    toolPurpose: "helping the founder write clearer outreach and follow-up messages",
  },
  {
    pathPrefix: "/insighta-test",
    toolName: "Insighta Test",
    toolPurpose: "helping the founder understand market and opportunity signals",
  },
  {
    pathPrefix: "/traction-engine",
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

const PULSE_HIDDEN_PATH_PREFIXES = [
  "/dashboard",
  "/mvp-builder",
  "/mvp-scope",
  "/projects-dashboard",
  "/onboarding",
  "/auth",
  "/auth/callback",
  "/login",
  "/signup",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/admin",
  "/creatives-takeover",
  "/rag-test",
  "/test-phase1",
  "/demo/",
  "/embed/demo/",
  "/w/",
  "/icp/",
];

function matchesPathPrefix(pathname: string, pathPrefix: string): boolean {
  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

export function getPulseRouteContext(pathname: string): PulseRouteContext | null {
  const explicitContext = PULSE_ROUTE_CONTEXTS.find(({ pathPrefix }) => matchesPathPrefix(pathname, pathPrefix));

  if (explicitContext) return explicitContext;

  if (!shouldShowPulseForPath(pathname)) return null;

  return {
    pathPrefix: pathname,
    toolName: "Creatives Takeover",
    toolPurpose: "helping the founder navigate the platform and decide what to do next",
  };
}

export function shouldShowPulseForPath(pathname: string): boolean {
  return !PULSE_HIDDEN_PATH_PREFIXES.some((pathPrefix) => matchesPathPrefix(pathname, pathPrefix));
}
