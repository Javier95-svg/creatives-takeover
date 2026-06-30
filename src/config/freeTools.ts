import { BarChart3, Boxes, FlaskConical, type LucideIcon } from 'lucide-react';

export interface FreeToolNavItem {
  label: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  analyticsTool: string;
}

export const FREE_TOOLS_NAV_ITEMS: FreeToolNavItem[] = [
  {
    label: 'Pitch Deck Analyzer',
    name: 'Pitch Deck Analyzer',
    href: '/pitch-deck-analyzer',
    icon: BarChart3,
    description: 'Score your deck across 6 investor dimensions.',
    analyticsTool: 'pitch_deck_analyzer',
  },
  {
    label: 'Insighta Test',
    name: 'Insighta Test',
    href: '/insighta-test',
    icon: FlaskConical,
    description: 'Check your fundraising readiness in minutes.',
    analyticsTool: 'insighta_test',
  },
  {
    label: 'Tech Stack Builder',
    name: 'Tech Stack Builder',
    href: '/tech-stack',
    icon: Boxes,
    description: 'Plan your startup stack and monthly budget.',
    analyticsTool: 'tech_stack',
  },
];
