import { BarChart3, Boxes, FlaskConical, type LucideIcon } from 'lucide-react';

export interface FreeToolNavItem {
  label: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  analyticsTool: string;
}

// The two hero destinations are intentionally NOT listed here: Demo Studio
// (/demo-studio, the "Have a product?" CTA) and ICP Builder (/icp-builder, the
// "Still an idea?" CTA). Duplicating them in this menu competes with the hero
// paths. 68628263 added both on the argument that the menu out-draws the hero
// CTAs; that was reverted at the owner's request. Do not re-add them without
// asking.
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
