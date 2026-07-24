import { BarChart3, Boxes, FlaskConical, MonitorPlay, Target, type LucideIcon } from 'lucide-react';

export interface FreeToolNavItem {
  label: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
  analyticsTool: string;
}

// ICP Builder and Demo Studio Try were previously excluded on the theory that
// listing them here would compete with the hero CTAs. The data says otherwise:
// over 30 days the hero CTAs drew 7 clicks while 31 people opened this menu, so
// the menu is where intent actually goes. Both hero destinations are listed
// first — ordered by how little the visitor needs to bring to get an answer.
export const FREE_TOOLS_NAV_ITEMS: FreeToolNavItem[] = [
  {
    label: 'ICP Builder',
    name: 'ICP Builder',
    href: '/icp-builder',
    icon: Target,
    description: 'Define your ideal customer — no signup, nothing to upload.',
    analyticsTool: 'icp_builder',
  },
  {
    label: 'Demo Studio',
    name: 'Demo Studio',
    href: '/demo-studio/try',
    icon: MonitorPlay,
    description: 'Turn your product idea into a playable demo.',
    analyticsTool: 'demo_studio_try',
  },
  {
    label: 'Tech Stack Builder',
    name: 'Tech Stack Builder',
    href: '/tech-stack',
    icon: Boxes,
    description: 'Plan your startup stack and monthly budget.',
    analyticsTool: 'tech_stack',
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
    label: 'Pitch Deck Analyzer',
    name: 'Pitch Deck Analyzer',
    href: '/pitch-deck-analyzer',
    icon: BarChart3,
    description: 'Score your deck across 6 investor dimensions.',
    analyticsTool: 'pitch_deck_analyzer',
  },
];
