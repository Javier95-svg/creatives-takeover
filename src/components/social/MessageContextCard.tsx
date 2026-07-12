import { CalendarDays, ExternalLink, FileText, Rocket, UserRound, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Message } from '@/hooks/useMessaging';

const internalContext = (content: string) => {
  const match = content.match(/(?:https?:\/\/[^\s]+)?(\/(?:co-founder|mentorship|services|demo-studio|files|bookings)[^\s]*)/i);
  if (!match) return null;
  const route = match[1].replace(/[.,!?;:)]+$/, '');
  if (route.startsWith('/co-founder')) return { kind: 'cofounder_listing', title: 'Co-founder opportunity', description: 'Open the founder listing and review the collaboration details.', route };
  if (route.startsWith('/mentorship')) return { kind: 'mentor', title: 'Mentor profile', description: 'Review expertise, availability and mentorship details.', route };
  if (route.startsWith('/bookings')) return { kind: 'booking', title: 'Mentor booking', description: 'Open the booking and review the meeting details.', route };
  if (route.startsWith('/services')) return { kind: 'artifact', title: 'Founder service', description: 'Open this shared platform resource.', route };
  if (route.startsWith('/demo-studio')) return { kind: 'artifact', title: 'Product demo', description: 'View the shared startup demo.', route };
  return { kind: 'artifact', title: 'Founder artifact', description: 'Open this shared workspace artifact.', route };
};

export const MessageContextCard = ({ message, isOwnMessage }: { message: Message; isOwnMessage: boolean }) => {
  const stored = message.context as Record<string, unknown> | null | undefined;
  const context = stored?.route && stored?.title ? stored : internalContext(message.content);
  if (!context) return null;
  if (typeof context.route !== 'string' || typeof context.title !== 'string' || (!context.route.startsWith('/') && !context.route.startsWith('https://'))) return null;
  const Icon = context.kind === 'mentor' || context.kind === 'profile' ? UserRound
    : context.kind === 'cofounder_listing' ? Users
      : context.kind === 'booking' ? CalendarDays
        : context.kind === 'artifact' ? FileText : Rocket;
  const external = /^https:\/\//.test(context.route);
  const className = `mt-2 flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${isOwnMessage ? 'border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15' : 'border-border bg-background/80 hover:bg-background'}`;
  const body = <><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{context.title}</span>{context.description && <span className="mt-0.5 line-clamp-2 block text-[11px] opacity-75">{context.description}</span>}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" /></>;
  return external
    ? <a href={context.route} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>
    : <Link to={context.route} className={className}>{body}</Link>;
};
