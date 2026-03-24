// Simple, user-friendly types
export type FundingType = 'grant' | 'accelerator' | 'contest' | 'microfund';
export type AcceleratorProgramFormat = 'Remote' | 'In-person' | 'Hybrid' | string;

export interface FundingOpportunity {
  id: string;
  title: string;
  description: string;
  url: string;
  slug: string | null;
  type: FundingType;
  funding_amount: string | null;
  location: string[];
  keywords: string[];
  logo_url: string | null;
  website_url: string | null;
  application_url: string | null;
  program_duration?: string | null;
  program_format?: AcceleratorProgramFormat | null;
  focus_stage?: string[] | null;
  focus_sectors?: string[] | null;
  equity_taken?: string | null;
  funding_offered?: string | null;
  cohort_geography?: string[] | null;
  application_deadline_info?: string | null;
  notable_alumni?: string[] | null;
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

