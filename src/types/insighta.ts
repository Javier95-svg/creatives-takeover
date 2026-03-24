// Type definitions for Insighta section (VC Search, Email Templates, Accelerator Hunt)

export interface VCFilters {
  investment_stages?: string[];
  industries?: string[];
  geographies?: string[];
  ticket_sizes?: string[];
  investment_stage?: string;
  industry?: string;
  check_size_min?: number;
  check_size_max?: number;
  geographic_focus?: string;
  search?: string;
}

export interface AcceleratorFilters {
  focus_stage?: string[];
  sectors?: string[];
  geographies?: string[];
  equity?: string[];
  formats?: string[];
  location?: string;
  industry_focus?: string;
  search?: string;
}

export type EmailCategory =
  | 'cold-outreach'
  | 'warm-introduction'
  | 'follow-up'
  | 'thank-you'
  | 'update';

export interface EmailTemplate {
  id: string;
  title: string;
  category: EmailCategory;
  subject: string;
  body: string;
  useCase: string;
  variables: string[]; // e.g., ['{{founder_name}}', '{{vc_name}}']
  previewSnippet: string;
  tags: string[];
  popularity: number; // 0-100
}

// Pitch Deck Types
export type FundingRound = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c+';

export interface PitchDeck {
  id: string;
  startup_name: string;
  company_description: string;
  founded_year?: number;
  funding_round: FundingRound;
  amount_raised_usd: number;
  amount_display: string;
  fundraising_date?: string;
  industries: string[];
  primary_industry?: string;
  pdf_url: string;
  thumbnail_url?: string;
  is_featured: boolean;
  is_active: boolean;
  view_count: number;
  popularity_score: number;
  key_takeaways?: string[];
  created_at: string;
  updated_at: string;
}

export interface PitchDeckFilters {
  sort_by_popular?: boolean;
  amount_min?: number;
  amount_max?: number;
  funding_round?: FundingRound;
  industry?: string;
  search?: string;
}

export const AMOUNT_RANGES = {
  '20m+': { min: 20_000_000_00, max: undefined, label: '$20M+' },
  '10m-20m': { min: 10_000_000_00, max: 20_000_000_00, label: '$10M–$20M' },
  '5m-10m': { min: 5_000_000_00, max: 10_000_000_00, label: '$5M–$10M' },
  '1m-5m': { min: 1_000_000_00, max: 5_000_000_00, label: '$1M–$5M' },
  '0-200k': { min: 0, max: 200_000_00, label: '$0–$200K' },
} as const;
