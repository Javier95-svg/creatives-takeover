import {
  Coffee, Cpu, FlaskConical, Hammer, HandCoins, Lightbulb, MessageCircleQuestion, MessagesSquare, Megaphone,
  MousePointerClick, Rocket, Tag, Target, TrendingUp, Trophy, Users, type LucideIcon,
} from 'lucide-react';
import type { PostKind } from '@/lib/launchpad';

/** One icon per room, so the rail and the cards read at a glance. */
export const ROOM_ICONS: Record<string, LucideIcon> = {
  validation: FlaskConical,
  building: Hammer,
  launch: Rocket,
  traction: TrendingUp,
  fundraising: HandCoins,
  customers: Target,
  distribution: Megaphone,
  pricing: Tag,
  product: MousePointerClick,
  'tech-stack': Cpu,
  team: Users,
  'founder-life': Coffee,
};

export function roomIcon(slug: string | null | undefined): LucideIcon {
  return (slug && ROOM_ICONS[slug]) || MessagesSquare;
}

/** Post types: an icon plus the accent used for the card stripe and badge. */
export const KIND_VISUALS: Record<PostKind, { icon: LucideIcon; stripe: string; badge: string }> = {
  feedback: { icon: MessageCircleQuestion, stripe: 'bg-primary', badge: 'border-primary/30 bg-primary/10 text-primary' },
  milestone: { icon: Trophy, stripe: 'bg-success', badge: 'border-success/30 bg-success/10 text-success' },
  idea: { icon: Lightbulb, stripe: 'bg-warning', badge: 'border-warning/30 bg-warning/10 text-warning' },
  discussion: { icon: MessagesSquare, stripe: 'bg-muted-foreground/40', badge: 'border-border bg-muted/60 text-foreground' },
};
