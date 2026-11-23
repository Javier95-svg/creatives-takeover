/**
 * One line for a GTM channel card: what Traction Engine measured for it in
 * this project. Import-free so node tests can load it.
 */
export interface MeasuredChannelSummaryInput {
  weeksLogged: number;
  passes: number;
  lastDecision: 'double_down' | 'iterate' | 'kill' | null;
}

const DECISION_TEXT: Record<NonNullable<MeasuredChannelSummaryInput['lastDecision']>, string> = {
  double_down: 'do more of it',
  iterate: 'change one thing and retest',
  kill: 'stop it',
};

/** "3 weeks logged in Traction Engine · target met in 1 · last call: stop it". */
export function measuredSummary(measured: MeasuredChannelSummaryInput): string {
  const parts = [
    `${measured.weeksLogged} week${measured.weeksLogged === 1 ? '' : 's'} logged in Traction Engine`,
    `target met in ${measured.passes}`,
  ];
  if (measured.lastDecision) parts.push(`last call: ${DECISION_TEXT[measured.lastDecision]}`);
  return parts.join(' · ');
}
