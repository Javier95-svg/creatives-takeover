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
              <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
                <div className="container mx-auto flex max-w-7xl items-start justify-between px-6 pt-4">
                  <div className="pointer-events-auto flex items-center gap-4">
                    <SidebarTrigger className="rounded-full border border-border/70 bg-background/88 shadow-sm backdrop-blur-md" />
                    <span className="text-sm font-medium text-muted-foreground">Referral Program</span>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/88 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:border-primary/30 hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label="Back to dashboard"
                    type="button"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
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
