// Angel Investor Type Definitions

export interface AngelInvestor {
  id: string;
  name: string;
  picture?: string; // Profile picture URL
  firm_name: string; // Venture Capital Firm name
  investment_stages: string[]; // e.g. ["Pre-Seed", "Seed", "Series A"]
  sectors?: string[]; // e.g. ["AI", "Healthcare"]
  email?: string; // Contact email
  website_url?: string; // Firm or personal website
  linkedin_url?: string; // LinkedIn profile URL
  twitter_x_url?: string; // X (Twitter) profile URL
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAngelInput {
  name: string;
  picture?: string | null;
  firm_name: string;
  investment_stages: string[];
  sectors?: string[] | null;
  email?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  twitter_x_url?: string | null;
  is_active?: boolean;
}
