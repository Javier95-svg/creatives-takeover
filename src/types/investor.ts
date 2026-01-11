// ================================================
// INVESTOR MATCHING ENGINE - TYPESCRIPT TYPES
// Type-safe interfaces for investor data and matches
// ================================================

export type InvestmentStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c+';

export interface PortfolioCompany {
  name: string;
  website?: string;
  industry?: string;
  stage?: string;
  description?: string;
}

export interface Investor {
  id: string;
  slug: string;
  name: string;
  firm_name: string;
  firm_website?: string;
  linkedin_url?: string;
  email?: string;

  // Visual Branding & Social Media
  logo_url?: string;
  header_image_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  crunchbase_url?: string;
  angellist_url?: string;
  youtube_url?: string;
  instagram_url?: string;
  medium_url?: string;

  // Investor Type
  investor_type: 'vc' | 'angel' | 'fund' | 'corporate_vc';

  // Investment Focus
  investment_thesis?: string;
  industries: string[];
  investment_stages: InvestmentStage[];
  typical_check_size_min?: number;
  typical_check_size_max?: number;
  
  // Geographic
  geographic_focus: string[];
  locations: string[];
  remote_friendly: boolean;
  
  // Portfolio
  portfolio_companies: PortfolioCompany[];
  recent_investments_count: number;
  last_investment_date?: string;
  total_portfolio_count: number;
  
  // Contact
  contact_preference?: 'email' | 'linkedin' | 'application' | 'warm-intro-only';
  application_url?: string;
  requires_warm_intro: boolean;
  response_rate_percentage?: number;
  typical_timeline_days?: number;
  
  // Metadata
  match_score_boost?: number;
  is_featured: boolean;
  is_active: boolean;
  data_source?: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface InvestorMatch {
  investor: Investor;
  match_score: number; // 0-100
  match_reasons: string[]; // Array of reasons why matched
  match_breakdown: {
    stage_alignment: number;
    industry_focus: number;
    geographic_preference: number;
    check_size_compatibility: number;
    portfolio_similarity: number;
  };
}

export interface MatchRequest {
  industry: string;
  funding_amount: number;
  locations?: string[];
  business_model?: string;
  business_stage?: InvestmentStage;
  business_summary?: string;
  
  // From readiness assessment
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  verdict?: 'Ready' | 'Not Ready' | 'Almost Ready';
  strengths?: string[];
  critical_gaps?: string[];
  assessment_id?: string;
}

export interface ReadinessScores {
  mvp: number;
  feedback: number;
  team: number;
  runway: number;
  average?: number;
  verdict?: 'Ready' | 'Not Ready' | 'Almost Ready';
  strengths?: string[];
  critical_gaps?: string[];
}

export interface MatchResults {
  matches: InvestorMatch[];
  top_matches: string[]; // IDs of top 3
  match_request: MatchRequest;
  generated_at: string;
  credits_used: number;
}

