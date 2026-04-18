import { Helmet } from 'react-helmet-async';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ReferralSubtab } from '@/components/dashboard/ReferralSubtab';
import { useAuth } from '@/contexts/AuthContext';

const ReferralDashboardPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (!loading && !user) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Referral Program — Creatives Takeover</title>
      </Helmet>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardSidebar />
          <SidebarInset>
            <div className="min-h-screen relative overflow-hidden bg-background">
              <div
                style={{ top: 'var(--banner-height, 0)' } as React.CSSProperties}
                className="fixed left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/60"
              >
                <div className="container mx-auto px-6 py-3 max-w-7xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <SidebarTrigger />
                      <span className="text-sm font-medium text-muted-foreground">Referral Program</span>
                    </div>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="rounded-md border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/30 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center gap-2"
                      aria-label="Back to dashboard"
                      type="button"
                    >
                      <span>Dashboard</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative z-10 container mx-auto p-6 pb-24 space-y-8 max-w-5xl pt-24">
                <header className="space-y-1">
                  <h1 className="font-space-grotesk text-3xl sm:text-4xl font-semibold tracking-tight">
                    Referral Program
                  </h1>
                  <p className="text-muted-foreground">
                    Share your link. Every 3 new accounts created through it unlock a reward — automatically.
                  </p>
                </header>

                <ReferralSubtab />
              </div>
            </div>
          </SidebarInset>
        </DashboardNavigationProvider>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default ReferralDashboardPage;
