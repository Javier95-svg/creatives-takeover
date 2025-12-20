// Fixed schema interfaces for BizMap AI structured components
// No free-text paragraphs allowed - only structured fields

export type ComponentType = 
  | 'problem' 
  | 'target_user' 
  | 'value_prop' 
  | 'revenue' 
  | 'distribution' 
  | 'costs' 
  | 'risks' 
  | 'assumptions';

export type SessionStatus = 'draft' | 'completing' | 'complete' | 'invalid';

export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'warning';

export type SeverityLevel = 'high' | 'medium' | 'low';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'occasional';

export type RevenueModelType = 'subscription' | 'one-time' | 'marketplace' | 'ads' | 'freemium' | 'tiered' | 'usage-based';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

// Component 1: Problem
export interface ProblemComponent {
  problem_statement: string; // Max 200 chars, required
  severity: SeverityLevel; // Required
  frequency: Frequency; // Required
  affected_users: string; // Description of who is affected, max 150 chars
  current_solutions: string[]; // Array of existing solutions, max 10 items
  pain_intensity: number; // 1-10 scale, required
  validation_errors?: string[];
}

// Component 2: Target User
export interface TargetUserComponent {
  demographics: {
    age_range: string; // e.g., "25-45", "18-24", required
    location: string; // e.g., "Urban US", "Global", required
    income_bracket?: string; // e.g., "$50k-$100k", optional
    job_title?: string; // Optional
    company_size?: string; // For B2B, optional
  };
  psychographics: {
    values: string[]; // Array of values, max 5 items
    motivations: string[]; // Array of motivations, max 5 items
    pain_points: string[]; // Array of pain points, max 5 items
  };
  digital_behavior: {
    primary_platforms: string[]; // Where they spend time online, max 5 items
    tech_comfort_level: 'high' | 'medium' | 'low'; // Required
    preferred_communication: string[]; // e.g., ["email", "slack"], max 3 items
  };
  user_segment_name: string; // Descriptive name, max 100 chars, required
  validation_errors?: string[];
}

// Component 3: Value Proposition
export interface ValuePropComponent {
  unique_value: string; // Core unique value, max 200 chars, required
  key_benefits: string[]; // Array of benefits, max 5 items, required
  differentiation: string; // How it's different, max 200 chars, required
  target_outcome: string; // What outcome users achieve, max 150 chars, required
  proof_points?: string[]; // Optional evidence/social proof, max 5 items
  validation_errors?: string[];
}

// Component 4: Revenue
export interface RevenueComponent {
  model_type: RevenueModelType; // Required
  price_point: number; // Numeric > 0, required
  currency: string; // e.g., "USD", required
  pricing_structure?: {
    tiers?: Array<{
      name: string;
      price: number;
      features: string[];
    }>; // Optional tiered pricing
    unit?: string; // e.g., "per user", "per month", optional
  };
  revenue_projections?: {
    month_3?: number; // Optional 3-month projection
    month_6?: number; // Optional 6-month projection
    month_12?: number; // Optional 12-month projection
  };
  payment_frequency: 'one-time' | 'monthly' | 'annual' | 'usage-based'; // Required
  validation_errors?: string[];
}

// Component 5: Distribution
export interface DistributionComponent {
  channels: string[]; // Array of channel types, required, min 1
  primary_channel: string; // Must be one of channels, required
  channel_strategy: {
    [channel: string]: {
      rationale: string; // Why this channel, max 150 chars
      target_users: string; // Which users reached, max 100 chars
    };
  };
  acquisition_cost_estimate?: number; // Optional CAC estimate
  validation_errors?: string[];
}

// Component 6: Costs
export interface CostsComponent {
  fixed_costs: {
    [category: string]: number; // e.g., "infrastructure": 100, "team": 5000
  };
  variable_costs: {
    [category: string]: number; // e.g., "per_customer": 10
  };
  initial_investment?: number; // Optional startup costs
  monthly_recurring?: number; // Optional MRR equivalent for costs
  cost_breakdown: string; // High-level description, max 200 chars, required
  validation_errors?: string[];
}

// Component 7: Risks
export interface RisksComponent {
  risks: Array<{
    risk_type: 'market' | 'execution' | 'financial' | 'competitive' | 'regulatory' | 'timing' | 'team'; // Required
    description: string; // Max 150 chars, required
    severity: RiskSeverity; // Required
    probability: 'high' | 'medium' | 'low'; // Required
    mitigation?: string; // Optional mitigation strategy, max 200 chars
  }>; // Array of risks, max 10 items, required
  overall_risk_level: RiskSeverity; // Required
  validation_errors?: string[];
}

// Component 8: Assumptions
export interface AssumptionsComponent {
  assumptions: Array<{
    assumption_type: 'market' | 'product' | 'customer' | 'financial' | 'timing' | 'competition'; // Required
    statement: string; // The assumption, max 200 chars, required
    validation_method: string; // How to test, max 150 chars, required
    confidence: 'high' | 'medium' | 'low'; // Required
    critical: boolean; // Is this critical to success, required
  }>; // Array of assumptions, required, min 3, max 15
  validation_errors?: string[];
}

// Union type for all components
export type BizMapComponent = 
  | ProblemComponent 
  | TargetUserComponent 
  | ValuePropComponent 
  | RevenueComponent 
  | DistributionComponent 
  | CostsComponent 
  | RisksComponent 
  | AssumptionsComponent;

// Session data structure
export interface BizMapSession {
  id: string;
  user_id: string | null;
  status: SessionStatus;
  completion_percentage: number; // 0-100
  current_component: ComponentType | null;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Component storage in database
export interface BizMapComponentRecord {
  id: string;
  session_id: string;
  component_type: ComponentType;
  component_data: BizMapComponent;
  validation_status: ValidationStatus;
  validation_errors: string[];
  external_data_refs: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Validation error
export interface ValidationError {
  component: ComponentType;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// API Response format
export interface BizMapStructuredResponse {
  status: 'collecting' | 'validating' | 'complete' | 'error';
  currentComponent: ComponentType | null;
  question: string;
  response_message: string; // User-friendly explanation of what happened
  collectedComponents: Partial<Record<ComponentType, BizMapComponent>>;
  validationErrors: ValidationError[];
  completionPercentage: number;
  sessionId?: string;
}

// Request format for submitting answers
export interface SubmitAnswerRequest {
  session_id?: string;
  component_type: ComponentType;
  answer: string; // User's free-form answer
  context?: Partial<Record<ComponentType, BizMapComponent>>; // Existing components for context
}

