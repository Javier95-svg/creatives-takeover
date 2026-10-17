import { useSearchParams } from 'react-router-dom';

import { captureEvent } from '@/lib/analytics';

const VIEW_PARAM = 'view';

/**
 * Cohort mode opens the dashboard on the cohort (or program) view; ?view=workspace
 * shows the usual dashboard. The choice lives in the URL so it survives reloads.
 */
export function useCohortView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const workspace = searchParams.get(VIEW_PARAM) === 'workspace';

  const setWorkspace = (next: boolean) => {
    if (next === workspace) return;
    const params = new URLSearchParams(searchParams);
    if (next) params.set(VIEW_PARAM, 'workspace');
    else params.delete(VIEW_PARAM);
    setSearchParams(params, { replace: true });
    captureEvent('cohort_mode_switched', { view: next ? 'workspace' : 'cohort' });
  };

  return { workspace, setWorkspace };
}
