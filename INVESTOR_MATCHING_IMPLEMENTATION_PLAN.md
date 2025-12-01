# Investor Matching Engine + Outreach Playbook Generator
## Complete Architectural & Implementation Plan

---

## Executive Summary

**Tool Name:** Investor Matchmaker (Internal name: `InvestorMatchingToolkit`)
**Location:** Inside Insighta page (Blog.tsx), positioned BETWEEN Fundraising Readiness Toolkit and Funding Opportunities
**Purpose:** Bridge the gap between readiness assessment completion and actionable investor outreach
**Page Order:**
1. FundraisingReadinessToolkit
2. **InvestorMatchingToolkit** (NEW - this tool)
3. FundingOpportunitiesSection

**Two Integrated Features:**
1. **AI-Powered Investor Matching Engine** - Matches founders to relevant investors based on readiness assessment results
2. **Investor Outreach Playbook Generator** - Creates personalized pitch decks, emails, and one-pagers

---

## Complete Feature Set

### Feature 1: AI-Powered Investor Matching Engine

#### 1.1 Smart Matching Algorithm
- **Input Sources:**
  - Fundraising Readiness Assessment scores (MVP, Feedback, Team, Runway)
  - Readiness verdict (Ready/Almost Ready/Not Ready)
  - Critical gaps and strengths from assessment
  - Additional founder inputs: Industry, Funding Amount, Location, Business Model, Stage

- **Matching Criteria:**
  - **Stage Alignment** (40% weight): Pre-seed, Seed, Series A matching
  - **Industry Focus** (25% weight): Sector/vertical alignment with investor portfolio
  - **Geographic Preference** (15% weight): Local, regional, or remote-friendly investors
  - **Check Size Compatibility** (10% weight): Funding ask vs. typical investment size
  - **Portfolio Similarity** (10% weight): Similar companies in investor's portfolio

- **Output:**
  - Ranked list of 5-15 investors with match scores (0-100%)
  - Match breakdown showing why each investor is a good fit
  - Top 3 "Start Here" recommendations
  - Filtered by readiness verdict (Not Ready → early-stage investors, Ready → active investors)

#### 1.2 Investor Profile System
Each investor profile includes:
- Basic Info: Name, firm name, website, LinkedIn
- Investment Focus: Thesis, industries, stages, typical check sizes
- Geographic Focus: Locations, remote-friendly status
- Portfolio Companies: Recent investments, similar companies
- Contact Info: Email preferences, intro requirements, application process
- Activity Level: Recent investment count, response rate, typical timeline
- Warm Intro Paths: Portfolio companies, mutual connections (future feature)

#### 1.3 Personalized Action Plan
- Recommended outreach sequence (who to contact first)
- Customized pitch angle suggestions per investor
- Timeline estimates (days to first meeting)
- Success probability indicators

#### 1.4 Export & Tracking
- Export investor list to CSV/PDF
- Save matches for later (database persistence)
- Basic tracking of outreach status (future: full CRM)

---

### Feature 2: Investor Outreach Playbook Generator

#### 2.1 Pitch Deck Template Generator
- **Input:** Readiness assessment data, business details, investor focus areas
- **Output:** Customized PowerPoint/Google Slides template
- **Content:**
  - Slide deck structure (12-15 slides)
  - Pre-filled sections based on assessment strengths
  - Addressing gaps proactively
  - Investor-specific customization per match
  - Branded template design
  - Export options: PDF, PowerPoint, Google Slides link

#### 2.2 Cold Email Generator
- **Input:** Investor profile, founder business details, assessment strengths
- **Output:** Personalized email templates
- **Features:**
  - Subject line generator (multiple variations)
  - Email body templates (3-5 variations)
  - Personalization tokens (investor name, portfolio companies, etc.)
  - Length optimization (100-150 words ideal)
  - CTA optimization
  - A/B testing suggestions

#### 2.3 One-Pager Generator
- **Input:** Business summary, key metrics, assessment highlights
- **Output:** Single-page executive summary
- **Sections:**
  - Problem statement
  - Solution overview
  - Market opportunity
  - Traction/metrics
  - Team highlights
  - Funding ask and use of funds
  - Call to action
- **Design:** Professional, branded template
- **Export:** PDF (ready to attach)

#### 2.4 Follow-Up Sequence Templates
- Automated follow-up email templates
- Timing recommendations (7 days, 14 days, 30 days)
- Escalation strategies (if no response)
- Response templates for common investor questions
- Thank you templates after meetings

#### 2.5 Meeting Preparation Guide
- Pre-meeting checklist
- Anticipated questions based on readiness gaps
- Practice scenarios and talking points
- Deck walkthrough script
- Post-meeting follow-up templates

---

## User Flow (Complete Journey)

### Step 1: Complete Fundraising Readiness Assessment
**Current:** User fills out 4 criteria scores, gets AI analysis
**New Action:** After analysis appears, show prominent CTA button
- Button text: "Find My Investors" or "Get Investor Matches"
- Placement: Below analysis results card
- Action: Smooth scroll to Investor Matching section (positioned between Readiness Toolkit and Funding Opportunities)

### Step 2: Additional Context Collection
**Modal/Form opens** asking for:
1. **Industry** (dropdown): SaaS, E-commerce, AI/ML, Healthcare, Fintech, etc.
2. **Funding Amount** (input): Amount seeking (e.g., $500K, $1M)
3. **Location** (multi-select): Primary location(s)
4. **Business Model** (dropdown): B2B SaaS, B2C, Marketplace, etc.
5. **Stage** (dropdown): Pre-seed, Seed, Series A
6. **Business Summary** (textarea, optional): Brief description (2-3 sentences)

**Validation:** Funding amount and industry required, others optional

### Step 3: AI Matching Process
**Backend Processing:**
- Fetch readiness assessment results
- Apply matching algorithm to investor database
- Rank and score investors (0-100%)
- Generate personalized recommendations
- Return top 15 matches

**UI State:**
- Show loading spinner with message: "Finding your perfect investor matches..."
- Progress indicator (optional): "Analyzing 500+ investors..."

### Step 4: Display Matches
**Results Page/Section shows:**
- Summary: "We found X investors who match your profile"
- Top 3 "Start Here" investors (highest match scores)
- Full list of matches (scrollable)
- Each investor card shows:
  - Match score percentage (visual progress bar)
  - Investor name and firm
  - Match reasons (3-4 bullet points)
  - Investment focus summary
  - Typical check size
  - Geographic focus
  - Action buttons: "View Profile", "Generate Outreach", "Save"

### Step 5: Generate Outreach Materials
**User Action:** Clicks "Generate Outreach" on an investor

**Options presented:**
1. Generate All (Deck + Email + One-Pager)
2. Generate Pitch Deck
3. Generate Cold Email
4. Generate One-Pager

**For each selection:**
- Show loading state
- Generate content via AI
- Display in preview/editor
- Allow editing
- Export options (PDF, copy to clipboard, download)

### Step 6: Export & Next Steps
**Export options:**
- Export investor list (CSV)
- Export outreach materials (PDF, docx)
- Save matches for later (database)

**Next Steps:**
- Track outreach status (simple tracking)
- View saved matches
- Regenerate materials for different investors

---

## Data Structures

### Database Schema

#### 1. Investors Table
**File:** `supabase/migrations/XXXXXX_create_investors.sql`

```sql
CREATE TABLE IF NOT EXISTS public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name TEXT NOT NULL, -- Investor/Partner name
  firm_name TEXT NOT NULL, -- Firm name
  firm_website TEXT,
  linkedin_url TEXT,
  email TEXT, -- Preferred contact email
  
  -- Investment Focus
  investment_thesis TEXT, -- Full thesis description
  industries TEXT[] NOT NULL DEFAULT '{}', -- Array: ['SaaS', 'AI', 'Fintech']
  investment_stages TEXT[] NOT NULL DEFAULT '{}', -- Array: ['pre-seed', 'seed', 'series-a']
  typical_check_size_min INTEGER, -- Minimum check size in USD
  typical_check_size_max INTEGER, -- Maximum check size in USD
  
  -- Geographic Preferences
  geographic_focus TEXT[] NOT NULL DEFAULT '{}', -- Array: ['US', 'Global', 'Europe']
  locations TEXT[] NOT NULL DEFAULT '{}', -- Array: ['San Francisco', 'New York', 'Remote']
  remote_friendly BOOLEAN DEFAULT true,
  
  -- Portfolio & Activity
  portfolio_companies JSONB DEFAULT '[]'::jsonb, -- Array of {name, website, industry, stage}
  recent_investments_count INTEGER DEFAULT 0, -- Last 12 months
  last_investment_date DATE,
  total_portfolio_count INTEGER DEFAULT 0,
  
  -- Contact & Process
  contact_preference TEXT CHECK (contact_preference IN ('email', 'linkedin', 'application', 'warm-intro-only')),
  application_url TEXT, -- Link to application form if applicable
  requires_warm_intro BOOLEAN DEFAULT false,
  response_rate_percentage NUMERIC(5,2), -- Estimated response rate (0-100)
  typical_timeline_days INTEGER, -- Days to first response
  
  -- Metadata
  match_score_boost NUMERIC(5,2) DEFAULT 0, -- Manual boost for featured investors
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  data_source TEXT, -- Where data came from: 'manual', 'crunchbase', 'api'
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_check_size CHECK (typical_check_size_max >= typical_check_size_min OR typical_check_size_max IS NULL)
);

-- Indexes for fast matching
CREATE INDEX IF NOT EXISTS idx_investors_industries ON public.investors USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_investors_stages ON public.investors USING GIN(investment_stages);
CREATE INDEX IF NOT EXISTS idx_investors_geographic ON public.investors USING GIN(geographic_focus);
CREATE INDEX IF NOT EXISTS idx_investors_active ON public.investors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_investors_featured ON public.investors(is_featured) WHERE is_featured = true;

-- Enable RLS
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active investors (for matching)
CREATE POLICY "Anyone can view active investors"
  ON public.investors FOR SELECT
  USING (is_active = true);

-- Only admins can manage investors
CREATE POLICY "Admins can insert investors"
  ON public.investors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update investors"
  ON public.investors FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );
```

**Why needed:** Central database of investors with all matching criteria. Supports fast querying and filtering for matching algorithm.

---

#### 2. Investor Matches Table
**File:** `supabase/migrations/XXXXXX_create_investor_matches.sql`

```sql
CREATE TABLE IF NOT EXISTS public.investor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.fundraising_readiness_assessments(id) ON DELETE SET NULL,
  
  -- Match Request Details
  industry TEXT,
  funding_amount INTEGER, -- Amount seeking in USD
  locations TEXT[] DEFAULT '{}',
  business_model TEXT,
  business_stage TEXT,
  business_summary TEXT,
  
  -- Match Results
  matched_investors JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {investor_id, match_score, match_reasons}
  top_matches JSONB, -- Top 3 investor IDs
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_matches_user ON public.investor_matches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investor_matches_assessment ON public.investor_matches(assessment_id);

-- Enable RLS
ALTER TABLE public.investor_matches ENABLE ROW LEVEL SECURITY;

-- Users can view their own matches
CREATE POLICY "Users can view their own matches"
  ON public.investor_matches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own matches
CREATE POLICY "Users can create their own matches"
  ON public.investor_matches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY "Users can update their own matches"
  ON public.investor_matches FOR UPDATE
  USING (auth.uid() = user_id);
```

**Why needed:** Persists match results for users, allows saving matches, tracking history, and linking to assessments.

---

#### 3. Outreach Materials Table
**File:** `supabase/migrations/XXXXXX_create_outreach_materials.sql`

```sql
CREATE TABLE IF NOT EXISTS public.outreach_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES public.investors(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.investor_matches(id) ON DELETE SET NULL,
  
  -- Material Type
  material_type TEXT NOT NULL CHECK (material_type IN ('pitch_deck', 'cold_email', 'one_pager', 'follow_up')),
  
  -- Content
  subject TEXT, -- For emails
  content TEXT NOT NULL, -- Main content (markdown or HTML)
  content_json JSONB, -- Structured content (for decks with slides)
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  is_final BOOLEAN DEFAULT false,
  
  -- Usage Tracking
  times_exported INTEGER DEFAULT 0,
  last_exported_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_materials_user ON public.outreach_materials(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_materials_investor ON public.outreach_materials(investor_id);
CREATE INDEX IF NOT EXISTS idx_outreach_materials_type ON public.outreach_materials(material_type);

-- Enable RLS
ALTER TABLE public.outreach_materials ENABLE ROW LEVEL SECURITY;

-- Users can view their own materials
CREATE POLICY "Users can view their own materials"
  ON public.outreach_materials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own materials
CREATE POLICY "Users can create their own materials"
  ON public.outreach_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own materials
CREATE POLICY "Users can update their own materials"
  ON public.outreach_materials FOR UPDATE
  USING (auth.uid() = user_id);
```

**Why needed:** Stores generated outreach materials, allows versioning, editing, and tracking usage. Links to specific investors and matches.

---

#### 4. Fundraising Readiness Assessments Table (if doesn't exist)
**File:** `supabase/migrations/XXXXXX_create_fundraising_readiness_assessments.sql`

```sql
CREATE TABLE IF NOT EXISTS public.fundraising_readiness_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scores (0-10)
  mvp_score INTEGER NOT NULL CHECK (mvp_score >= 0 AND mvp_score <= 10),
  feedback_score INTEGER NOT NULL CHECK (feedback_score >= 0 AND feedback_score <= 10),
  team_score INTEGER NOT NULL CHECK (team_score >= 0 AND team_score <= 10),
  runway_score INTEGER NOT NULL CHECK (runway_score >= 0 AND runway_score <= 10),
  average_score NUMERIC(5,2) NOT NULL,
  
  -- AI Analysis
  verdict TEXT NOT NULL CHECK (verdict IN ('Ready', 'Not Ready', 'Almost Ready')),
  analysis_data JSONB NOT NULL, -- Full AI analysis response
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Index for fast lookup
  UNIQUE(user_id, created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_user ON public.fundraising_readiness_assessments(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.fundraising_readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assessments
CREATE POLICY "Users can view their own assessments"
  ON public.fundraising_readiness_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own assessments
CREATE POLICY "Users can create their own assessments"
  ON public.fundraising_readiness_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Why needed:** If not already exists, stores readiness assessments for linking to matches. Referenced by investor matches table.

---

### TypeScript Types

#### 1. Investor Types
**File:** `src/types/investor.ts` (NEW)

```typescript
export interface Investor {
  id: string;
  name: string;
  firm_name: string;
  firm_website?: string;
  linkedin_url?: string;
  email?: string;
  
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

export type InvestmentStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c+';

export interface PortfolioCompany {
  name: string;
  website?: string;
  industry?: string;
  stage?: string;
  description?: string;
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
}
```

**Why needed:** Type-safe interfaces for investor data, matches, and matching requests. Used throughout frontend and backend.

---

#### 2. Outreach Material Types
**File:** `src/types/outreach.ts` (NEW)

```typescript
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
  to?: string;
  personalized_tokens?: Record<string, string>;
}

export interface OnePager {
  title: string;
  sections: OnePagerSection[];
}

export interface OnePagerSection {
  heading: string;
  content: string;
}
```

**Why needed:** Type-safe interfaces for outreach materials, ensuring consistent data structure across generation, editing, and export.

---

## Matching Algorithm Logic

### Core Matching Function
**Location:** Edge function or utility file

**Algorithm Overview:**

```typescript
function calculateInvestorMatch(
  investor: Investor,
  matchRequest: MatchRequest,
  readinessScores?: ReadinessScores
): InvestorMatch {
  
  let totalScore = 0;
  const weights = {
    stageAlignment: 0.40,
    industryFocus: 0.25,
    geographicPreference: 0.15,
    checkSizeCompatibility: 0.10,
    portfolioSimilarity: 0.10
  };
  
  // 1. Stage Alignment (40%)
  const stageScore = calculateStageAlignment(
    investor.investment_stages,
    matchRequest.business_stage,
    readinessScores
  );
  totalScore += stageScore * weights.stageAlignment;
  
  // 2. Industry Focus (25%)
  const industryScore = calculateIndustryMatch(
    investor.industries,
    matchRequest.industry
  );
  totalScore += industryScore * weights.industryFocus;
  
  // 3. Geographic Preference (15%)
  const geoScore = calculateGeographicMatch(
    investor.geographic_focus,
    investor.locations,
    investor.remote_friendly,
    matchRequest.locations
  );
  totalScore += geoScore * weights.geographicPreference;
  
  // 4. Check Size Compatibility (10%)
  const checkSizeScore = calculateCheckSizeMatch(
    investor.typical_check_size_min,
    investor.typical_check_size_max,
    matchRequest.funding_amount
  );
  totalScore += checkSizeScore * weights.checkSizeCompatibility;
  
  // 5. Portfolio Similarity (10%)
  const portfolioScore = calculatePortfolioSimilarity(
    investor.portfolio_companies,
    matchRequest.industry,
    matchRequest.business_summary
  );
  totalScore += portfolioScore * weights.portfolioSimilarity;
  
  // Add manual boost if featured
  if (investor.match_score_boost) {
    totalScore += investor.match_score_boost;
  }
  
  // Generate match reasons
  const reasons = generateMatchReasons({
    stageScore,
    industryScore,
    geoScore,
    checkSizeScore,
    portfolioScore
  });
  
  return {
    investor,
    match_score: Math.min(100, Math.max(0, Math.round(totalScore))),
    match_reasons: reasons,
    match_breakdown: {
      stage_alignment: stageScore,
      industry_focus: industryScore,
      geographic_preference: geoScore,
      check_size_compatibility: checkSizeScore,
      portfolio_similarity: portfolioScore
    }
  };
}
```

**Helper Functions:**

```typescript
function calculateStageAlignment(
  investorStages: InvestmentStage[],
  requestedStage: InvestmentStage | undefined,
  readinessScores?: ReadinessScores
): number {
  if (!requestedStage) return 50; // Neutral if not specified
  
  // Exact match = 100
  if (investorStages.includes(requestedStage)) return 100;
  
  // Adjacent stages = 75
  const stageOrder = ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c+'];
  const requestedIndex = stageOrder.indexOf(requestedStage);
  const hasAdjacent = investorStages.some(stage => {
    const stageIndex = stageOrder.indexOf(stage);
    return Math.abs(stageIndex - requestedIndex) === 1;
  });
  if (hasAdjacent) return 75;
  
  // Adjust based on readiness verdict
  if (readinessScores?.verdict === 'Not Ready') {
    // Prefer investors who accept earlier stages
    if (investorStages.includes('pre-seed')) return 60;
  }
  
  return 0; // No match
}

function calculateIndustryMatch(
  investorIndustries: string[],
  requestedIndustry: string
): number {
  if (investorIndustries.length === 0) return 50; // Neutral if no industry specified
  
  // Exact match = 100
  if (investorIndustries.includes(requestedIndustry)) return 100;
  
  // Partial match (case-insensitive) = 80
  const requestedLower = requestedIndustry.toLowerCase();
  if (investorIndustries.some(industry => 
    industry.toLowerCase() === requestedLower
  )) return 100;
  
  // Related industries (future: use industry taxonomy)
  return 0;
}

function calculateGeographicMatch(
  geographicFocus: string[],
  locations: string[],
  remoteFriendly: boolean,
  requestedLocations?: string[]
): number {
  if (!requestedLocations || requestedLocations.length === 0) {
    return remoteFriendly ? 75 : 50; // Prefer remote-friendly if no location specified
  }
  
  // Check if any requested location matches investor's focus
  const hasMatch = requestedLocations.some(loc => 
    geographicFocus.includes(loc) || locations.includes(loc)
  );
  
  if (hasMatch) return 100;
  
  // Check for regional matches (e.g., "US" matches "San Francisco")
  // ... logic for regional matching
  
  // Remote-friendly investors get partial score
  if (remoteFriendly) return 60;
  
  return 0;
}

function calculateCheckSizeMatch(
  minCheck?: number,
  maxCheck?: number,
  requestedAmount?: number
): number {
  if (!requestedAmount || !minCheck) return 50; // Neutral if not specified
  
  // Exact match or within range = 100
  if (maxCheck && requestedAmount >= minCheck && requestedAmount <= maxCheck) {
    return 100;
  }
  
  // Close match (±25%) = 75
  const range = maxCheck ? maxCheck - minCheck : minCheck * 0.5;
  if (requestedAmount >= minCheck * 0.75 && requestedAmount <= (maxCheck || minCheck * 1.25)) {
    return 75;
  }
  
  // Within 2x range = 50
  if (requestedAmount >= minCheck * 0.5 && requestedAmount <= (maxCheck || minCheck) * 2) {
    return 50;
  }
  
  return 0;
}

function calculatePortfolioSimilarity(
  portfolio: PortfolioCompany[],
  industry?: string,
  businessSummary?: string
): number {
  if (portfolio.length === 0) return 50; // Neutral if no portfolio data
  
  // Count similar companies
  let similarCount = 0;
  if (industry) {
    similarCount = portfolio.filter(company => 
      company.industry?.toLowerCase() === industry.toLowerCase()
    ).length;
  }
  
  // Percentage of portfolio that's similar
  const similarityRatio = similarCount / portfolio.length;
  
  // Score: 0-100 based on similarity ratio
  return Math.min(100, Math.round(similarityRatio * 100));
}

function generateMatchReasons(scores: {
  stageScore: number;
  industryScore: number;
  geoScore: number;
  checkSizeScore: number;
  portfolioScore: number;
}): string[] {
  const reasons: string[] = [];
  
  if (scores.stageScore >= 75) {
    reasons.push("Strong stage alignment with your funding needs");
  }
  if (scores.industryScore >= 80) {
    reasons.push("Active investor in your industry");
  }
  if (scores.geoScore >= 80) {
    reasons.push("Geographic focus matches your location");
  }
  if (scores.checkSizeScore >= 75) {
    reasons.push("Typical check size aligns with your ask");
  }
  if (scores.portfolioScore >= 60) {
    reasons.push("Portfolio includes similar companies");
  }
  
  // Always return at least one reason
  if (reasons.length === 0) {
    reasons.push("Potential match based on investment profile");
  }
  
  return reasons.slice(0, 4); // Max 4 reasons
}
```

**Why needed:** Core logic for matching. Can be tested independently, optimized, and potentially moved to ML model later.

---

## Outreach Generation Logic

### Pitch Deck Generation
**Location:** Edge function using AI

**Prompt Structure:**
```typescript
const pitchDeckPrompt = `
Generate a professional pitch deck template for a startup seeking funding.

FOUNDER PROFILE:
Industry: ${industry}
Stage: ${stage}
Funding Ask: $${fundingAmount}
Business Summary: ${businessSummary}

FUNDRAISING READINESS ASSESSMENT:
MVP Score: ${mvpScore}/10 - ${mvpLabel}
Customer Feedback Score: ${feedbackScore}/10 - ${feedbackLabel}
Team Score: ${teamScore}/10 - ${teamLabel}
Runway Score: ${runwayScore}/10 - ${runwayLabel}
Verdict: ${verdict}

STRENGTHS TO HIGHLIGHT:
${strengths.map(s => `- ${s}`).join('\n')}

CRITICAL GAPS TO ADDRESS:
${criticalGaps.map(g => `- ${g}`).join('\n')}

INVESTOR CONTEXT:
${investorName} focuses on: ${investorIndustries.join(', ')}
Portfolio includes: ${similarCompanies.join(', ')}

Generate a 12-15 slide pitch deck with the following structure:
1. Title Slide
2. Problem Statement
3. Solution Overview
4. Market Opportunity
5. Product/MVP Demo
6. Business Model
7. Traction & Metrics
8. Go-to-Market Strategy
9. Competitive Analysis
10. Team
11. Financial Projections
12. Funding Ask & Use of Funds
13. Timeline/Milestones
14. Call to Action

For each slide, provide:
- Slide title
- Key bullet points (3-5)
- Supporting data/metrics
- Visual suggestions

Emphasize strengths while addressing gaps proactively. Make it investor-specific by referencing their portfolio.
`;
```

**AI Response Format:**
```json
{
  "deck": {
    "title": "Company Name Pitch Deck",
    "slides": [
      {
        "slide_number": 1,
        "title": "Title Slide",
        "content": "...",
        "notes": "..."
      },
      ...
    ]
  }
}
```

### Cold Email Generation
**Similar prompt structure** but focused on:
- Subject line variations (3-5 options)
- Email body (100-150 words)
- Personalization tokens
- Strong CTA

### One-Pager Generation
**Similar prompt structure** but:
- Single-page format
- Denser content
- Key metrics prominently displayed
- Professional design suggestions

---

## File Structure & Implementation

### Files to Create

#### Frontend Components

**1. `src/components/investor/InvestorMatchingToolkit.tsx` (NEW)**
- **Purpose:** Main component combining matching + outreach generation
- **Location:** Rendered in Blog.tsx as a standalone section between FundraisingReadinessToolkit and FundingOpportunitiesSection
- **Features:**
  - Entry point from readiness assessment (optional - can also be used standalone)
  - Context collection form
  - Results display
  - Integration with outreach generator
  - Standalone section with its own header/styling matching the page design
- **Why:** Central hub for the entire tool, orchestrates both features. Positioned as its own section to maintain visual hierarchy.

**2. `src/components/investor/InvestorMatchResults.tsx` (NEW)**
- **Purpose:** Display matched investors with scores and details
- **Features:**
  - Top 3 "Start Here" section
  - Full list with filtering/sorting
  - Investor profile cards
  - Match breakdown visualization
  - Export functionality
- **Why:** Reusable results component, clean separation of concerns

**3. `src/components/investor/InvestorMatchCard.tsx` (NEW)**
- **Purpose:** Individual investor match card
- **Features:**
  - Match score display (visual progress bar)
  - Investor info summary
  - Match reasons
  - Action buttons (View Profile, Generate Outreach, Save)
- **Why:** Reusable card component for consistent UI

**4. `src/components/investor/InvestorProfileModal.tsx` (NEW)**
- **Purpose:** Detailed investor profile view
- **Features:**
  - Full investor information
  - Portfolio companies list
  - Investment thesis
  - Contact preferences
  - Recent activity
- **Why:** Detailed view without navigation, modal pattern matches codebase

**5. `src/components/investor/OutreachGenerator.tsx` (NEW)**
- **Purpose:** Outreach material generation interface
- **Features:**
  - Material type selection (Deck/Email/One-Pager)
  - Generation options
  - Preview/editor
  - Export buttons
  - Save functionality
- **Why:** Unified interface for all outreach generation, matches user flow

**6. `src/components/investor/PitchDeckPreview.tsx` (NEW)**
- **Purpose:** Preview/edit generated pitch deck
- **Features:**
  - Slide-by-slide preview
  - Edit capability
  - Export to PDF/PowerPoint
  - Download functionality
- **Why:** Specialized component for deck editing, different from email/one-pager

**7. `src/components/investor/EmailPreview.tsx` (NEW)**
- **Purpose:** Preview/edit generated email
- **Features:**
  - Subject line editor
  - Body editor (rich text)
  - Copy to clipboard
  - Export to file
- **Why:** Email-specific editing needs (subject + body)

**8. `src/components/investor/OnePagerPreview.tsx` (NEW)**
- **Purpose:** Preview/edit generated one-pager
- **Features:**
  - Section-by-section editing
  - PDF preview
  - Export to PDF
- **Why:** One-pager has specific layout requirements

**9. `src/components/investor/MatchContextForm.tsx` (NEW)**
- **Purpose:** Form to collect additional context after readiness assessment
- **Features:**
  - Industry dropdown
  - Funding amount input
  - Location multi-select
  - Business model dropdown
  - Stage selection
  - Business summary textarea
  - Validation
- **Why:** Reusable form component, clean data collection

---

#### Hooks

**10. `src/hooks/useInvestorMatching.ts` (NEW)**
- **Purpose:** Hook for investor matching functionality
- **Features:**
  - `findMatches(matchRequest)` - Call matching edge function
  - `saveMatch(matchData)` - Save matches to database
  - `getSavedMatches()` - Fetch user's saved matches
  - `getInvestorProfile(investorId)` - Fetch full investor details
- **Why:** Encapsulates matching logic, reusable across components

**11. `src/hooks/useOutreachGenerator.ts` (NEW)**
- **Purpose:** Hook for outreach material generation
- **Features:**
  - `generatePitchDeck(data)` - Generate deck
  - `generateColdEmail(data)` - Generate email
  - `generateOnePager(data)` - Generate one-pager
  - `saveMaterial(material)` - Save generated material
  - `getMaterials(investorId?)` - Fetch user's materials
- **Why:** Encapsulates generation logic, handles loading/error states

---

#### Types

**12. `src/types/investor.ts` (NEW)**
- **Purpose:** TypeScript interfaces for investors and matches
- **Content:** All investor-related types (as defined above)
- **Why:** Type safety, shared interfaces across frontend/backend

**13. `src/types/outreach.ts` (NEW)**
- **Purpose:** TypeScript interfaces for outreach materials
- **Content:** All outreach-related types (as defined above)
- **Why:** Type safety for material generation and storage

---

#### Backend Edge Functions

**14. `supabase/functions/investor-matching/index.ts` (NEW)**
- **Purpose:** Edge function for investor matching algorithm
- **Features:**
  - Accepts match request + readiness assessment data
  - Fetches investors from database
  - Applies matching algorithm
  - Returns ranked matches
  - Saves matches to database (optional)
- **Why:** Server-side matching logic, can be optimized, handles credit deduction

**15. `supabase/functions/outreach-generator/index.ts` (NEW)**
- **Purpose:** Edge function for generating outreach materials
- **Features:**
  - Accepts material type + business data + investor data
  - Calls AI to generate content
  - Returns structured content
  - Saves to database (optional)
- **Why:** Server-side generation, AI API calls, credit management

---

#### Database Migrations

**16. `supabase/migrations/XXXXXX_create_investors.sql` (NEW)**
- **Purpose:** Create investors table
- **Content:** Full schema as defined above
- **Why:** Database foundation for investor data

**17. `supabase/migrations/XXXXXX_create_investor_matches.sql` (NEW)**
- **Purpose:** Create investor_matches table
- **Content:** Full schema as defined above
- **Why:** Persist match results for users

**18. `supabase/migrations/XXXXXX_create_outreach_materials.sql` (NEW)**
- **Purpose:** Create outreach_materials table
- **Content:** Full schema as defined above
- **Why:** Store generated outreach materials

**19. `supabase/migrations/XXXXXX_create_fundraising_readiness_assessments.sql` (NEW - if needed)**
- **Purpose:** Create fundraising_readiness_assessments table if doesn't exist
- **Content:** Full schema as defined above
- **Why:** Store assessments for linking to matches

**20. `supabase/migrations/XXXXXX_seed_initial_investors.sql` (NEW)**
- **Purpose:** Seed initial investor database
- **Content:** 50-100 curated investors (Y Combinator, Techstars, etc.)
- **Why:** Initial data for MVP, demonstrates value immediately

---

#### Data Files

**21. `src/data/initialInvestors.ts` (NEW)**
- **Purpose:** TypeScript array of initial investors (fallback if database empty)
- **Content:** 20-30 hardcoded investors with full profiles
- **Why:** Fallback data, allows development/testing without database

---

#### Configuration

**22. `src/config/constants.ts` (MODIFY)**
- **Purpose:** Add credit costs for new features
- **Changes:**
  ```typescript
  export const CREDIT_COSTS = {
    // ... existing costs
    INVESTOR_MATCHING: 5,
    PITCH_DECK_GENERATION: 8,
    COLD_EMAIL_GENERATION: 3,
    ONEPAGER_GENERATION: 3,
  }
  ```
- **Why:** Consistent credit cost management, single source of truth

---

### Files to Modify

#### 1. `src/components/blog/FundraisingReadinessToolkit.tsx` (MODIFY)
- **Changes:**
  - Add "Find My Investors" button below AI analysis results
  - Button should scroll to InvestorMatchingToolkit section (using anchor link or scrollIntoView)
  - Pass assessment data via URL state or localStorage for continuity
- **Location:** After line 638 (after analysis card closes)
- **Why:** Entry point for new tool, smooth user flow between sections

**Specific Changes:**
```typescript
// After AI analysis is displayed, add:
{aiAnalysis && (
  <div className="mt-6 text-center">
    <Button 
      size="lg" 
      className="w-full sm:w-auto"
      onClick={() => {
        // Scroll to investor matching section
        const section = document.getElementById('investor-matching-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Optionally pass assessment data via URL state or localStorage
          if (window.localStorage) {
            localStorage.setItem('ct_assessment_data', JSON.stringify({
              scores: scores,
              analysis: aiAnalysis,
              averageScore: averageScore
            }));
          }
        }
      }}
    >
      <Users className="mr-2 h-5 w-5" />
      Find My Investors
    </Button>
  </div>
)}
```

**Note:** InvestorMatchingToolkit will be a separate section component that can work standalone or accept assessment data from the readiness toolkit.

---

#### 2. `src/pages/Blog.tsx` (MODIFY)
- **Changes:**
  - Import InvestorMatchingToolkit component
  - Render BETWEEN FundraisingReadinessToolkit and FundingOpportunitiesSection
  - Handle state/props passing if needed (tool can work standalone)
  - Order in main tag should be:
    1. FundraisingReadinessToolkit
    2. InvestorMatchingToolkit (NEW)
    3. FundingOpportunitiesSection
- **Why:** Integrates tool into Insighta page flow with proper visual hierarchy

---

#### 3. `supabase/functions/_shared/credit-constants.ts` (MODIFY)
- **Changes:** Add credit costs for matching and generation
- **Why:** Backend credit constants must match frontend

---

## Component Architecture

### Component Hierarchy

```
Blog.tsx (Insighta Page)
├── FundraisingReadinessToolkit.tsx
│   └── [After Analysis] → "Find My Investors" button (links to InvestorMatchingToolkit section)
├── InvestorMatchingToolkit.tsx (NEW - Standalone section)
│   ├── MatchContextForm.tsx
│   ├── [Loading State]
│   └── InvestorMatchResults.tsx
│       ├── InvestorMatchCard.tsx (top 3)
│       └── InvestorMatchCard.tsx (full list)
│           └── InvestorProfileModal.tsx (on click)
│               └── OutreachGenerator.tsx
│                   ├── PitchDeckPreview.tsx
│                   ├── EmailPreview.tsx
│                   └── OnePagerPreview.tsx
└── FundingOpportunitiesSection.tsx
```

---

## Service Layer Architecture

### Edge Function: Investor Matching

**File:** `supabase/functions/investor-matching/index.ts`

**Request Flow:**
1. Authenticate user (check credits)
2. Validate match request data
3. Fetch latest readiness assessment (if assessment_id provided)
4. Fetch all active investors from database
5. Apply matching algorithm to each investor
6. Sort by match score (descending)
7. Take top 15 matches
8. Generate match reasons for each
9. Save matches to database (optional)
10. Return matches with scores

**Request Body:**
```typescript
{
  assessment_id?: string; // Optional: link to specific assessment
  industry: string;
  funding_amount: number;
  locations?: string[];
  business_model?: string;
  business_stage?: 'pre-seed' | 'seed' | 'series-a';
  business_summary?: string;
  
  // Optional: readiness data (if not fetching from assessment)
  readiness_scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
  verdict?: 'Ready' | 'Not Ready' | 'Almost Ready';
  strengths?: string[];
  critical_gaps?: string[];
}
```

**Response:**
```typescript
{
  matches: InvestorMatch[];
  top_matches: string[]; // IDs of top 3
  match_request: MatchRequest;
  generated_at: string;
  credits_used: number;
}
```

**Error Handling:**
- Invalid request data → 400
- Insufficient credits → 402
- Database errors → 500 (with fallback to hardcoded data)
- No matches found → 200 with empty array

---

### Edge Function: Outreach Generator

**File:** `supabase/functions/outreach-generator/index.ts`

**Request Flow:**
1. Authenticate user (check credits)
2. Validate material type and data
3. Fetch investor profile (if investor_id provided)
4. Fetch readiness assessment (if available)
5. Build AI prompt based on material type
6. Call AI API (Lovable AI Gateway)
7. Parse and structure response
8. Save to database (optional)
9. Return generated material

**Request Body:**
```typescript
{
  material_type: 'pitch_deck' | 'cold_email' | 'one_pager';
  investor_id?: string;
  assessment_id?: string;
  
  // Business data
  industry: string;
  funding_amount: number;
  business_stage: string;
  business_summary: string;
  
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
```

**Response:**
```typescript
{
  material: {
    type: MaterialType;
    content: string;
    content_json?: Record<string, unknown>;
    subject?: string; // For emails
  };
  credits_used: number;
  saved: boolean; // Whether saved to database
}
```

**Error Handling:**
- Invalid material type → 400
- Insufficient credits → 402
- AI generation failure → 500 (with retry logic)
- Invalid investor → 404

---

## AI Prompt Engineering

### Pitch Deck Generation Prompt

**Structure:**
```
You are an expert pitch deck consultant helping founders create investor-ready pitch decks.

FOUNDER PROFILE:
[Industry, Stage, Funding Ask, Business Summary]

FUNDRAISING READINESS:
[Scores, Verdict, Strengths, Gaps]

INVESTOR TARGET:
[Investor Name, Focus Areas, Portfolio Companies]

INSTRUCTIONS:
1. Generate a 12-15 slide pitch deck
2. Emphasize strengths while addressing gaps proactively
3. Make it specific to this investor's focus
4. Use data-driven language
5. Include actionable metrics where possible
6. Address critical gaps directly (don't hide weaknesses)

OUTPUT FORMAT: JSON with slide structure
```

### Cold Email Generation Prompt

**Structure:**
```
You are an expert cold email writer for startup fundraising.

INVESTOR: [Name, Firm, Focus]
FOUNDER: [Business Summary]
CONTEXT: [Why they're a good match]

INSTRUCTIONS:
1. Generate 3-5 subject line variations
2. Generate email body (100-150 words)
3. Personalize with investor-specific details
4. Include clear CTA
5. Professional but engaging tone

OUTPUT FORMAT: JSON with subject lines and body
```

---

## Integration Points

### 1. Credit System Integration
- **Location:** Both edge functions
- **Pattern:** Use existing `checkAndDeductCredits` from `_shared/credit-deduction.ts`
- **Costs:**
  - Investor Matching: 5 credits
  - Pitch Deck Generation: 8 credits
  - Cold Email Generation: 3 credits
  - One-Pager Generation: 3 credits

### 2. Authentication Integration
- **Location:** Both edge functions
- **Pattern:** Use existing `getUserFromAuth` from `_shared/credit-deduction.ts`
- **Requirements:** User must be authenticated for matching and generation

### 3. Database Integration
- **Tables:** Use existing Supabase client patterns
- **RLS:** Follow existing RLS policy patterns (users see their own data)
- **Relations:** Link to fundraising_readiness_assessments if exists

### 4. UI Component Integration
- **Pattern:** Match existing component patterns (Card, Button, Badge, etc.)
- **Styling:** Use existing Tailwind classes and design system
- **State Management:** React hooks, useState/useEffect patterns

---

## Matching Algorithm Details

### Score Calculation Breakdown

**Stage Alignment (40% weight):**
- Exact stage match: 100 points
- Adjacent stage: 75 points
- 2 stages away: 50 points
- No match: 0 points
- Special handling for "Not Ready" verdict → prefer pre-seed investors

**Industry Focus (25% weight):**
- Exact industry match: 100 points
- Related industry (using taxonomy): 75 points
- Generalist investor: 60 points
- No match: 0 points

**Geographic Preference (15% weight):**
- Exact location match: 100 points
- Regional match: 80 points
- Remote-friendly (if no location specified): 75 points
- Remote-friendly (if location doesn't match): 60 points
- No match: 0 points

**Check Size Compatibility (10% weight):**
- Within range: 100 points
- ±25% of range: 75 points
- Within 2x range: 50 points
- No match: 0 points

**Portfolio Similarity (10% weight):**
- 50%+ portfolio similar: 100 points
- 25-50% similar: 75 points
- 10-25% similar: 50 points
- <10% similar: 0 points
- No portfolio data: 50 points (neutral)

**Final Score:** Weighted sum + manual boost (if featured) → capped at 100

---

## Outreach Generation Details

### Pitch Deck Slide Structure

**Required Slides:**
1. Title Slide (Company Name, Tagline, Contact)
2. Problem Statement
3. Solution Overview
4. Market Opportunity (TAM/SAM/SOM)
5. Product/MVP Demo
6. Business Model
7. Traction & Metrics
8. Go-to-Market Strategy
9. Competitive Analysis
10. Team
11. Financial Projections
12. Funding Ask & Use of Funds
13. Timeline/Milestones
14. Call to Action

**AI Instructions:**
- Fill slides based on readiness scores
- Highlight strengths prominently
- Address gaps in competitive analysis or team slide
- Use investor's portfolio companies as examples
- Include specific metrics from assessment
- Professional tone, data-driven

### Cold Email Structure

**Components:**
- **Subject Line:** 3-5 variations (50-60 characters, action-oriented)
- **Opening:** Personal connection (portfolio company, mutual connection, industry)
- **Body (3 paragraphs):**
  - Paragraph 1: Problem/Solution (30-40 words)
  - Paragraph 2: Traction/Metrics (30-40 words)
  - Paragraph 3: Ask/CTA (20-30 words)
- **Closing:** Professional sign-off with contact info

**Length:** 100-150 words total
**Tone:** Professional but engaging, confident but not arrogant

### One-Pager Structure

**Sections:**
1. Header (Company Name, Logo Space, Contact)
2. Problem/Solution (2-3 sentences)
3. Market Opportunity (Numbers: TAM, growth rate)
4. Traction (Key metrics, milestones)
5. Team (Founders, key advisors)
6. Business Model (Revenue streams)
7. Funding Ask & Use of Funds (Breakdown)
8. Contact/CTA

**Layout:** Single page, scannable, visual hierarchy
**Length:** 400-500 words total
**Design:** Professional, branded, investor-friendly

---

## User Experience Flow (Detailed)

### Flow 1: From Assessment to Matches

1. **User completes readiness assessment**
   - Sets 4 scores (MVP, Feedback, Team, Runway)
   - Clicks "Analyze Readiness"
   - Sees AI analysis results

2. **User clicks "Find My Investors" button**
   - Button appears below analysis card
   - Opens modal or expands section

3. **Context collection form appears**
   - Pre-filled with any known data (from profile, if available)
   - Required: Industry, Funding Amount
   - Optional: Location, Business Model, Stage, Summary
   - Submit button: "Find Matches"

4. **Loading state**
   - Shows: "Analyzing 500+ investors..."
   - Progress indicator (optional)
   - Spinner animation

5. **Matches displayed**
   - Top 3 "Start Here" section (prominent)
   - Full list below (scrollable)
   - Filter/sort options
   - Export button

6. **User reviews matches**
   - Clicks investor card to see full profile
   - Reviews match score and reasons
   - Decides which investors to pursue

### Flow 2: From Match to Outreach

1. **User clicks "Generate Outreach" on investor**
   - Modal opens with options:
     - Generate All Materials
     - Generate Pitch Deck
     - Generate Cold Email
     - Generate One-Pager

2. **User selects material type**
   - Loading state: "Generating your [material]..."
   - AI processes request

3. **Generated material appears**
   - Preview/editor opens
   - Editable content
   - Save button
   - Export buttons (PDF, Copy, Download)

4. **User edits (optional)**
   - Makes customizations
   - Saves changes

5. **User exports**
   - Downloads or copies material
   - Ready to use for outreach

---

## Data Flow Architecture

### Matching Flow

```
Frontend (InvestorMatchingToolkit)
  ↓
  Collects context form data
  ↓
  Combines with readiness assessment data
  ↓
  Calls: supabase.functions.invoke('investor-matching')
    ↓
    Edge Function (investor-matching)
      ↓
      Authenticates user
      ↓
      Checks/deducts credits
      ↓
      Fetches readiness assessment (if ID provided)
      ↓
      Fetches all active investors from database
      ↓
      Applies matching algorithm
      ↓
      Sorts by match score
      ↓
      Takes top 15
      ↓
      Saves to investor_matches table (optional)
      ↓
      Returns matches
  ↓
Frontend receives matches
  ↓
Displays in InvestorMatchResults component
```

### Outreach Generation Flow

```
Frontend (OutreachGenerator)
  ↓
  User selects material type
  ↓
  Collects business data + investor data
  ↓
  Calls: supabase.functions.invoke('outreach-generator')
    ↓
    Edge Function (outreach-generator)
      ↓
      Authenticates user
      ↓
      Checks/deducts credits
      ↓
      Fetches investor profile (if ID provided)
      ↓
      Fetches readiness assessment (if available)
      ↓
      Builds AI prompt based on material type
      ↓
      Calls Lovable AI Gateway
      ↓
      Parses AI response
      ↓
      Structures content (JSON for decks, text for emails)
      ↓
      Saves to outreach_materials table (optional)
      ↓
      Returns generated material
  ↓
Frontend receives material
  ↓
Displays in preview/editor component
  ↓
User edits (optional)
  ↓
User exports
```

---

## Credit Cost Strategy

### Credit Costs Defined

```typescript
// Frontend: src/config/constants.ts
// Backend: supabase/functions/_shared/credit-constants.ts

export const CREDIT_COSTS = {
  INVESTOR_MATCHING: 5,        // Matching algorithm + database query
  PITCH_DECK_GENERATION: 8,    // More expensive (complex AI generation)
  COLD_EMAIL_GENERATION: 3,    // Simpler generation
  ONEPAGER_GENERATION: 3,      // Similar complexity to email
}
```

### Credit Deduction Flow

1. **Before processing:** Check user has sufficient credits
2. **If insufficient:** Return 402 status, show CreditGate modal
3. **If sufficient:** Deduct credits, proceed with operation
4. **On success:** Confirm credit deduction in response
5. **On failure:** Refund credits (if possible) or log for manual review

---

## Error Handling Strategy

### Frontend Error Handling

**Network Errors:**
- Display user-friendly error message
- Retry button for transient failures
- Fallback to cached/hardcoded data if available

**Credit Errors:**
- Show CreditGate modal
- Link to purchase credits page
- Clear messaging about required credits

**Validation Errors:**
- Inline field validation
- Clear error messages
- Prevent submission until valid

### Backend Error Handling

**Validation Errors:**
- Return 400 with specific field errors
- Clear error messages for frontend display

**Credit Errors:**
- Return 402 with required credit amount
- Include current balance in response

**AI Generation Failures:**
- Retry logic (max 2 retries)
- Fallback to simpler generation
- Return partial results if possible

**Database Errors:**
- Graceful degradation (continue without saving)
- Log errors for debugging
- Return success even if save fails (non-critical)

---

## Performance Considerations

### Matching Performance

**Optimizations:**
1. **Database Indexes:** GIN indexes on arrays (industries, stages, locations)
2. **Limit Query:** Only fetch active investors
3. **Client-Side Filtering:** Initial filter by stage/industry before algorithm
4. **Caching:** Cache investor database (refresh daily)
5. **Pagination:** If >100 investors, process in batches

**Expected Performance:**
- Database query: <500ms
- Matching algorithm: <1s for 200 investors
- Total response time: <2s

### Generation Performance

**Optimizations:**
1. **Prompt Optimization:** Keep prompts concise but complete
2. **Streaming (Future):** Stream deck generation slide-by-slide
3. **Caching:** Cache generated materials per investor+founder combo
4. **Rate Limiting:** Limit concurrent generations per user

**Expected Performance:**
- AI API call: 5-15s (depending on material type)
- Parsing/structuring: <1s
- Total response time: 5-20s

---

## Security Considerations

### Data Privacy

**Investor Data:**
- Public data (name, firm, focus) - viewable by all
- Contact info - only shown to authenticated users
- Portfolio companies - public data

**User Data:**
- Match requests - private to user
- Generated materials - private to user
- Readiness assessments - private to user

### RLS Policies

**Investors Table:**
- Anyone can view active investors (for matching)
- Only admins can modify

**Investor Matches:**
- Users can only view their own matches
- Users can create their own matches

**Outreach Materials:**
- Users can only view their own materials
- Users can create/update their own materials

### Input Validation

**Frontend:**
- Validate all form inputs
- Sanitize user-provided text
- Limit text lengths

**Backend:**
- Validate all inputs
- Sanitize before AI generation
- Validate investor IDs exist
- Validate assessment IDs belong to user

---

## Testing Strategy

### Unit Tests

**Matching Algorithm:**
- Test each scoring function independently
- Test edge cases (missing data, empty arrays)
- Test weight calculations
- Test match reason generation

**Data Transformation:**
- Test investor data parsing
- Test match result formatting
- Test export formatting (CSV, PDF)

### Integration Tests

**Edge Functions:**
- Test full matching flow with mock data
- Test generation flow with mock AI responses
- Test credit deduction
- Test error handling

**Database:**
- Test RLS policies
- Test queries with various filters
- Test data integrity

### E2E Tests (Future)

- Complete user flow: Assessment → Matching → Generation
- Test with real AI responses (slow, use sparingly)
- Test error scenarios
- Test credit gate flows

---

## Deployment Checklist

### Phase 1: Database Setup
- [ ] Create investors table migration
- [ ] Create investor_matches table migration
- [ ] Create outreach_materials table migration
- [ ] Create fundraising_readiness_assessments table (if needed)
- [ ] Run migrations on staging
- [ ] Seed initial investors (50-100)
- [ ] Verify RLS policies work

### Phase 2: Backend Services
- [ ] Create investor-matching edge function
- [ ] Create outreach-generator edge function
- [ ] Test edge functions locally
- [ ] Deploy edge functions to staging
- [ ] Test with real data
- [ ] Add credit costs to constants

### Phase 3: Frontend Components
- [ ] Create all TypeScript types
- [ ] Create all React components
- [ ] Create all hooks
- [ ] Integrate with existing components
- [ ] Style to match design system
- [ ] Test user flows

### Phase 4: Integration
- [ ] Connect frontend to backend
- [ ] Test full flow end-to-end
- [ ] Fix bugs and edge cases
- [ ] Performance testing
- [ ] Error handling verification

### Phase 5: Polish
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error messages
- [ ] Add success notifications
- [ ] Optimize performance
- [ ] Add analytics tracking

### Phase 6: Launch
- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Collect user feedback
- [ ] Iterate based on usage

---

## Future Enhancements (Out of Scope for MVP)

1. **Warm Intro Discovery:** LinkedIn integration for finding mutual connections
2. **Investor CRM:** Full pipeline management (tracking, follow-ups)
3. **AI Refinement:** Learn from user feedback to improve matching
4. **Portfolio Analysis:** Deep dive into investor portfolios
5. **Investor Activity Tracking:** Real-time updates on investor activity
6. **A/B Testing:** Test different email variations
7. **Template Library:** Community-contributed templates
8. **Batch Generation:** Generate materials for multiple investors at once
9. **Export Formats:** More export options (Notion, Google Docs)
10. **Mobile Optimization:** Better mobile experience for matching/generation

---

## Success Metrics

### Adoption Metrics
- % of users who complete readiness assessment and use matching tool
- % who generate outreach materials
- Average number of matches generated per user
- Average number of materials generated per user

### Engagement Metrics
- Time spent reviewing matches
- Number of investors viewed per session
- Export rate (materials downloaded/copied)
- Return rate (users who come back to review matches)

### Value Metrics
- Match quality score (user feedback)
- Material quality score (user feedback)
- Outreach response rate (if tracking available)
- Fundraising success stories (long-term)

---

## Technical Debt & Limitations

### Known Limitations (MVP)

1. **Investor Database Size:** Starting with 50-100 curated investors (not comprehensive)
2. **Matching Algorithm:** Rule-based (not ML-powered) - simpler but less sophisticated
3. **Industry Taxonomy:** Basic matching (no sophisticated industry relationships)
4. **Portfolio Data:** Limited portfolio company information
5. **Warm Intro Discovery:** Not included in MVP
6. **Template Variety:** Single template per material type (no variations)

### Future Improvements

1. Expand investor database to 500+ investors
2. Implement ML-based matching using user feedback
3. Integrate with Crunchbase API for real-time data
4. Build industry taxonomy for better matching
5. Add warm intro discovery via LinkedIn
6. Create template marketplace

---

## Implementation Timeline Estimate

### Week 1: Database & Backend Foundation
- Day 1-2: Database migrations (investors, matches, materials)
- Day 3-4: Seed initial investor data
- Day 5: Edge function structure and authentication

### Week 2: Matching Algorithm
- Day 1-2: Implement matching algorithm logic
- Day 3: Investor-matching edge function
- Day 4-5: Testing and refinement

### Week 3: Outreach Generation
- Day 1-2: Outreach-generator edge function
- Day 3: AI prompt engineering
- Day 4-5: Testing and refinement

### Week 4: Frontend Components
- Day 1-2: TypeScript types and hooks
- Day 3-4: React components
- Day 5: Integration with existing components

### Week 5: Polish & Testing
- Day 1-2: Error handling and edge cases
- Day 3: Performance optimization
- Day 4: User testing and feedback
- Day 5: Bug fixes and final polish

**Total Estimated Time:** 5 weeks for MVP

---

## Risk Mitigation

### Technical Risks

**Risk:** AI generation failures
- **Mitigation:** Robust error handling, retry logic, fallback templates

**Risk:** Matching algorithm too slow
- **Mitigation:** Optimize database queries, add indexes, limit investor count

**Risk:** Credit system issues
- **Mitigation:** Thorough testing, graceful degradation, manual credit adjustments

### Product Risks

**Risk:** Low match quality
- **Mitigation:** Curate investor database carefully, refine algorithm iteratively

**Risk:** Generated materials too generic
- **Mitigation:** Rich prompts, personalization, allow extensive editing

**Risk:** User confusion
- **Mitigation:** Clear UI, helpful tooltips, step-by-step guidance

---

## Open Questions for Decision

1. **Investor Data Source:**
   - Option A: Manual curation (more control, higher quality, ongoing maintenance)
   - Option B: API integration (Crunchbase, faster to market, API costs, less control)

2. **Credit Pricing:**
   - Current estimates: Matching (5), Deck (8), Email (3), One-Pager (3)
   - Should these be adjusted based on value perception?

3. **Material Editing:**
   - Full WYSIWYG editor or simple text editing?
   - Export format priority: PDF, PowerPoint, Google Slides?

4. **Investor Database Size (MVP):**
   - Start with 50 investors (faster, curated)
   - Or 200+ investors (more value, longer setup)

5. **Assessment Integration:**
   - Require completion of readiness assessment first?
   - Or allow standalone matching without assessment?

---

This plan provides a complete blueprint for implementation. All files, data structures, algorithms, and integration points are defined. Ready for execution when approved.

