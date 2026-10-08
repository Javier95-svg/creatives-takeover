import type { ReactNode } from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import { MessagesSquare, Rocket, type LucideIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const TABS: ReadonlyArray<{ label: string; to: string; icon: LucideIcon; isActive: (path: string) => boolean }> = [
  { label: 'Rooms', to: '/launchpad/rooms', icon: MessagesSquare, isActive: (path) => path.startsWith('/launchpad/rooms') },
  { label: 'Launches', to: '/launchpad', icon: Rocket, isActive: (path) => path === '/launchpad' },
];

/**
 * Frame for the Chat Rooms section: signed-in only, a compact header and the
 * two tabs. Rooms uses the wide layout for its three columns.
 */
export function LaunchpadShell({ title, intro, seoTitle, actions, wide = false, children }: {
  title: string;
  intro?: ReactNode;
  seoTitle: string;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!loading && !user) {
    const back = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?source=launchpad&return=${encodeURIComponent(back)}`} replace />;
  }

  return <>
    <SEO title={seoTitle} description="Talk shop with founders, get feedback and launch with Creatives Takeover." url={location.pathname} noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className={cn('container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16', wide ? 'max-w-7xl' : 'max-w-5xl')}>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Chat Rooms</p>
            <h1 className="mt-1 font-space-grotesk text-headline-lg font-semibold">{title}</h1>
            {intro && <p className="mt-1.5 text-sm text-muted-foreground sm:text-body">{intro}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Chat Rooms tabs" className="flex rounded-xl border border-border/70 bg-muted/40 p-1">
              {TABS.map(({ label, to, icon: Icon, isActive }) => {
                const active = isActive(location.pathname);
                return <NavLink key={to} to={to} end={to === '/launchpad'} aria-current={active ? 'page' : undefined} className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}>
                  <Icon className="h-4 w-4" aria-hidden="true" />{label}
                </NavLink>;
              })}
            </nav>
            {actions}
          </div>
        </header>

        {loading || !user ? <div role="status" className="space-y-3">
          <span className="sr-only">Loading…</span>
          {[0, 1, 2].map((index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/60" />)}
        </div> : children}
      </main>
      <Footer />
    </div>
  </>;
}
