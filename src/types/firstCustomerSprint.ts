import type { CustomerContactStage, FounderBusinessModel } from '@/lib/founderCycle';

export const FIRST_CUSTOMER_MESSAGE_KEYS = ['discovery', 'problem', 'offer'] as const;
export type FirstCustomerMessageVariantKey = (typeof FIRST_CUSTOMER_MESSAGE_KEYS)[number];

export type FirstCustomerSprintStatus = 'draft' | 'active' | 'paused' | 'completed';
export type FirstCustomerCheckpointStatus = 'not_requested' | 'requested' | 'scheduled' | 'completed' | 'cancelled';
export type FirstCustomerSprintApplicationStatus = 'submitted' | 'invited' | 'declined';
export type FirstCustomerAcquisitionSource = 'mentor_referral' | 'homepage' | 'current_user' | 'direct' | 'other';
export type FirstCustomerRecentOutreach = 'last_30_days' | 'older' | 'never';
export type FirstCustomerApplicationBlocker = 'prospect_list' | 'messaging' | 'confidence' | 'accountability' | 'replies' | 'conversion' | 'time';
export type FirstCustomerProductStage = 'idea' | 'concept_demo' | 'working_product';
export type FirstCustomerTargetOutcome = 'qualified_conversations' | 'commitment' | 'payment';
export type FirstCustomerPrimaryValue = 'structure' | 'messaging' | 'evidence' | 'mentor' | 'accountability';
export type FirstCustomerPrimaryFriction = 'prospect_list' | 'messaging' | 'sending' | 'replies' | 'conversion' | 'time' | 'not_urgent' | 'none';
export type FirstCustomerDecision =
  | 'continue'
  | 'narrow_segment'
  | 'change_offer'
  | 'change_message'
  | 'change_channel'
  | 'pivot'
  | 'pause';

export interface FirstCustomerMessageVariant {
  key: FirstCustomerMessageVariantKey;
  label: string;
  body: string;
}

export interface FirstCustomerSprint {
  id: string;
  founder_id: string;
  status: FirstCustomerSprintStatus;
  starts_at: string;
  ends_at: string;
  business_model_snapshot: FounderBusinessModel | null;
  customer_count_snapshot: number;
  primary_goal_snapshot: string | null;
  offer: string | null;
  target_segment: string | null;
  problem_hypothesis: string | null;
  proof_url: string | null;
  proof_description: string | null;
  estimated_customer_value_usd: number | null;
  weekly_capacity_hours: number | null;
  mentor_decision_question: string | null;
  message_variants: FirstCustomerMessageVariant[];
  selected_message_variant: FirstCustomerMessageVariantKey | null;
  message_generation_count: number;
  mentor_id: string | null;
  discovery_call_id: string | null;
  checkpoint_status: FirstCustomerCheckpointStatus;
  checkpoint_requested_at: string | null;
  checkpoint_scheduled_for: string | null;
  checkpoint_verified_by: string | null;
  checkpoint_verified_at: string | null;
  checkpoint_redacted_brief: FirstCustomerMentorBrief | null;
  mentor_brief_version: number;
  mentor_brief_snapshot: FirstCustomerMentorBrief | null;
  mentor_checkpoint_completed_at: string | null;
  mentor_recommendation_summary: string | null;
  final_decision: FirstCustomerDecision | null;
  final_notes: string | null;
  founder_value_score: number | null;
  primary_value: FirstCustomerPrimaryValue | null;
  primary_friction: FirstCustomerPrimaryFriction | null;
  would_recommend: boolean | null;
  review_note: string | null;
  review_submitted_at: string | null;
  continuation_from_sprint_id: string | null;
  source_demo_project_id?: string | null;
  target_outcome?: FirstCustomerTargetOutcome;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FirstCustomerSprintApplication {
  id: string;
  founder_id: string;
  status: FirstCustomerSprintApplicationStatus;
  business_model: 'b2b_saas' | 'service' | 'other';
  founder_owns_sales: boolean;
  has_sellable_product: boolean;
  customer_count: number;
  estimated_annual_customer_value_usd: number | null;
  weekly_capacity_hours: number;
  can_name_ten_prospects: boolean;
  recent_outreach: FirstCustomerRecentOutreach;
  primary_blocker: FirstCustomerApplicationBlocker;
  product_url: string | null;
  product_summary: string;
  acquisition_source: FirstCustomerAcquisitionSource;
  referring_mentor_id: string | null;
  qualified: boolean;
  qualification_reasons: string[];
  admin_override_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  invited_at: string | null;
  product_stage: FirstCustomerProductStage;
  target_outcome: FirstCustomerTargetOutcome;
}

export interface FirstCustomerSprintApplicationInput {
  founderOwnsSales: boolean;
  customerCount: number;
  estimatedAnnualCustomerValueUsd?: number | null;
  weeklyCapacityHours: number;
  primaryBlocker: FirstCustomerApplicationBlocker;
  productStage: FirstCustomerProductStage;
  targetOutcome: FirstCustomerTargetOutcome;
  productUrl?: string;
  productSummary: string;
  acquisitionSource: FirstCustomerAcquisitionSource;
  referringMentorId?: string | null;
  referralCode?: string | null;
}

export interface FirstCustomerSprintReviewInput {
  valueScore: number;
  primaryValue: FirstCustomerPrimaryValue;
  primaryFriction: FirstCustomerPrimaryFriction;
  wouldRecommend: boolean;
  reviewNote?: string;
}

export interface FirstCustomerContinuation {
  paid: boolean;
  purchasedAt?: string;
  packId?: string;
}

export interface FirstCustomerDemoEvidence {
  projectId: string;
  completions: number;
  ctaClicks: number;
  leads: number;
  signups: number;
  verificationMode: 'platform_verified';
}

export interface FirstCustomerSprintContact {
  id: string;
  display_name: string;
  company: string | null;
  role: string | null;
  profile_url?: string | null;
  source: string;
  stage: CustomerContactStage;
  notes?: string;
  last_activity_at: string;
  message_variant_key?: FirstCustomerMessageVariantKey | null;
}

export interface FirstCustomerEvidenceCounts {
  attachedProspects: number;
  contactedProspects: number;
  replies: number;
  conversations: number;
  commitments: number;
  payments: number;
}

export interface FirstCustomerMentorBrief {
  version: 1;
  createdAt: string;
  sprintId: string;
  intake: {
    offer: string;
    targetSegment: string;
    problemHypothesis: string;
    proof: string;
    estimatedCustomerValueUsd: number;
    weeklyCapacityHours: number;
  };
  evidence: FirstCustomerEvidenceCounts;
  contacts: Array<{ displayName: string; company: string | null; role: string | null; stage: CustomerContactStage }>;
  messageVariants: FirstCustomerMessageVariant[];
  decisionQuestion: string;
}

export interface FirstCustomerSprintSnapshot {
  version: 1;
  enrolled: boolean;
  cycleDefaults?: {
    businessModel?: FounderBusinessModel | null;
    customerCount?: number;
    weeklyCapacityHours?: number | null;
    primaryGoal?: string | null;
  };
  generatedAt?: string;
  sprint: FirstCustomerSprint | null;
  contacts: FirstCustomerSprintContact[];
  availableContacts: FirstCustomerSprintContact[];
  evidence?: FirstCustomerEvidenceCounts;
  targets?: { prospects: number; outreach: number; conversations: number; mentorCheckpoints: number };
  linkedCall?: { id: string; status: string } | null;
  derivedStep?: 'intake' | 'target_list' | 'message_preparation' | 'mentor_checkpoint' | 'execution' | 'review' | 'complete' | 'completed' | 'awaiting_final_review';
  awaitingFinalReview?: boolean;
  canComplete?: boolean;
  continuation?: FirstCustomerContinuation;
}

export interface FirstCustomerSprintAdminApplication {
  id: string;
  founderId: string;
  email: string;
  status: FirstCustomerSprintApplicationStatus;
  qualified: boolean;
  qualificationReasons: string[];
  source: FirstCustomerAcquisitionSource;
  referringMentorId: string | null;
  productSummary: string;
  productUrl: string | null;
  customerCount: number;
  annualCustomerValueUsd: number;
  weeklyCapacityHours: number;
  recentOutreach: FirstCustomerRecentOutreach;
  primaryBlocker: FirstCustomerApplicationBlocker;
  submittedAt: string;
  sprintId: string | null;
  sprintStatus: FirstCustomerSprintStatus | null;
  attached: number;
  sent: number;
  conversations: number;
  mentorCheckpointCompleted: boolean;
  checkpointStatus?: FirstCustomerCheckpointStatus;
  checkpointScheduledFor?: string | null;
  completedAt: string | null;
  finalDecision: FirstCustomerDecision | null;
  valueScore: number | null;
  primaryValue: FirstCustomerPrimaryValue | null;
  primaryFriction: FirstCustomerPrimaryFriction | null;
  wouldRecommend: boolean | null;
  paidContinuation: boolean;
  verifiedReferrals: number;
  productStage?: FirstCustomerProductStage;
  targetOutcome?: FirstCustomerTargetOutcome;
}

export interface FirstCustomerSprintAdminSnapshot {
  version: 1;
  generatedAt: string;
  summary: Record<string, number>;
  applications: FirstCustomerSprintAdminApplication[];
}
