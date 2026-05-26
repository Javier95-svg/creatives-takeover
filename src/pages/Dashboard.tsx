import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import StartupHomeCommandCenter from '@/components/dashboard/StartupHomeCommandCenter';
import FirstRunCard from '@/components/dashboard/FirstRunCard';
import JourneyNextStepCard from '@/components/dashboard/JourneyNextStepCard';
import StarterDashboardNudge from '@/components/dashboard/StarterDashboardNudge';
import { useExitIntent } from '@/hooks/useExitIntent';
import { ExitIntentModal } from '@/components/ExitIntentModal';

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showExitIntent, closeExitIntent } = useExitIntent();
  const fromIcpBuilder = searchParams.get('from') === 'icp_builder';

  const dismissIcpBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('from');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard — Creatives Takeover</title>
      </Helmet>
      {fromIcpBuilder ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                ICP saved. Your dashboard is ready.
              </p>
              <p className="mt-0.5 text-sm text-slate-400">
                Use your ICP to define your first target customer tasks and track your traction from here.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissIcpBanner}
            className="shrink-0 text-slate-500 hover:text-slate-200"
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      ) : null}
      <FirstRunCard />
      <JourneyNextStepCard />
      <StartupHomeCommandCenter />
      <StarterDashboardNudge />
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </>
  );
};

export default Dashboard;
