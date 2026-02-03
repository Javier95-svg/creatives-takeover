// Simple, user-friendly types
export type FundingType = 'grant' | 'accelerator' | 'contest' | 'microfund';

export interface FundingOpportunity {
  id: string;
  title: string;
  description: string;
  url: string;
  type: FundingType;
  funding_amount: string | null;
  location: string[];
  keywords: string[];
  logo_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Simple filters
export interface FundingFilters {
  type?: FundingType;
  location?: string;
  search?: string;
  featured?: boolean;
}

