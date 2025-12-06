import React from "react";
import { FeatureTour } from "./FeatureTour";

const dashboardTourSteps = [
  {
    id: "welcome",
    title: "Welcome to Your Dashboard! 📊",
    description: "Your Founder Command Center tracks your business progress, daily goals, tasks, and projects. Everything you need to stay organized and motivated.",
    position: "center" as const,
  },
  {
    id: "active-projects",
    title: "Active Projects",
    description: "See your top 3 active business planning projects from BizMap AI. Click any project to continue where you left off. Track progress and see next steps.",
    position: "bottom" as const,
  },
  {
    id: "tasks",
    title: "Task Overview",
    description: "Your daily priorities organized by importance. Click tasks to mark them complete. High-priority tasks are highlighted to help you focus.",
    position: "bottom" as const,
  },
  {
    id: "streak",
    title: "Daily Streak",
    description: "Build momentum with daily check-ins! Set morning goals and evening reflections. Your streak shows your consistency and commitment.",
    position: "top" as const,
  },
  {
    id: "calendar",
    title: "Task Calendar",
    description: "View your tasks on a calendar to plan your week. See deadlines and schedule your work effectively.",
    position: "right" as const,
  },
];

interface DashboardTourProps {
  onComplete?: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ onComplete }) => {
  return (
    <FeatureTour
      steps={dashboardTourSteps}
      onComplete={onComplete}
      featureName="dashboard"
    />
  );
};

