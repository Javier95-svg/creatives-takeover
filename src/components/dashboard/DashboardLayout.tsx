import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNavigationProvider } from '@/contexts/DashboardNavigationContext';
import { DashboardSidebar } from './DashboardSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  maxWidthClassName?: string;
  contentClassName?: string;
}

export const DashboardLayout = ({ children, title, subtitle, maxWidthClassName = 'max-w-7xl', contentClassName }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  void title;
  void subtitle;

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <DashboardNavigationProvider>
          <DashboardSidebar />
          <SidebarInset>
            <div className="relative min-h-screen overflow-hidden bg-[#090a0f] text-slate-100">
              <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
                <div className={cn('container mx-auto flex items-start justify-between px-4 pt-4 sm:px-6', maxWidthClassName)}>
                  <div className="pointer-events-auto flex items-start gap-4">
                    <SidebarTrigger className="rounded-full border border-white/10 bg-slate-950/80 text-slate-200 shadow-xl shadow-black/20 backdrop-blur-md hover:bg-white/[0.06]" />
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm font-medium text-slate-400 shadow-xl shadow-black/20 backdrop-blur-md transition-colors hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    aria-label="Exit dashboard and return to platform"
                    type="button"
                  >
                    <span>Platform</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[#090a0f]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_82%_16%,rgba(244,114,182,0.07),transparent_30%)]" />
                <div
                  className="absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                  }}
                />
              </div>

              <div className={cn('relative z-10 container mx-auto px-4 pb-24 pt-24 sm:px-6', maxWidthClassName, contentClassName)}>
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
