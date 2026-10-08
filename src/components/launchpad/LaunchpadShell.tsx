import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { MessagesSquare, Rocket, type LucideIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { JoinGateProvider } from './JoinGate';

const TABS: ReadonlyArray<{ label: string; to: string; icon: LucideIcon; isActive: (path: string) => boolean }> = [
  { label: 'Rooms', to: '/rooms', icon: MessagesSquare, isActive: (path) => path === '/rooms' || path.startsWith('/rooms/') },
  { label: 'Launchpad', to: '/launchpad', icon: Rocket, isActive: (path) => path === '/launchpad' },
];

export type CommunityTheme = 'rooms' | 'launches';

/**
 * Frame for the Community section, built like the core tool pages: each tab
 * brings its own colour (a .tool-theme-* class that remaps primary), a quiet
 * wallpaper behind the header, and a small illustration of what it does.
 * Public to read; every action asks visitors to join (see JoinGate).
 */
export function LaunchpadShell({ title, intro, seoTitle, actions, wide = false, theme, wallpaper, headerArt, children }: {
  title: string;
  intro?: ReactNode;
  seoTitle: string;
  actions?: ReactNode;
  wide?: boolean;
  theme: CommunityTheme;
  wallpaper?: ReactNode;
  headerArt?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const back = encodeURIComponent(`${location.pathname}${location.search}`);

  return <JoinGateProvider theme={theme}>
    <SEO title={seoTitle} description="Talk shop with founders, get feedback and launch with Creatives Takeover." url={location.pathname} noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <section className={cn('relative isolate overflow-hidden', `tool-theme-${theme}`)}>
        {wallpaper}
        <main className={cn('container relative mx-auto px-4 pt-header-offset nav-offset-roomy pb-16', wide ? 'max-w-7xl' : 'max-w-5xl')}>
          <header className="mb-6 flex items-end justify-between gap-6 border-b border-border/60 pb-6">
            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Community</p>
                <h1 className="mt-1 font-space-grotesk text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
                {intro && <p className="mt-2 max-w-xl text-base text-muted-foreground">{intro}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <nav aria-label="Community tabs" className="flex rounded-xl border border-border/70 bg-card/80 p-1 backdrop-blur-sm">
                  {TABS.map(({ label, to, icon: Icon, isActive }) => {
                    const active = isActive(location.pathname);
                    return <NavLink key={to} to={to} end={to === '/launchpad'} aria-current={active ? 'page' : undefined} className={cn(
                      'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}>
                      <Icon className="h-4 w-4" aria-hidden="true" />{label}
                    </NavLink>;
                  })}
                </nav>
                {actions}
              </div>
            </div>
            {headerArt && <div className="hidden h-36 w-64 shrink-0 md:block lg:w-80">{headerArt}</div>}
          </header>

          {!loading && !user && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-sm"><span className="font-semibold">You're browsing as a visitor.</span> Sign up free to post, reply, upvote and launch your product.</p>
            <div className="flex gap-2">
              <Button asChild size="sm"><Link to={`/signup?source=community&return=${back}`}>Sign up free</Link></Button>
              <Button asChild size="sm" variant="outline"><Link to={`/login?source=community&return=${back}`}>Log in</Link></Button>
            </div>
          </div>}

          {loading ? <div role="status" className="space-y-3">
            <span className="sr-only">Loading…</span>
            {[0, 1, 2].map((index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/60" />)}
          </div> : children}
        </main>
      </section>
      <Footer />
    </div>
  </JoinGateProvider>;
}
