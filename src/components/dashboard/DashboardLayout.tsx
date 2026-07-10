import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardStreakChip } from './DashboardStreakChip';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardSidebar />
          <SidebarInset>
            <div className="relative min-h-screen overflow-hidden bg-background">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-50">
                <div className="container mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 px-6 pt-4">
                  <div className="pointer-events-auto flex items-start gap-2">
                    <SidebarTrigger className="rounded-full border border-border/70 bg-background/88 shadow-sm backdrop-blur-md" />
                    <DashboardStreakChip />
                  </div>
                  <div className="pointer-events-auto min-w-0 px-2 pt-1 text-center">
                    <h1 className="font-space-grotesk text-xl font-semibold">{title}</h1>
                    {subtitle ? (
                      <p className="mx-auto max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
                    ) : null}
                  </div>
                  <div className="pointer-events-auto flex items-start gap-2">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/88 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Open your command center"
                      type="button"
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                      <span>Command center</span>
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/88 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Exit dashboard and return to platform"
                      type="button"
                    >
                      <span>Platform</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Background */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-background" />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 15% 20%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 85% 30%, hsl(var(--accent) / 0.06), transparent 45%)',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
                    backgroundSize: '64px 64px',
                  }}
                />
              </div>

              {/* Page Content */}
              <div className="relative z-10 container mx-auto p-6 pb-24 max-w-7xl pt-24">
                {children}
              </div>
            </div>
          </SidebarInset>
        </DashboardNavigationProvider>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
