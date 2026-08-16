export const EXTERNAL_EVIDENCE_EVENT_TYPES = ['page_view','demo_completed','cta_clicked','lead_created','signup','activated','qualified_conversation','commitment_received','payment_received','subscription_cancelled'] as const;
export type ExternalEvidenceEventType = typeof EXTERNAL_EVIDENCE_EVENT_TYPES[number];

export interface ExternalEvidenceConnection {
  id: string;
  provider_label: string;
  method: 'webhook' | 'csv';
  token_last_four: string | null;
  status: 'active' | 'revoked' | 'error';
  last_success_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface ExternalEvidenceBatch {
  id: string;
  connection_id: string;
  method: 'webhook' | 'csv';
  status: 'processing' | 'completed' | 'partial' | 'failed';
  accepted_count: number;
  duplicate_count: number;
  rejected_count: number;
  created_at: string;
}
