import React from "react";
import { FeatureTour } from "./FeatureTour";

const bizMapTourSteps = [
  {
    id: "welcome",
    title: "Welcome to BizMap AI! 🚀",
    description: "Your AI co-founder will guide you through 7 steps to create a complete business plan in 30 days. Each step builds on the last to turn your idea into an actionable launch plan.",
    position: "center" as const,
  },
  {
    id: "chat-interface",
    title: "Chat Interface",
    description: "Type your answers here. The AI will ask you questions one at a time. You can attach files (images, PDFs) to provide more context. Press Enter to send your message.",
    position: "bottom" as const,
  },
  {
    id: "progress-tracker",
    title: "Progress Tracker",
    description: "See your progress through all 7 steps. The active step is highlighted. You can review completed steps anytime.",
    position: "top" as const,
  },
  {
    id: "sessions",
    title: "Multiple Projects",
    description: "You can work on multiple business ideas at once. Each conversation is saved as a separate session. Switch between projects using the sidebar.",
    position: "left" as const,
  },
  {
    id: "report",
    title: "Launch Report",
    description: "After completing all steps, you'll get a comprehensive launch report with your business plan, market analysis, and 30-day action plan.",
    position: "top" as const,
  },
];

interface BizMapTourProps {
  onComplete?: () => void;
}

export const BizMapTour: React.FC<BizMapTourProps> = ({ onComplete }) => {
  return (
    <FeatureTour
      steps={bizMapTourSteps}
      onComplete={onComplete}
      featureName="bizmap-ai"
    />
  );
};

