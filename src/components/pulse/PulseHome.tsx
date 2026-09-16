import { lazy, Suspense } from 'react';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';
import type { PulseHomeConcept } from '@/lib/pulseHome';
import { PulseHomeView } from './PulseHomeView';

const LiveHome = lazy(() => import('./PulseHomeLive'));
export default function PulseHome({ concept }: { concept: PulseHomeConcept }) {
  return hasApplicationConfig
    ? <Suspense fallback={<PulseHomeView concept={concept} loading />}><LiveHome concept={concept} /></Suspense>
    : <PulseHomeView concept={concept} unavailable="Design preview · Connect the application and sign in to use Pulse and see your priorities." />;
}
