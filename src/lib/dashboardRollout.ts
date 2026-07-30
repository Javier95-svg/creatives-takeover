export function isDashboardAiRankingEnabled(posthogFlag?: boolean) {
  const killSwitch = import.meta.env.VITE_DASHBOARD_AI_RANKING_ENABLED;
  if (killSwitch !== 'true') return false;
  return typeof posthogFlag === 'boolean' ? posthogFlag : true;
}
