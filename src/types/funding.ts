// Simple, user-friendly types
export type FundingType = 'grant' | 'accelerator' | 'contest' | 'microfund';

export interface FundingKeyDates {
  application_open?: string;
  application_close?: string;
  decision_date?: string;
}

export interface FundingApplicationStep {
  id: string;
  title: string;
  description: string;
  example?: string;
  resourceLabel?: string;
  resourceUrl?: string;
}

export interface FundingTips {
  mistakes: string[];
  winning: string[];
}

export interface FundingCommunityQuestion {
  question: string;
  answers?: string[];
}

export interface FundingOpportunity {
  id: string;
  title: string;
  description: string;
  url: string;
  type: FundingType;
  funding_amount: string | null;
  location: string[];
  keywords: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  eligibility: string[];
  funding_types: string[];
  key_dates: FundingKeyDates;
  application_steps: FundingApplicationStep[];
  tips: FundingTips;
  community_questions?: FundingCommunityQuestion[];
}

// Simple filters
export interface FundingFilters {
  type?: FundingType;
  location?: string;
  search?: string;
  featured?: boolean;
}

