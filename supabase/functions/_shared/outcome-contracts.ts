export type JourneyTool =
  | 'icp_builder'
  | 'demo_studio'
  | 'pmf_lab'
  | 'mvp_builder'
  | 'gtm_strategist'
  | 'traction_engine';

export type JourneyOutcomeStatus = 'draft' | 'ready' | 'verified' | 'reviewed';
export type VerificationMode = 'unverified' | 'founder_reported' | 'corroborated' | 'platform_verified';

export interface OutcomeCheck {
  id: string;
  passed: boolean;
  blocking: boolean;
  message: string;
}

export interface OutcomeEvaluation {
  evaluatorVersion: '2';
  completionScore: number;
  checks: OutcomeCheck[];
  warnings: string[];
  status: Exclude<JourneyOutcomeStatus, 'reviewed'>;
  verificationMode: VerificationMode;
  nextAction: string | null;
}

export interface OutcomeContractInput {
  tool: JourneyTool;
  qualityChecks: Record<string, boolean | number | string | null | undefined>;
  verificationMode?: VerificationMode;
}

interface ContractDefinition {
  required: Array<[id: string, message: string]>;
  verified: Array<[id: string, message: string]>;
}

const CONTRACTS: Record<JourneyTool, ContractDefinition> = {
  icp_builder: {
    required: [
      ['primary_segment', 'Choose one primary customer segment.'],
      ['non_fit_segment', 'Name one segment you will not serve first.'],
      ['three_ranked_pains', 'Rank at least three customer pains.'],
      ['buying_trigger', 'Define the event that makes the customer act.'],
      ['current_alternative', 'Document the customer\'s current alternative.'],
      ['reachable_channels', 'Name at least one reachable customer channel.'],
      ['authentic_citation', 'Add at least one valid, non-placeholder market citation.'],
      ['confidence_level', 'Assign an evidence confidence level.'],
      ['assumptions_registered', 'Record the assumptions that still require validation.'],
      ['five_interview_plan', 'Create the five-interview validation plan.'],
    ],
    verified: [
      ['five_interview_signals', 'Complete five independent customer interviews.'],
      ['assumptions_resolved', 'Mark the tested assumptions confirmed or rejected.'],
    ],
  },
  demo_studio: {
    required: [
      ['interactive_steps', 'Add at least two complete interactive steps.'],
      ['working_hotspots', 'Resolve every missing or invalid hotspot action.'],
      ['captions_complete', 'Add a clear caption to every step.'],
      ['single_cta', 'Configure one working call to action.'],
      ['lead_capture', 'Enable and validate lead capture.'],
      ['analytics', 'Enable demo view, completion, and CTA analytics.'],
      ['mobile_ready', 'Pass the mobile layout check.'],
      ['published', 'Publish the proof page to a public URL.'],
      ['no_unresolved_placeholders', 'Replace all unresolved placeholder frames.'],
      ['no_broken_interactions', 'Repair every broken interaction.'],
    ],
    verified: [['external_activity', 'Collect a non-owner completion, CTA action, or lead.']],
  },
  pmf_lab: {
    required: [
      ['report_generated', 'Generate the source-weighted PMF report.'],
      ['decision_present', 'Produce a Build, Narrow, Pivot, or Stop decision.'],
      ['weighted_sources_present', 'Attach the evidence used by the decision.'],
      ['directional_signals', 'Collect at least five independent weighted signals.'],
      ['duplicates_removed', 'Resolve duplicate or dependent evidence.'],
    ],
    verified: [['decision_grade', 'Collect twenty-five independent weighted signals.']],
  },
  mvp_builder: {
    required: [
      ['evidence_manifest_approved', 'Approve the evidence manifest before claiming an evidence-backed MVP.'],
      ['one_customer', 'Select one primary customer.'],
      ['one_core_job', 'Define one core customer job.'],
      ['success_event', 'Define and instrument one success event.'],
      ['feature_budget', 'Limit the essential build scope to three features.'],
      ['project_generated', 'Generate the project files.'],
      ['preview_ready', 'Open a working primary preview.'],
      ['primary_flow_present', 'Add one executable primary customer flow.'],
      ['primary_flow_smoke_test', 'Pass the executable primary-flow smoke test.'],
      ['responsive_ui', 'Pass the responsive layout check.'],
      ['no_runtime_errors', 'Resolve all preview and runtime errors.'],
      ['rollback_support', 'Save a rollback version.'],
      ['analytics_injected_on_publish', 'Instrument the primary success event.'],
      ['published', 'Publish the working MVP.'],
    ],
    verified: [['external_success_event', 'Record a non-owner primary success event.']],
  },
  gtm_strategist: {
    required: [
      ['primary_channel', 'Choose one primary acquisition channel.'],
      ['fallback_channel', 'Choose one fallback acquisition channel.'],
      ['claim_level_evidence', 'Cite evidence for every non-assumption messaging claim.'],
      ['usable_campaign_assets', 'Create a usable asset for the primary play.'],
      ['six_week_targets', 'Define six weeks of targets and actions.'],
      ['budget_and_time_constraints', 'Set the weekly time and budget constraints.'],
      ['structured_kill_rule', 'Define a measurable kill rule with threshold, window, and sample size.'],
    ],
    verified: [['traction_sprint_created', 'Activate and link the primary Traction sprint.']],
  },
  traction_engine: {
    required: [
      ['six_consecutive_weeks', 'Complete six consecutive weekly logs.'],
      ['three_distinct_decision_weeks', 'Make measured decisions in at least three different weeks.'],
      ['source_badges', 'Label the provenance of every weekly result.'],
      ['acquisition_efficiency', 'Calculate acquisition efficiency for each measured play.'],
      ['retention', 'Record seven-day and thirty-day retention.'],
      ['revenue_where_available', 'Include revenue where it is available.'],
      ['decision_recommendations', 'Record the recommended decision and any override rationale.'],
      ['exportable_report', 'Generate the complete six-week traction report.'],
    ],
    verified: [['three_verified_weeks', 'Use corroborated or platform-verified evidence in at least three weeks.']],
  },
};

const passed = (value: unknown) => value === true || (typeof value === 'number' && value > 0);

export function evaluateOutcomeContract(input: OutcomeContractInput): OutcomeEvaluation {
  const definition = CONTRACTS[input.tool];
  const required = definition.required.map(([id, message]) => ({
    id,
    message,
    blocking: true,
    passed: passed(input.qualityChecks[id]),
  }));
  const verification = definition.verified.map(([id, message]) => ({
    id,
    message,
    blocking: false,
    passed: passed(input.qualityChecks[id]),
  }));
  const checks = [...required, ...verification];
  const requiredPassed = required.every((check) => check.passed);
  const verifiedPassed = requiredPassed && verification.every((check) => check.passed);
  const completionScore = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
  const firstBlockingFailure = required.find((check) => !check.passed);
  const firstVerificationFailure = verification.find((check) => !check.passed);
  const status = verifiedPassed ? 'verified' : requiredPassed ? 'ready' : 'draft';

  return {
    evaluatorVersion: '2',
    completionScore,
    checks,
    warnings: verification.filter((check) => !check.passed).map((check) => check.message),
    status,
    verificationMode: verifiedPassed ? (input.verificationMode ?? 'corroborated') : input.verificationMode ?? 'unverified',
    nextAction: firstBlockingFailure?.message ?? firstVerificationFailure?.message ?? null,
  };
}

export function evaluationToQualityChecks(evaluation: OutcomeEvaluation) {
  return Object.fromEntries(evaluation.checks.map((check) => [check.id, check.passed]));
}
