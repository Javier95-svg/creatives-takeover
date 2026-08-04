import type { CustomerContactStage, FounderBusinessModel } from '@/lib/founderCycle';

export const FIRST_CUSTOMER_MESSAGE_KEYS = ['discovery', 'problem', 'offer'] as const;
export type FirstCustomerMessageVariantKey = (typeof FIRST_CUSTOMER_MESSAGE_KEYS)[number];

export type FirstCustomerSprintStatus = 'draft' | 'active' | 'paused' | 'completed';
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
  mentor_brief_version: number;
  mentor_brief_snapshot: FirstCustomerMentorBrief | null;
  mentor_checkpoint_completed_at: string | null;
  mentor_recommendation_summary: string | null;
  final_decision: FirstCustomerDecision | null;
  final_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
}
