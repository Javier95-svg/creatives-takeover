// ================================================
// INVESTOR MATCHING ENGINE - OUTREACH MATERIAL TYPES
// Type-safe interfaces for outreach materials
// ================================================

export type MaterialType = 'pitch_deck' | 'cold_email' | 'one_pager' | 'follow_up';

export interface OutreachMaterial {
  id: string;
  user_id: string;
  investor_id?: string;
  match_id?: string;
  material_type: MaterialType;
  subject?: string; // For emails
  content: string; // Main content
  content_json?: Record<string, unknown>; // Structured content for decks
  version: number;
  is_template: boolean;
  is_final: boolean;
  times_exported: number;
  last_exported_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PitchDeckSlide {
  slide_number: number;
  title: string;
  content: string;
  notes?: string;
}

export interface PitchDeck {
  title: string;
  slides: PitchDeckSlide[];
  design_theme?: string;
}

export interface ColdEmail {
  subject: string;
  body: string;
  subject_variations?: string[]; // Multiple subject line options
  to?: string;
  personalized_tokens?: Record<string, string>;
}

export interface OnePagerSection {
  heading: string;
  content: string;
}

export interface OnePager {
  title: string;
  sections: OnePagerSection[];
}

export interface OutreachGenerationRequest {
  material_type: MaterialType;
  investor_id?: string;
  assessment_id?: string;
  
  // Business data
  industry: string;
  funding_amount: number;
  business_stage: string;
  business_summary?: string;
  
  // Readiness data (if not from assessment)
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  strengths?: string[];
  critical_gaps?: string[];
  verdict?: string;
  
  // Investor-specific data (if not fetching)
  investor_name?: string;
  investor_focus?: string[];
  portfolio_companies?: string[];
}

export interface OutreachGenerationResponse {
  material: {
    type: MaterialType;
    content: string;
    content_json?: Record<string, unknown>;
    subject?: string;
  };
  credits_used: number;
  saved: boolean;
}

