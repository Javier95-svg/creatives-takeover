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
  evaluatorVersion: '3';
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
      ['urgent_pain', 'Choose the one urgent pain you will test first.'],
      ['buying_trigger', 'Define the event that makes the customer act.'],
      ['current_alternative', 'Document the customer\'s current alternative.'],
      ['reachable_channels', 'Name at least one reachable customer channel.'],
      ['three_reachable_accounts', 'Name three reachable example accounts.'],
      ['assumptions_registered', 'Record the assumptions that still require validation.'],
    ],
    verified: [
      ['external_target_signal', 'Corroborate the target with an independent buyer signal.'],
    ],
  },
  demo_studio: {
    required: [
      ['buyer_promise', 'State one buyer-testable promise.'],
      ['interactive_proof', 'Add one working interaction a buyer can experience.'],
      ['single_cta', 'Configure one working call to action.'],
      ['analytics', 'Enable view and CTA measurement.'],
      ['published', 'Publish the proof page to a public URL.'],
      ['no_broken_interactions', 'Repair every broken interaction.'],
    ],
    verified: [['external_activity', 'Collect a non-owner completion, CTA action, or lead.']],
  },
  pmf_lab: {
    required: [
      ['report_generated', 'Generate the source-weighted PMF report.'],
      ['decision_present', 'Produce a Build, Narrow, Pivot, or Stop decision.'],
      ['weighted_sources_present', 'Attach the evidence used by the decision.'],
      ['three_independent_signals', 'Collect at least three independent qualified buyer signals.'],
      ['documented_objection', 'Record one buyer objection or unmet need.'],
      ['duplicates_removed', 'Resolve duplicate or dependent evidence.'],
    ],
    verified: [['reviewed_buyer_signal', 'Verify at least one of the buyer signals.']],
  },
  mvp_builder: {
    required: [
      ['one_customer', 'Select one primary customer.'],
      ['one_core_job', 'Define one core customer job.'],
      ['success_event', 'Define and instrument one success event.'],
      ['feature_budget', 'Limit the essential build scope to three features.'],
      ['primary_flow_present', 'Add one executable primary customer flow.'],
      ['primary_flow_smoke_test', 'Pass the executable primary-flow smoke test.'],
      ['no_runtime_errors', 'Resolve all preview and runtime errors.'],
      ['analytics_injected_on_publish', 'Instrument the primary success event.'],
      ['published', 'Publish the working MVP.'],
    ],
    verified: [['platform_observed_publish', 'Confirm the live workflow and success-event instrumentation.']],
  },
  gtm_strategist: {
    required: [
      ['primary_channel', 'Choose one primary acquisition channel.'],
      ['one_offer', 'Choose the one offer this cycle will test.'],
      ['one_message', 'Choose the founder-controlled message this cycle will use.'],
      ['ten_prospect_sample', 'Pre-register a sample of at least ten qualified prospects.'],
      ['budget_and_time_constraints', 'Set the weekly time and budget constraints.'],
      ['structured_kill_rule', 'Define a measurable kill rule with threshold, window, and sample size.'],
      ['acquisition_cycle_ready', 'Prepare the acquisition cycle for First Customer Sprint.'],
    ],
    verified: [['buyer_signal_recorded', 'Record a qualified buyer response, conversation, commitment, or payment.']],
  },
  traction_engine: {
    required: [
      ['first_cycle_decision', 'Complete and review the first acquisition cycle.'],
      ['two_comparable_cycles', 'Run the same ICP, offer, and channel in two separate cycles.'],
      ['buyer_signal_each_cycle', 'Record a qualified buyer signal in each cycle.'],
      ['source_badges', 'Label the provenance of every buyer signal.'],
    ],
    verified: [['one_verified_buyer_signal', 'Verify at least one buyer signal through the platform or a reviewer.']],
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
    evaluatorVersion: '3',
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
