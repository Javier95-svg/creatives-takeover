import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, MoreHorizontal, Search } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WorkspaceFrameContext } from '@/contexts/WorkspaceFrameContext';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { enterWorkspaceRoute } from '@/lib/workspaceNavigation';
import '@/components/workspace-route-frame.css';

export interface WorkspaceLayoutProps {
  children: ReactNode;
  account: { username: string; plan: string };
  avatar: ReactNode;
  profileHref: string;
  updates?: ReactNode;
  search: ReactNode;
  credits: ReactNode;
  utilities: ReactNode;
  theme: ReactNode;
  signOut?: ReactNode;
  home?: boolean;
  persistentPreviewNavigation?: boolean;
}

export default function WorkspaceLayout({ children, account, avatar, profileHref, updates, search, credits, utilities, theme, signOut, home = false, persistentPreviewNavigation = false }: WorkspaceLayoutProps) {
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [mobile, setMobile] = useState(() => !persistentPreviewNavigation && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(!persistentPreviewNavigation && media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [persistentPreviewNavigation]);
  useEffect(() => {
    setDrawer(false); setSearchOpen(false); setMore(false);
    document.querySelector('.workspace-route-content')?.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  const sidebar = <WorkspaceSidebar account={account} avatar={avatar} profileHref={profileHref} updates={updates}
    currentPath={home ? '/' : location.pathname} initialCollapsed={persistentPreviewNavigation || !home} mobile={mobile}
    navigateTo={path => { setDrawer(false); enterWorkspaceRoute(path); }} />;
  return <WorkspaceFrameContext.Provider value={true}>
    <div data-telemetry-private className={`ph-no-capture ph-mask workspace-shell flex h-dvh overflow-hidden bg-background text-foreground ${persistentPreviewNavigation ? 'workspace-preview-persistent' : ''}`}>
      {!mobile && sidebar}
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 md:gap-4 md:pl-5 lg:pl-8">
          {mobile ? <div className="flex items-center gap-1">
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger asChild><button aria-label="Open navigation" className="workspace-icon-button"><Menu /></button></SheetTrigger>
              <SheetContent side="left" data-telemetry-private className="ph-no-capture ph-mask w-80 max-w-full p-0"><SheetTitle className="sr-only">Navigation</SheetTitle><SheetDescription className="sr-only">Platform tools and your account</SheetDescription>{sidebar}</SheetContent>
            </Sheet>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild><button aria-label="Search accounts" className="workspace-icon-button"><Search /></button></DialogTrigger>
              <DialogContent data-telemetry-private className="ph-no-capture ph-mask top-8 translate-y-0"><DialogTitle>Search accounts</DialogTitle><DialogDescription>Find people by name or username.</DialogDescription>{search}</DialogContent>
            </Dialog>
          </div> : search}
          <div className="flex shrink-0 items-center gap-2">
            {credits}
            {mobile ? <Popover open={more} onOpenChange={setMore}><PopoverTrigger asChild><button aria-label="Account utilities" className="workspace-icon-button"><MoreHorizontal /></button></PopoverTrigger><PopoverContent align="end" className="w-auto"><div className="flex items-center gap-1">{utilities}</div><div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2">{theme}{signOut}</div></PopoverContent></Popover>
              : <><div className="ml-2 flex items-center gap-1 border-x border-border/60 px-2" role="group" aria-label="Account utilities">{utilities}</div>{theme}{signOut}</>}
          </div>
        </header>
        <Suspense fallback={<div role="status" aria-live="polite" className="min-h-0 flex-1 p-8 text-muted-foreground">Loading page…</div>}>
          {home ? children : <div role="region" aria-label="Route content" className="workspace-route-content min-h-0 flex-1 overflow-auto">{children}</div>}
        </Suspense>
      </main>
    </div>
  </WorkspaceFrameContext.Provider>;
}
