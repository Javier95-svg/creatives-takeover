// Type definitions for Insighta section (VC Search, Email Templates, Accelerator Hunt)

export interface VCFilters {
  investment_stage?: string;
  industry?: string;
  check_size_min?: number;
  check_size_max?: number;
  geographic_focus?: string;
  search?: string;
}

export interface AcceleratorFilters {
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
