/**
 * Industry-specific benchmarks for fundraising readiness assessment
 * Provides context-aware expectations for each industry and stage combination
 */

import { FounderStage } from "@/types/fundraisingAssessment";

export interface StageBenchmark {
  typical_traction: string;
  typical_runway_months: string;
  typical_team_size: string;
  typical_funding_raised: string;
  avg_time_to_raise: string;
  success_rate: string;
  key_metrics: string[];
}

export interface IndustryBenchmark {
  name: string;
  description: string;
  avg_funding_timeline: string;
  capital_intensity: 'Low' | 'Medium' | 'High' | 'Very High';
  benchmarks: {
    [K in FounderStage]: StageBenchmark;
  };
  success_stories: Array<{
    company: string;
    stage_when_raised: FounderStage;
    key_differentiator: string;
    outcome: string;
  }>;
}

export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  'SaaS': {
    name: 'SaaS (Software as a Service)',
    description: 'Subscription-based software delivered over the internet',
    avg_funding_timeline: '3-6 months from first investor meeting to close',
    capital_intensity: 'Low',
    benchmarks: {
      ideation: {
        typical_traction: 'Landing page with 50-200 email signups',
        typical_runway_months: '6-9 months',
        typical_team_size: '1-2 founders',
        typical_funding_raised: '$0-50K (friends/family)',
        avg_time_to_raise: '2-3 months',
        success_rate: '~5-10% of applicants raise institutional pre-seed',
        key_metrics: ['Email signups', 'Customer interviews completed', 'Problem validation']
      },
      validation: {
        typical_traction: '10-100 users, $500-5K MRR, 20-40% MoM growth',
        typical_runway_months: '9-12 months',
        typical_team_size: '2-3 people (founders + maybe 1 eng)',
        typical_funding_raised: '$100K-500K (angels/pre-seed)',
        avg_time_to_raise: '3-4 months',
        success_rate: '~15-20% raise pre-seed/seed',
        key_metrics: ['MRR', 'MoM growth', 'Churn rate', 'CAC', 'Users']
      },
      building: {
        typical_traction: '100-1000 users, $10K-50K MRR, $50K-150K ARR',
        typical_runway_months: '12-18 months',
        typical_team_size: '4-8 people (eng, sales, product)',
        typical_funding_raised: '$500K-2M (seed)',
        avg_time_to_raise: '4-6 months',
        success_rate: '~25-30% raise seed',
        key_metrics: ['ARR', 'MRR growth', 'LTV:CAC ratio (target 3:1)', 'Net retention', 'Payback period']
      },
      launching: {
        typical_traction: '$200K-1M ARR, 30-50% YoY growth, clear PMF',
        typical_runway_months: '15-24 months',
        typical_team_size: '10-25 people',
        typical_funding_raised: '$2M-8M (Series A)',
        avg_time_to_raise: '5-8 months',
        success_rate: '~30-40% raise Series A',
        key_metrics: ['ARR', 'NDR (target >110%)', 'Magic number', 'Gross margin', 'CAC payback <12mo']
      },
      scaling: {
        typical_traction: '$3M-10M ARR, T2D3 growth trajectory',
        typical_runway_months: '18-30 months',
        typical_team_size: '30-100 people',
        typical_funding_raised: '$10M-30M (Series B)',
        avg_time_to_raise: '6-9 months',
        success_rate: '~40-50% raise Series B+',
        key_metrics: ['ARR growth rate', 'Rule of 40', 'Gross margin >70%', 'NRR >120%', 'GTM efficiency']
      }
    },
    success_stories: [
      {
        company: 'Notion',
        stage_when_raised: 'validation',
        key_differentiator: 'Strong founder-market fit (built for themselves), viral organic growth',
        outcome: 'Raised $50M at $800M valuation after reaching 1M users organically'
      },
      {
        company: 'Calendly',
        stage_when_raised: 'building',
        key_differentiator: 'Bootstrapped to $70K MRR before raising, strong product-market fit',
        outcome: 'Raised $350M at $3B valuation, profitable since day 1'
      },
      {
        company: 'Superhuman',
        stage_when_raised: 'validation',
        key_differentiator: 'Measured product-market fit scientifically (40%+ "very disappointed"), waitlist demand',
        outcome: 'Raised $33M seed/Series A, reached $20M ARR with elite positioning'
      }
    ]
  },

  'Fintech': {
    name: 'Fintech (Financial Technology)',
    description: 'Technology-driven financial services and products',
    avg_funding_timeline: '4-8 months (regulatory complexity)',
    capital_intensity: 'Medium',
    benchmarks: {
      ideation: {
        typical_traction: 'Regulatory research, 100-500 waitlist signups',
        typical_runway_months: '9-12 months',
        typical_team_size: '2-3 founders (tech + finance expertise)',
        typical_funding_raised: '$50K-150K (friends/family)',
        avg_time_to_raise: '3-4 months',
        success_rate: '~3-5% (high regulatory bar)',
        key_metrics: ['Waitlist size', 'Regulatory approval progress', 'Partnership LOIs']
      },
      validation: {
        typical_traction: '500-5K users, $5K-20K transaction volume',
        typical_runway_months: '12-18 months',
        typical_team_size: '4-6 people (eng, compliance, product)',
        typical_funding_raised: '$500K-1.5M (pre-seed/seed)',
        avg_time_to_raise: '5-7 months',
        success_rate: '~10-15%',
        key_metrics: ['Transaction volume', 'Take rate', 'Compliance milestones', 'Active users']
      },
      building: {
        typical_traction: '$500K-3M transaction volume/month, regulatory approvals',
        typical_runway_months: '15-24 months',
        typical_team_size: '8-15 people',
        typical_funding_raised: '$3M-10M (Series A)',
        avg_time_to_raise: '6-9 months',
        success_rate: '~20-25%',
        key_metrics: ['GMV', 'Take rate', 'Unit economics', 'Fraud rate', 'Regulatory compliance']
      },
      launching: {
        typical_traction: '$5M-20M GMV/month, multi-product',
        typical_runway_months: '18-30 months',
        typical_team_size: '20-50 people',
        typical_funding_raised: '$15M-50M (Series B)',
        avg_time_to_raise: '8-12 months',
        success_rate: '~25-35%',
        key_metrics: ['GMV growth', 'Revenue', 'CAC:LTV', 'Cross-sell rate', 'Banking partnerships']
      },
      scaling: {
        typical_traction: '$50M-200M GMV/month, expansion to new markets',
        typical_runway_months: '24-36 months',
        typical_team_size: '100-300 people',
        typical_funding_raised: '$75M-200M (Series C+)',
        avg_time_to_raise: '9-15 months',
        success_rate: '~30-40%',
        key_metrics: ['Revenue at scale', 'Path to profitability', 'International expansion', 'Market share']
      }
    },
    success_stories: [
      {
        company: 'Stripe',
        stage_when_raised: 'validation',
        key_differentiator: 'Developer-first API, solved real pain (7 lines of code vs weeks)',
        outcome: 'YC S09, raised $2M seed, now $95B valuation'
      },
      {
        company: 'Chime',
        stage_when_raised: 'building',
        key_differentiator: 'No-fee banking for underserved, viral growth through referrals',
        outcome: 'Raised $485M Series D at $5.8B, 13M+ users'
      },
      {
        company: 'Brex',
        stage_when_raised: 'validation',
        key_differentiator: 'Solved underwriting for startups (previous founders, understood pain)',
        outcome: 'YC W17, raised $57M seed/A in 9 months, $12.3B valuation'
      }
    ]
  },

  'Healthcare': {
    name: 'Healthcare / HealthTech',
    description: 'Technology solutions for healthcare delivery and outcomes',
    avg_funding_timeline: '6-12 months (clinical validation + regulatory)',
    capital_intensity: 'High',
    benchmarks: {
      ideation: {
        typical_traction: 'Clinical advisory board, pilot hospital partnerships',
        typical_runway_months: '12-18 months',
        typical_team_size: '2-4 founders (clinical + tech)',
        typical_funding_raised: '$100K-300K (grants/angels)',
        avg_time_to_raise: '4-6 months',
        success_rate: '~5-8%',
        key_metrics: ['Clinical advisors', 'Hospital LOIs', 'HIPAA compliance', 'IRB approvals']
      },
      validation: {
        typical_traction: '1-3 pilot hospitals, 100-1000 patient interactions',
        typical_runway_months: '15-24 months',
        typical_team_size: '5-10 people (clinical, eng, regulatory)',
        typical_funding_raised: '$1M-3M (seed)',
        avg_time_to_raise: '6-9 months',
        success_rate: '~10-15%',
        key_metrics: ['Patient outcomes', 'Clinical efficacy data', 'Provider adoption', 'Reimbursement pathway']
      },
      building: {
        typical_traction: '5-15 healthcare systems, clinical evidence published',
        typical_runway_months: '18-30 months',
        typical_team_size: '15-30 people',
        typical_funding_raised: '$5M-15M (Series A)',
        avg_time_to_raise: '8-12 months',
        success_rate: '~15-25%',
        key_metrics: ['ARR from health systems', 'Clinical outcomes improvement', 'FDA/regulatory milestones']
      },
      launching: {
        typical_traction: '$3M-10M ARR, 20+ health systems, proven ROI',
        typical_runway_months: '24-36 months',
        typical_team_size: '40-80 people',
        typical_funding_raised: '$20M-50M (Series B)',
        avg_time_to_raise: '10-15 months',
        success_rate: '~20-30%',
        key_metrics: ['ARR', 'Net retention', 'Clinical evidence ROI', 'Payor contracts']
      },
      scaling: {
        typical_traction: '$20M-50M ARR, national scale, health outcomes proven',
        typical_runway_months: '30-48 months',
        typical_team_size: '100-250 people',
        typical_funding_raised: '$75M-200M (Series C+)',
        avg_time_to_raise: '12-18 months',
        success_rate: '~25-35%',
        key_metrics: ['Market penetration', 'Clinical outcomes at scale', 'Path to profitability']
      }
    },
    success_stories: [
      {
        company: 'Oscar Health',
        stage_when_raised: 'building',
        key_differentiator: 'Tech-enabled health insurance, strong founding team (ex-Microsoft, Bridgewater)',
        outcome: 'Raised $165M Series B, went public at $7.9B valuation'
      },
      {
        company: 'Ro (Roman)',
        stage_when_raised: 'validation',
        key_differentiator: 'Telehealth for sensitive conditions, direct-to-consumer model',
        outcome: 'Raised $88M Series A, $5B valuation, profitability'
      },
      {
        company: 'Sword Health',
        stage_when_raised: 'building',
        key_differentiator: 'Clinical evidence of better outcomes vs in-person PT, 70% cost reduction',
        outcome: 'Raised $163M Series C at $2B valuation, >$100M ARR'
      }
    ]
  },

  'E-commerce': {
    name: 'E-commerce / DTC',
    description: 'Direct-to-consumer brands and marketplace platforms',
    avg_funding_timeline: '2-4 months (faster with traction)',
    capital_intensity: 'Medium',
    benchmarks: {
      ideation: {
        typical_traction: 'Landing page, 100-500 email signups, supplier relationships',
        typical_runway_months: '6-9 months',
        typical_team_size: '1-2 founders',
        typical_funding_raised: '$0-100K (bootstrapped/friends&family)',
        avg_time_to_raise: '2-3 months',
        success_rate: '~10-15% (most bootstrap initially)',
        key_metrics: ['Email signups', 'Landing page conversion', 'Sample products', 'Unit economics model']
      },
      validation: {
        typical_traction: '$10K-50K revenue/month, 50-200 orders, positive unit econ',
        typical_runway_months: '9-15 months',
        typical_team_size: '2-4 people',
        typical_funding_raised: '$100K-500K (angels/pre-seed)',
        avg_time_to_raise: '2-4 months',
        success_rate: '~20-25%',
        key_metrics: ['Revenue', 'AOV', 'CAC', 'LTV:CAC ratio (target 3:1)', 'Repeat purchase rate']
      },
      building: {
        typical_traction: '$100K-500K revenue/month, 30%+ repeat rate',
        typical_runway_months: '12-18 months',
        typical_team_size: '5-12 people',
        typical_funding_raised: '$1M-5M (seed/Series A)',
        avg_time_to_raise: '3-6 months',
        success_rate: '~25-30%',
        key_metrics: ['Revenue growth', 'Contribution margin', 'CAC payback <6mo', 'Organic %', 'Brand strength']
      },
      launching: {
        typical_traction: '$1M-5M revenue/month, multichannel (owned + retail)',
        typical_runway_months: '15-24 months',
        typical_team_size: '15-40 people',
        typical_funding_raised: '$10M-30M (Series B)',
        avg_time_to_raise: '5-8 months',
        success_rate: '~30-35%',
        key_metrics: ['Revenue', 'EBITDA margin', 'Omnichannel strategy', 'Brand equity', 'Customer cohorts']
      },
      scaling: {
        typical_traction: '$10M-50M revenue/month, profitable unit economics',
        typical_runway_months: '18-30 months',
        typical_team_size: '50-150 people',
        typical_funding_raised: '$50M-150M (Series C+)',
        avg_time_to_raise: '6-10 months',
        success_rate: '~35-45%',
        key_metrics: ['Revenue at scale', 'EBITDA', 'International expansion', 'Exit multiples']
      }
    },
    success_stories: [
      {
        company: 'Allbirds',
        stage_when_raised: 'validation',
        key_differentiator: 'Sustainable materials, celebrity co-founder (pro soccer player), viral product',
        outcome: 'Raised $7.5M seed with $3M revenue, went public at $4.1B'
      },
      {
        company: 'Glossier',
        stage_when_raised: 'validation',
        key_differentiator: 'Community-first brand (500K Into the Gloss readers), authentic founder',
        outcome: 'Raised $2M seed, built to $1.8B valuation through community'
      },
      {
        company: 'Warby Parker',
        stage_when_raised: 'building',
        key_differentiator: 'Vertical integration, try-at-home model disrupted industry',
        outcome: 'Raised $41M Series A, went public at $6B valuation'
      }
    ]
  },

  'Marketplace': {
    name: 'Marketplace',
    description: 'Two-sided platforms connecting buyers and sellers',
    avg_funding_timeline: '4-7 months (cold start problem)',
    capital_intensity: 'Medium',
    benchmarks: {
      ideation: {
        typical_traction: '50-200 supply-side signups, 100-500 demand-side interest',
        typical_runway_months: '9-12 months',
        typical_team_size: '2-3 founders',
        typical_funding_raised: '$50K-200K (friends/family)',
        avg_time_to_raise: '3-5 months',
        success_rate: '~5-10% (cold start is hard)',
        key_metrics: ['Supply signups', 'Demand interest', 'First transactions', 'Geographic density']
      },
      validation: {
        typical_traction: '$10K-100K GMV/month, solving cold start in 1-2 markets',
        typical_runway_months: '12-18 months',
        typical_team_size: '4-8 people (ops-heavy)',
        typical_funding_raised: '$500K-2M (seed)',
        avg_time_to_raise: '4-6 months',
        success_rate: '~15-20%',
        key_metrics: ['GMV', 'Take rate', 'Liquidity (% of supply with transactions)', 'Market concentration']
      },
      building: {
        typical_traction: '$200K-1M GMV/month, proven in 3-5 markets, 30%+ repeat',
        typical_runway_months: '15-24 months',
        typical_team_size: '12-25 people',
        typical_funding_raised: '$5M-15M (Series A)',
        avg_time_to_raise: '5-8 months',
        success_rate: '~20-30%',
        key_metrics: ['GMV growth', 'NPS', 'Supply/demand balance', 'Retention cohorts', 'Unit economics']
      },
      launching: {
        typical_traction: '$3M-10M GMV/month, national coverage, network effects kicking in',
        typical_runway_months: '18-30 months',
        typical_team_size: '30-80 people',
        typical_funding_raised: '$20M-60M (Series B)',
        avg_time_to_raise: '6-10 months',
        success_rate: '~25-35%',
        key_metrics: ['GMV at scale', 'Revenue (take rate * GMV)', 'CAC payback', 'Defensibility']
      },
      scaling: {
        typical_traction: '$20M-100M GMV/month, dominant in category',
        typical_runway_months: '24-36 months',
        typical_team_size: '100-300 people',
        typical_funding_raised: '$75M-250M (Series C+)',
        avg_time_to_raise: '8-12 months',
        success_rate: '~30-40%',
        key_metrics: ['Market share', 'Network effects strength', 'International', 'Path to profitability']
      }
    },
    success_stories: [
      {
        company: 'Airbnb',
        stage_when_raised: 'validation',
        key_differentiator: 'Solved cold start with events (SXSW, DNC), founders photographed listings',
        outcome: 'YC W09, raised $600K seed, now $75B+ valuation'
      },
      {
        company: 'DoorDash',
        stage_when_raised: 'validation',
        key_differentiator: 'Focused on suburbs (avoided Uber/Postmates), founder-delivered initially',
        outcome: 'Raised $2.4M seed, went public at $72B valuation'
      },
      {
        company: 'Faire',
        stage_when_raised: 'building',
        key_differentiator: 'Wholesale marketplace for boutiques, net-60 payment terms (solved pain)',
        outcome: 'Raised $26M Series A, $12.6B valuation in 5 years'
      }
    ]
  },

  // Additional industries with abbreviated benchmarks
  'AI/ML': {
    name: 'AI/ML',
    description: 'Artificial intelligence and machine learning products',
    avg_funding_timeline: '3-6 months (hot market)',
    capital_intensity: 'Medium',
    benchmarks: {
      ideation: {
        typical_traction: 'Working prototype, technical paper/demo, 10-50 beta users',
        typical_runway_months: '9-12 months',
        typical_team_size: '2-4 (PhDs/research engineers)',
        typical_funding_raised: '$200K-800K (pre-seed)',
        avg_time_to_raise: '2-4 months',
        success_rate: '~15-25% (technical talent premium)',
        key_metrics: ['Model accuracy', 'Demo engagement', 'Technical talent', 'Unique dataset/approach']
      },
      validation: {
        typical_traction: '50-500 users, API calls, paying pilots',
        typical_runway_months: '12-18 months',
        typical_team_size: '5-10 people',
        typical_funding_raised: '$2M-8M (seed)',
        avg_time_to_raise: '3-5 months',
        success_rate: '~25-35%',
        key_metrics: ['API usage', 'Accuracy improvements', 'Enterprise pilots', 'ARR']
      },
      building: {
        typical_traction: '$500K-3M ARR, enterprise contracts',
        typical_runway_months: '15-24 months',
        typical_team_size: '15-35 people',
        typical_funding_raised: '$10M-40M (Series A)',
        avg_time_to_raise: '4-7 months',
        success_rate: '~30-40%',
        key_metrics: ['ARR', 'Model performance', 'Enterprise logos', 'Moat (data/research)']
      },
      launching: {
        typical_traction: '$5M-20M ARR, clear category leader',
        typical_runway_months: '18-30 months',
        typical_team_size: '40-100 people',
        typical_funding_raised: '$50M-150M (Series B)',
        avg_time_to_raise: '5-9 months',
        success_rate: '~35-45%',
        key_metrics: ['Revenue growth', 'Net retention', 'Research breakthroughs', 'Market position']
      },
      scaling: {
        typical_traction: '$30M-100M ARR, dominant position',
        typical_runway_months: '24-36 months',
        typical_team_size: '150-500 people',
        typical_funding_raised: '$200M-500M (Series C+)',
        avg_time_to_raise: '6-12 months',
        success_rate: '~40-50%',
        key_metrics: ['Scale metrics', 'Market dominance', 'Strategic acquisitions']
      }
    },
    success_stories: [
      {
        company: 'Scale AI',
        stage_when_raised: 'validation',
        key_differentiator: 'Solved critical pain (data labeling), defended with quality + tooling',
        outcome: 'YC S16, raised $18.5M seed/A, now $7.3B valuation'
      },
      {
        company: 'Hugging Face',
        stage_when_raised: 'building',
        key_differentiator: 'Open-source community (100K+ models), GitHub for AI',
        outcome: 'Raised $40M Series B at $2B valuation, 1M+ users'
      },
      {
        company: 'Anthropic',
        stage_when_raised: 'ideation',
        key_differentiator: 'World-class founding team (ex-OpenAI researchers), safety focus',
        outcome: 'Raised $580M Series A/B, $15B+ valuation (Google/Spark)'
      }
    ]
  }
};

/**
 * Get benchmark data for a specific industry and stage
 */
export function getBenchmark(industry: string, stage: FounderStage): StageBenchmark | null {
  const industryData = INDUSTRY_BENCHMARKS[industry];
  if (!industryData) return null;
  return industryData.benchmarks[stage] || null;
}

/**
 * Get success stories for an industry
 */
export function getSuccessStories(industry: string): IndustryBenchmark['success_stories'] {
  const industryData = INDUSTRY_BENCHMARKS[industry];
  return industryData?.success_stories || [];
}

/**
 * Get similar company based on stage
 */
export function getSimilarCompany(industry: string, stage: FounderStage) {
  const stories = getSuccessStories(industry);
  return stories.find(s => s.stage_when_raised === stage) || stories[0] || null;
}
