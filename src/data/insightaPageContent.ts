export interface InsightaPageLink {
  href: string;
  label: string;
}

export interface InsightaSummaryItem {
  label: string;
  title: string;
  description: string;
}

export interface InsightaAnswerSummaryContent {
  title: string;
  description: string;
  updatedLabel: string;
  items: InsightaSummaryItem[];
}

export const insightaPageContent = {
  vcSearch: {
    relatedLinks: [
      { href: "/insighta/email-templates", label: "Email Templates" },
      { href: "/insighta/accelerator-hunt", label: "Accelerator Search" },
      { href: "/insighta/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
      { href: "/insighta/test", label: "Fundraising Assessment" },
    ] satisfies InsightaPageLink[],
    answerSummary: {
      title: "How founders use VC Search",
      description:
        "This page now includes direct, quotable explanations of the tool so AI search products can summarize it more accurately.",
      updatedLabel: "March 2026",
      items: [
        {
          label: "What it helps with",
          title: "Building a tighter investor shortlist",
          description:
            "VC Search helps founders filter venture firms by stage, geography, sector, and check size so the target list is more relevant.",
        },
        {
          label: "Why it matters",
          title: "Better research leads to better outreach",
          description:
            "A focused investor list reduces wasted outreach and improves the quality of fundraising conversations from the start.",
        },
        {
          label: "What founders get",
          title: "Faster investor research and better fit",
          description:
            "The tool helps you move from generic VC research to a more credible shortlist that supports deck prep and outreach planning.",
        },
      ],
    } satisfies InsightaAnswerSummaryContent,
  },
  acceleratorHunt: {
    relatedLinks: [
      { href: "/insighta/vc-search", label: "VC Search" },
      { href: "/insighta/email-templates", label: "Email Templates" },
      { href: "/insighta/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
      { href: "/insighta/test", label: "Fundraising Assessment" },
    ] satisfies InsightaPageLink[],
    answerSummary: {
      title: "How founders use Accelerator Hunt",
      description:
        "This page includes direct, quotable explanations of the tool so AI search products can describe Accelerator Hunt more accurately.",
      updatedLabel: "April 2026",
      items: [
        {
          label: "What it helps with",
          title: "Shortlisting programs that match your stage",
          description:
            "Accelerator Hunt helps founders filter programs by geography, format, focus area, and funding so the shortlist reflects actual fit.",
        },
        {
          label: "Why it matters",
          title: "Program fit shapes the quality of applications",
          description:
            "Better accelerator research helps founders avoid mismatched applications and focus on programs where the offer, network, and cohort model make sense.",
        },
        {
          label: "What founders get",
          title: "Faster program research and clearer next steps",
          description:
            "The tool helps founders move from a generic accelerator list to a tighter set of programs they can review, compare, and apply to with more confidence.",
        },
      ],
    } satisfies InsightaAnswerSummaryContent,
  },
} as const;
