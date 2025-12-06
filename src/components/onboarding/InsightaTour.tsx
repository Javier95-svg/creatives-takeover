import React from "react";
import { FeatureTour } from "./FeatureTour";

const insightaTourSteps = [
  {
    id: "welcome",
    title: "Welcome to Insighta! 💰",
    description: "Discover funding opportunities, grants, accelerators, and contests for your business. Filter by type, location, or search keywords to find the perfect match.",
    position: "center" as const,
  },
  {
    id: "search",
    title: "Search & Filter",
    description: "Use the search bar to find opportunities by keywords. Click 'Show Filters' to filter by funding type (grant, accelerator, contest, microfund) or location.",
    position: "bottom" as const,
  },
  {
    id: "opportunities",
    title: "Funding Opportunities",
    description: "Each card shows the funding type, amount, location, and description. Featured opportunities are highlighted. Click 'Learn More' to visit the official page.",
    position: "top" as const,
  },
  {
    id: "bookmarks",
    title: "Bookmark Opportunities",
    description: "Save interesting opportunities for later review. Bookmarked items are saved to your account so you can access them anytime.",
    position: "top" as const,
  },
  {
    id: "integration",
    title: "Integration with BizMap AI",
    description: "After completing your business plan in BizMap AI, you'll get personalized funding recommendations based on your industry and business stage.",
    position: "top" as const,
  },
];

interface InsightaTourProps {
  onComplete?: () => void;
}

export const InsightaTour: React.FC<InsightaTourProps> = ({ onComplete }) => {
  return (
    <FeatureTour
      steps={insightaTourSteps}
      onComplete={onComplete}
      featureName="insighta"
    />
  );
};

