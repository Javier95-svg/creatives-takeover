import type { UserType } from './accountTypes.ts';

// Answers describe the person's current situation. Account labels are outputs.
export const ONBOARDING_SITUATIONS = [
  ['existing_project', 'I already have a project to develop', 'I want help moving my current project forward'],
  ['starting_project', 'I am starting from scratch', 'I am exploring an idea or deciding what to build'],
  ['share_expertise', 'I want to advise people building projects', 'Participation requires an invitation and admin approval'],
  ['deliver_services', 'I want to deliver services to projects', 'Participation requires an invitation and admin approval'],
  ['explore_investments', 'I want to explore projects to invest in', 'Tell us your investment interests for review'],
] as const;

export type OnboardingSituation = typeof ONBOARDING_SITUATIONS[number][0];
export function classifyOnboardingSituation(situation: unknown): UserType | '' {
  switch (situation) {
    case 'existing_project': return 'founder';
    case 'starting_project': return 'builder';
    case 'share_expertise': return 'mentor';
    case 'deliver_services': return 'marketplace';
    case 'explore_investments': return 'investor';
    default: return '';
  }
}
