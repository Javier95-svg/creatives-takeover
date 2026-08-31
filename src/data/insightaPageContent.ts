export interface InsightaPageLink {
  href: string;
  label: string;
}

export const insightaPageContent = {
  vcSearch: {
    relatedLinks: [
      { href: "/email-templates", label: "Email Templates" },
      { href: "/accelerator-hunt", label: "Accelerator Hunt" },
      { href: "/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
      { href: "/insighta-test", label: "Insighta Test" },
    ] satisfies InsightaPageLink[],
  },
  acceleratorHunt: {
    relatedLinks: [
      { href: "/vc-search", label: "VC Search" },
      { href: "/email-templates", label: "Email Templates" },
      { href: "/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
      { href: "/insighta-test", label: "Insighta Test" },
    ] satisfies InsightaPageLink[],
  },
} as const;
