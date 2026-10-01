export type PilotBudget = { baseMonthlyCents: number; reservedAppCents: number; nextAppCents: number; apps: number; observedAt: string };
export function admissionDecision(budget: PilotBudget, now=Date.now()) {
  const age=now-Date.parse(budget.observedAt);
  if(!Number.isFinite(age)||age< -60_000||age>86_400_000)return {allowed:false,alert:true,reason:'Infrastructure cost estimate needs an operator refresh.'};
  if([budget.baseMonthlyCents,budget.reservedAppCents,budget.nextAppCents,budget.apps].some(n=>!Number.isSafeInteger(n)||n<0))return {allowed:false,alert:true,reason:'Invalid infrastructure estimate.'};
  const projected=budget.baseMonthlyCents+budget.reservedAppCents+budget.nextAppCents;
  return {allowed:budget.apps<10&&projected<20_000,alert:projected>=17_500,projectedCents:projected,
    reason:budget.apps>=10?'The ten-app pilot is full.':projected>=20_000?'Infrastructure admission is paused at the pilot spending limit.':null};
}
