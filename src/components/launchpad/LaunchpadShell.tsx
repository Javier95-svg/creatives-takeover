import type { ReactNode } from 'react';
import { Navigate, NavLink, useLocation } from 'react-router-dom';
import { Hash, MessagesSquare, Rocket, UsersRound, type LucideIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const LAUNCHPAD_TABS: ReadonlyArray<{ label: string; to: string; icon: LucideIcon; end?: boolean }> = [
  { label: 'Launchpad', to: '/launchpad', icon: Rocket, end: true },
  { label: 'Posts', to: '/launchpad/posts', icon: MessagesSquare },
  { label: 'Topics', to: '/launchpad/topics', icon: Hash },
  { label: 'Profiles', to: '/launchpad/profiles', icon: UsersRound },
];

/**
 * Frame for every Launchpad page: signed-in only at launch, one header, and the
 * four tabs. Each page brings its own title and intro so the header answers
 * "what is this tab for" without a separate onboarding step.
 */
export function LaunchpadShell({ title, intro, seoTitle, actions, children }: {
  title: string;
  intro: ReactNode;
  seoTitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (!loading && !user) {
    const back = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?source=launchpad&return=${encodeURIComponent(back)}`} replace />;
  }

  return <>
    <SEO title={seoTitle} description="Share progress, get feedback and meet founders building with Creatives Takeover." url={location.pathname} noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto max-w-5xl px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Launchpad</p>
            <h1 className="mt-1 font-space-grotesk text-headline-lg font-semibold">{title}</h1>
            <p className="mt-2 text-body text-muted-foreground">{intro}</p>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>

        <nav aria-label="Launchpad tabs" className="mb-6 flex gap-1 overflow-x-auto border-b border-border/70">
          {LAUNCHPAD_TABS.map(({ label, to, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>
              <Icon className="h-4 w-4" aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>

        {loading || !user ? <div role="status" className="space-y-3">
          <span className="sr-only">Loading Launchpad…</span>
          {[0, 1, 2].map((index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/60" />)}
        </div> : children}
      </main>
      <Footer />
    </div>
  </>;
}
