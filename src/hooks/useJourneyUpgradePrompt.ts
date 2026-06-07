import { useCallback } from "react";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useCredits } from "@/hooks/useCredits";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { trackUpgradePromptShown } from "@/lib/analytics";
import type { Plan } from "@/config/planPermissions";

export type JourneyUpgradeTrigger =
  | "rookie_icp_complete"
  | "rookie_waitlist_published"
  | "starter_pmf_complete"
  | "starter_tool_mvp"
  | "starter_tool_tech"
  | "starter_tool_gtm"
  | "starter_tool_directories"
  | "rising_quota_vc"
  | "rising_quota_accelerator"
  | "rising_pitch_deck_heavy";

type JourneyUpgradeConfig = {
  requiredCurrentPlans: Plan[];
  targetPlan: Exclude<Plan, "rookie">;
  featureName: string;
  description: string;
  sourceTool: string;
};

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

const JOURNEY_UPGRADE_CONFIG: Record<JourneyUpgradeTrigger, JourneyUpgradeConfig> = {
  rookie_icp_complete: {
    requiredCurrentPlans: ["rookie"],
    targetPlan: "starter",
    featureName: "PMF Lab",
    sourceTool: "ICP Builder",
    description: "You clarified your ICP. Starter unlocks PMF Lab so you can validate demand before you build.",
  },
  rookie_waitlist_published: {
    requiredCurrentPlans: ["rookie"],
    targetPlan: "starter",
    featureName: "PMF Lab",
    sourceTool: "Demo Studio",
    description: "Your waitlist is live. Starter unlocks PMF Lab, Email Templates, and more research access so you can turn early interest into validation.",
  },
  starter_pmf_complete: {
    requiredCurrentPlans: ["starter"],
    targetPlan: "rising",
    featureName: "MVP Builder and GTM Strategist",
    sourceTool: "PMF Lab",
    description: "You validated the market need. Rising unlocks MVP Builder, Tech Stack Builder, GTM Strategist, and Directories for the build-and-launch stage.",
  },
  starter_tool_mvp: {
    requiredCurrentPlans: ["rookie", "starter"],
    targetPlan: "rising",
    featureName: "MVP Builder",
    sourceTool: "MVP Builder",
    description: "Rising unlocks the full build layer: MVP Builder, Tech Stack Builder, GTM Strategist, and Directories.",
  },
  starter_tool_tech: {
    requiredCurrentPlans: ["rookie", "starter"],
    targetPlan: "rising",
    featureName: "Tech Stack Builder",
    sourceTool: "Tech Stack Builder",
    description: "Rising unlocks Tech Stack Builder alongside MVP Builder and GTM Strategist for the full build workflow.",
  },
  starter_tool_gtm: {
    requiredCurrentPlans: ["rookie", "starter"],
    targetPlan: "rising",
    featureName: "GTM Strategist",
    sourceTool: "GTM Strategist",
    description: "Rising unlocks GTM Strategist so you can turn validation into a focused launch plan.",
  },
  starter_tool_directories: {
    requiredCurrentPlans: ["rookie", "starter"],
    targetPlan: "rising",
    featureName: "Directories",
    sourceTool: "Directories",
    description: "Rising unlocks Directories with the full build-and-launch toolset.",
  },
  rising_quota_vc: {
    requiredCurrentPlans: ["rising"],
    targetPlan: "pro",
    featureName: "Unlimited VC profile views",
    sourceTool: "VC Search",
    description: "Pro removes research caps and unlocks the fundraising layer, including Find Your Angel.",
  },
  rising_quota_accelerator: {
    requiredCurrentPlans: ["rising"],
    targetPlan: "pro",
    featureName: "Unlimited Accelerator profile views",
    sourceTool: "Accelerator Hunt",
    description: "Pro removes research caps and gives you the fundraising depth for serious outreach.",
  },
  rising_pitch_deck_heavy: {
    requiredCurrentPlans: ["rising"],
    targetPlan: "pro",
    featureName: "Find Your Angel",
    sourceTool: "Pitch Deck Analyzer",
    description: "You are preparing for investors. Pro adds Find Your Angel, unlimited research views, and the highest credit runway.",
  },
};

const getDismissKey = (trigger: JourneyUpgradeTrigger) => `ct_journey_upgrade_${trigger}`;

const isDismissed = (trigger: JourneyUpgradeTrigger) => {
  try {
    const value = window.localStorage.getItem(getDismissKey(trigger));
    return Boolean(value) && Date.now() - Number(value) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
};

export function dismissJourneyUpgradePrompt(trigger: JourneyUpgradeTrigger) {
  try {
    window.localStorage.setItem(getDismissKey(trigger), String(Date.now()));
  } catch {
    // localStorage can be unavailable in private contexts.
  }
}

export function useJourneyUpgradePrompt() {
  const { currentTier, isLoading } = useFeatureGating();
  const { totalAvailable } = useCredits();
  const { openUpgradePrompt } = useUpgradePrompt();

  const fireJourneyUpgradePrompt = useCallback(
    (trigger: JourneyUpgradeTrigger, options?: { force?: boolean; description?: string; sourceTool?: string }) => {
      const config = JOURNEY_UPGRADE_CONFIG[trigger];
      if (!config) return false;
      if (isLoading) return false;
      if (!options?.force && isDismissed(trigger)) return false;
      if (!config.requiredCurrentPlans.includes(currentTier)) return false;

      openUpgradePrompt({
        reason: "feature",
        featureName: config.featureName,
        requiredTier: config.targetPlan,
        description: options?.description || config.description,
        journeyTrigger: trigger,
        sourceTool: options?.sourceTool || config.sourceTool,
      });
      if (trigger === "rookie_icp_complete") {
        trackUpgradePromptShown({
          trigger: "post_icp_nudge",
          credits_remaining: totalAvailable,
          current_plan: currentTier,
          target_plan: config.targetPlan,
        });
      }
      return true;
    },
    [currentTier, isLoading, openUpgradePrompt, totalAvailable]
  );

  return {
    fireJourneyUpgradePrompt,
  };
}
