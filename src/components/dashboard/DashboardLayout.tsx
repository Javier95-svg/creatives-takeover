import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from './DashboardSidebar';
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
            <div className="min-h-screen relative overflow-hidden bg-background">
              {/* Fixed Header */}
              <div
                style={{ top: 'var(--banner-height, 0)' } as React.CSSProperties}
                className="fixed left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60"
              >
                <div className="container mx-auto px-6 py-3 max-w-7xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger />
                      <div>
                        <h1 className="font-space-grotesk text-xl font-semibold">{title}</h1>
                        {subtitle && (
                          <p className="text-sm text-muted-foreground">{subtitle}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/')}
                      className="rounded-md border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center gap-2"
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
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-background" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent" />
                <div
                  className="absolute inset-0 opacity-[0.015]"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                    backgroundSize: '32px 32px',
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
