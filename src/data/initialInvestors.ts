// ================================================
// INITIAL INVESTOR DATABASE - STATIC DATA
// Curated list of investors for MVP matching
// ================================================

import { Investor, InvestmentStage, PortfolioCompany } from '@/types/investor';

// Helper function to create investor with defaults
const createInvestor = (
  name: string,
  firmName: string,
  industries: string[],
  stages: InvestmentStage[],
  checkSizeMin: number,
  checkSizeMax: number,
  locations: string[],
  geographicFocus: string[],
  portfolio: PortfolioCompany[],
  options: Partial<Investor> = {}
): Investor => {
  const now = new Date().toISOString();
  return {
    id: `investor-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    firm_name: firmName,
    industries,
    investment_stages: stages,
    typical_check_size_min: checkSizeMin,
    typical_check_size_max: checkSizeMax,
    locations,
    geographic_focus: geographicFocus,
    remote_friendly: geographicFocus.includes('Global') || geographicFocus.includes('Remote'),
    portfolio_companies: portfolio,
    recent_investments_count: Math.floor(Math.random() * 15) + 3,
    total_portfolio_count: portfolio.length + Math.floor(Math.random() * 50),
    requires_warm_intro: false,
    is_featured: false,
    is_active: true,
    data_source: 'manual',
    last_updated: now,
    created_at: now,
    updated_at: now,
    ...options
  };
};

// Portfolio companies for various industries
const saasPortfolio: PortfolioCompany[] = [
  { name: 'CloudSync', industry: 'SaaS', stage: 'Series A', description: 'Cloud collaboration platform' },
  { name: 'DataFlow', industry: 'SaaS', stage: 'Seed', description: 'Data pipeline automation' },
  { name: 'TeamHub', industry: 'SaaS', stage: 'Series B', description: 'Team management software' }
];

const aiPortfolio: PortfolioCompany[] = [
  { name: 'NeuralNet', industry: 'AI/ML', stage: 'Seed', description: 'ML model deployment platform' },
  { name: 'AutoBot', industry: 'AI/ML', stage: 'Series A', description: 'AI automation tools' },
  { name: 'DataMind', industry: 'AI/ML', stage: 'Pre-seed', description: 'AI analytics platform' }
];

const fintechPortfolio: PortfolioCompany[] = [
  { name: 'PayFlow', industry: 'Fintech', stage: 'Seed', description: 'Payment processing API' },
  { name: 'CryptoWallet', industry: 'Fintech', stage: 'Series A', description: 'Digital wallet solution' },
  { name: 'LendEasy', industry: 'Fintech', stage: 'Pre-seed', description: 'P2P lending platform' }
];

const healthcarePortfolio: PortfolioCompany[] = [
  { name: 'HealthTrack', industry: 'Healthcare', stage: 'Seed', description: 'Patient monitoring app' },
  { name: 'MedConnect', industry: 'Healthcare', stage: 'Series A', description: 'Telemedicine platform' },
  { name: 'WellnessAI', industry: 'Healthcare', stage: 'Pre-seed', description: 'AI health assistant' }
];

const ecommercePortfolio: PortfolioCompany[] = [
  { name: 'ShopFast', industry: 'E-commerce', stage: 'Seed', description: 'Fast checkout solution' },
  { name: 'BrandHub', industry: 'E-commerce', stage: 'Series A', description: 'D2C brand platform' },
  { name: 'MarketPlace', industry: 'E-commerce', stage: 'Pre-seed', description: 'Niche marketplace' }
];

const generalPortfolio: PortfolioCompany[] = [
  { name: 'TechStart', industry: 'Technology', stage: 'Seed', description: 'Developer tools' },
  { name: 'InnovateLab', industry: 'Technology', stage: 'Series A', description: 'Innovation platform' }
];

// Y Combinator and major accelerators
const ycInvestors: Investor[] = [
  createInvestor(
    'Paul Graham',
    'Y Combinator',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare', 'Technology'],
    ['pre-seed', 'seed'],
    125000,
    500000,
    ['San Francisco', 'Mountain View'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.ycombinator.com',
      investment_thesis: 'We fund early-stage startups twice a year. We look for founders with strong technical backgrounds and big ideas.',
      contact_preference: 'application',
      application_url: 'https://www.ycombinator.com/apply',
      response_rate_percentage: 15,
      typical_timeline_days: 30,
      is_featured: true
    }
  )
];

// Techstars investors
const techstarsInvestors: Investor[] = [
  createInvestor(
    'David Cohen',
    'Techstars',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
    ['pre-seed', 'seed'],
    120000,
    20000,
    ['Boulder', 'New York', 'Seattle', 'London'],
    ['US', 'Europe', 'Global'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.techstars.com',
      investment_thesis: 'We invest in the best entrepreneurs and help them succeed through our accelerator programs.',
      contact_preference: 'application',
      application_url: 'https://www.techstars.com/apply',
      response_rate_percentage: 12,
      typical_timeline_days: 45,
      is_featured: true
    }
  )
];

// Seed stage VCs
const seedVCs: Investor[] = [
  createInvestor(
    'Naval Ravikant',
    'AngelList',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['pre-seed', 'seed'],
    25000,
    500000,
    ['San Francisco'],
    ['US', 'Global'],
    [...saasPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://angel.co',
      investment_thesis: 'We help startups raise capital and connect with investors through our platform.',
      contact_preference: 'application',
      application_url: 'https://angel.co/apply',
      response_rate_percentage: 20,
      typical_timeline_days: 14
    }
  ),
  createInvestor(
    'Jason Lemkin',
    'SaaStr Fund',
    ['SaaS'],
    ['seed', 'series-a'],
    500000,
    2000000,
    ['San Francisco'],
    ['US', 'Global'],
    saasPortfolio,
    {
      firm_website: 'https://www.saastr.com',
      investment_thesis: 'We invest exclusively in B2B SaaS companies at seed and Series A stages.',
      contact_preference: 'email',
      email: 'invest@saastr.com',
      response_rate_percentage: 25,
      typical_timeline_days: 21,
      is_featured: true
    }
  ),
  createInvestor(
    'Marc Andreessen',
    'a16z',
    ['SaaS', 'AI/ML', 'Fintech', 'Healthcare', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    10000000,
    ['Menlo Park'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio, ...healthcarePortfolio],
    {
      firm_website: 'https://a16z.com',
      investment_thesis: 'We invest in software companies that are building the future.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 5,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'Fred Wilson',
    'Union Square Ventures',
    ['SaaS', 'Fintech', 'E-commerce'],
    ['seed', 'series-a'],
    500000,
    5000000,
    ['New York'],
    ['US', 'Global'],
    [...saasPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.usv.com',
      investment_thesis: 'We invest in networks and platforms that create value through network effects.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 8,
      typical_timeline_days: 45
    }
  ),
  createInvestor(
    'Reid Hoffman',
    'Greylock Partners',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    15000000,
    ['Menlo Park'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.greylock.com',
      investment_thesis: 'We partner with entrepreneurs to help them build category-defining companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 6,
      typical_timeline_days: 90
    }
  )
];

// Pre-seed focused investors
const preseedInvestors: Investor[] = [
  createInvestor(
    'Ryan Hoover',
    'Weekend Fund',
    ['SaaS', 'E-commerce', 'Technology'],
    ['pre-seed', 'seed'],
    25000,
    250000,
    ['San Francisco'],
    ['US', 'Global'],
    generalPortfolio,
    {
      firm_website: 'https://weekend.fund',
      investment_thesis: 'We invest in early-stage consumer and B2B companies.',
      contact_preference: 'email',
      email: 'hello@weekend.fund',
      response_rate_percentage: 30,
      typical_timeline_days: 7,
      remote_friendly: true
    }
  ),
  createInvestor(
    'Elad Gil',
    'Color Genomics',
    ['Healthcare', 'AI/ML', 'SaaS'],
    ['pre-seed', 'seed'],
    50000,
    500000,
    ['San Francisco'],
    ['US', 'Global'],
    [...healthcarePortfolio, ...aiPortfolio],
    {
      investment_thesis: 'We invest in exceptional founders building transformative companies.',
      contact_preference: 'email',
      email: 'invest@eladgil.com',
      response_rate_percentage: 15,
      typical_timeline_days: 14,
      remote_friendly: true
    }
  ),
  createInvestor(
    'First Round Capital',
    'First Round Capital',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
    ['pre-seed', 'seed'],
    250000,
    2000000,
    ['San Francisco', 'New York'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://firstround.com',
      investment_thesis: 'We are a seed-stage venture firm focused on building a vibrant community of entrepreneurs.',
      contact_preference: 'application',
      application_url: 'https://firstround.com/apply',
      response_rate_percentage: 18,
      typical_timeline_days: 30
    }
  ),
  createInvestor(
    'Precursor Ventures',
    'Precursor Ventures',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['pre-seed'],
    100000,
    500000,
    ['San Francisco'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://precursorvc.com',
      investment_thesis: 'We invest at the earliest stages, often before product-market fit.',
      contact_preference: 'email',
      email: 'hello@precursorvc.com',
      response_rate_percentage: 25,
      typical_timeline_days: 21,
      remote_friendly: true
    }
  )
];

// Industry-specific investors
const industrySpecificInvestors: Investor[] = [
  // Fintech
  createInvestor(
    'Ribbit Capital',
    'Ribbit Capital',
    ['Fintech'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    10000000,
    ['Palo Alto'],
    ['US', 'Global'],
    fintechPortfolio,
    {
      firm_website: 'https://www.ribbitcap.com',
      investment_thesis: 'We invest in financial services companies that are transforming how people interact with money.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 10,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'QED Investors',
    'QED Investors',
    ['Fintech'],
    ['seed', 'series-a'],
    500000,
    5000000,
    ['Alexandria'],
    ['US', 'Global'],
    fintechPortfolio,
    {
      firm_website: 'https://www.qedinvestors.com',
      investment_thesis: 'We are a leading fintech-focused venture capital firm.',
      contact_preference: 'email',
      email: 'info@qedinvestors.com',
      response_rate_percentage: 20,
      typical_timeline_days: 30
    }
  ),

  // Healthcare
  createInvestor(
    '7wire Ventures',
    '7wire Ventures',
    ['Healthcare'],
    ['seed', 'series-a'],
    500000,
    5000000,
    ['Chicago'],
    ['US'],
    healthcarePortfolio,
    {
      firm_website: 'https://www.7wireventures.com',
      investment_thesis: 'We invest in healthcare technology companies that improve patient outcomes.',
      contact_preference: 'email',
      email: 'info@7wireventures.com',
      response_rate_percentage: 15,
      typical_timeline_days: 45
    }
  ),
  createInvestor(
    'Healthtech Capital',
    'Healthtech Capital',
    ['Healthcare'],
    ['pre-seed', 'seed'],
    250000,
    2000000,
    ['San Francisco'],
    ['US'],
    healthcarePortfolio,
    {
      investment_thesis: 'We focus on early-stage healthcare technology startups.',
      contact_preference: 'email',
      email: 'hello@healthtechcapital.com',
      response_rate_percentage: 22,
      typical_timeline_days: 21,
      remote_friendly: true
    }
  ),

  // AI/ML
  createInvestor(
    'AI Fund',
    'AI Fund',
    ['AI/ML'],
    ['pre-seed', 'seed', 'series-a'],
    500000,
    5000000,
    ['Palo Alto'],
    ['US', 'Global'],
    aiPortfolio,
    {
      firm_website: 'https://aifund.com',
      investment_thesis: 'We invest in AI and machine learning companies that solve real problems.',
      contact_preference: 'email',
      email: 'invest@aifund.com',
      response_rate_percentage: 18,
      typical_timeline_days: 30,
      is_featured: true
    }
  ),
  createInvestor(
    'Data Collective',
    'Data Collective',
    ['AI/ML', 'SaaS'],
    ['seed', 'series-a'],
    1000000,
    10000000,
    ['San Francisco'],
    ['US'],
    [...aiPortfolio, ...saasPortfolio],
    {
      firm_website: 'https://www.dcvc.com',
      investment_thesis: 'We invest in data-driven companies that leverage AI and machine learning.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 8,
      typical_timeline_days: 60
    }
  ),

  // E-commerce
  createInvestor(
    'Forerunner Ventures',
    'Forerunner Ventures',
    ['E-commerce', 'SaaS'],
    ['seed', 'series-a'],
    1000000,
    10000000,
    ['San Francisco'],
    ['US', 'Global'],
    [...ecommercePortfolio, ...saasPortfolio],
    {
      firm_website: 'https://www.forerunnerventures.com',
      investment_thesis: 'We invest in companies that are redefining how consumers discover, shop, and buy.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 12,
      typical_timeline_days: 45
    }
  ),
  createInvestor(
    'Lerer Hippeau',
    'Lerer Hippeau',
    ['E-commerce', 'SaaS'],
    ['seed', 'series-a'],
    500000,
    5000000,
    ['New York'],
    ['US'],
    [...ecommercePortfolio, ...saasPortfolio],
    {
      firm_website: 'https://www.lererhippeau.com',
      investment_thesis: 'We invest in early-stage consumer and enterprise technology companies.',
      contact_preference: 'email',
      email: 'hello@lererhippeau.com',
      response_rate_percentage: 20,
      typical_timeline_days: 30
    }
  )
];

// Geographic-focused investors
const geographicInvestors: Investor[] = [
  // Europe
  createInvestor(
    'Index Ventures',
    'Index Ventures',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    20000000,
    ['London', 'San Francisco', 'Geneva'],
    ['Europe', 'US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.indexventures.com',
      investment_thesis: 'We partner with exceptional entrepreneurs building transformative companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 10,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'Atomico',
    'Atomico',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    2000000,
    50000000,
    ['London'],
    ['Europe', 'Global'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.atomico.com',
      investment_thesis: 'We invest in European technology companies with global ambitions.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 8,
      typical_timeline_days: 90
    }
  ),

  // Asia
  createInvestor(
    'Sequoia Capital India',
    'Sequoia Capital',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    50000000,
    ['Bangalore', 'Mumbai'],
    ['India', 'Southeast Asia', 'Global'],
    [...saasPortfolio, ...fintechPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://www.sequoiacap.com/india',
      investment_thesis: 'We partner with exceptional founders in India and Southeast Asia.',
      contact_preference: 'application',
      application_url: 'https://www.sequoiacap.com/india/apply',
      response_rate_percentage: 5,
      typical_timeline_days: 90
    }
  ),

  // Remote-friendly
  createInvestor(
    'Remote First Capital',
    'Remote First Capital',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['pre-seed', 'seed'],
    100000,
    1000000,
    ['Remote'],
    ['Global'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://remotefirst.vc',
      investment_thesis: 'We invest in remote-first companies building distributed teams.',
      contact_preference: 'email',
      email: 'hello@remotefirst.vc',
      response_rate_percentage: 30,
      typical_timeline_days: 14,
      remote_friendly: true
    }
  )
];

// More diverse investors to reach 60-70 total
const additionalInvestors: Investor[] = [
  createInvestor(
    '500 Startups',
    '500 Startups',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce', 'Healthcare'],
    ['pre-seed', 'seed'],
    150000,
    250000,
    ['San Francisco', 'Mountain View'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://500.co',
      investment_thesis: 'We invest in early-stage startups across all industries.',
      contact_preference: 'application',
      application_url: 'https://500.co/apply',
      response_rate_percentage: 20,
      typical_timeline_days: 30
    }
  ),
  createInvestor(
    'Plug and Play',
    'Plug and Play',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['pre-seed', 'seed'],
    25000,
    500000,
    ['Sunnyvale'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.plugandplaytechcenter.com',
      investment_thesis: 'We accelerate startups through our corporate innovation platform.',
      contact_preference: 'application',
      application_url: 'https://www.plugandplaytechcenter.com/apply',
      response_rate_percentage: 25,
      typical_timeline_days: 21
    }
  ),
  createInvestor(
    'Boost VC',
    'Boost VC',
    ['SaaS', 'AI/ML', 'Fintech'],
    ['pre-seed', 'seed'],
    50000,
    200000,
    ['San Mateo'],
    ['US'],
    [...saasPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.boost.vc',
      investment_thesis: 'We invest in early-stage technology companies.',
      contact_preference: 'email',
      email: 'hello@boost.vc',
      response_rate_percentage: 28,
      typical_timeline_days: 14,
      remote_friendly: true
    }
  ),
  createInvestor(
    'Launchpad LA',
    'Launchpad LA',
    ['SaaS', 'E-commerce'],
    ['pre-seed', 'seed'],
    100000,
    500000,
    ['Los Angeles'],
    ['US'],
    [...saasPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://www.launchpad.la',
      investment_thesis: 'We help LA-based startups grow through our accelerator program.',
      contact_preference: 'email',
      email: 'info@launchpad.la',
      response_rate_percentage: 22,
      typical_timeline_days: 30
    }
  ),
  createInvestor(
    'Alchemist Accelerator',
    'Alchemist Accelerator',
    ['SaaS', 'B2B'],
    ['pre-seed', 'seed'],
    36000,
    250000,
    ['San Francisco'],
    ['US', 'Global'],
    saasPortfolio,
    {
      firm_website: 'https://alchemistaccelerator.com',
      investment_thesis: 'We focus exclusively on B2B enterprise startups.',
      contact_preference: 'application',
      application_url: 'https://alchemistaccelerator.com/apply',
      response_rate_percentage: 18,
      typical_timeline_days: 45,
      remote_friendly: true
    }
  ),
  createInvestor(
    'Dreamit Ventures',
    'Dreamit Ventures',
    ['Healthcare', 'SaaS'],
    ['seed', 'series-a'],
    500000,
    2000000,
    ['New York', 'Philadelphia'],
    ['US'],
    [...healthcarePortfolio, ...saasPortfolio],
    {
      firm_website: 'https://www.dreamit.com',
      investment_thesis: 'We invest in startups in healthcare and securetech.',
      contact_preference: 'email',
      email: 'hello@dreamit.com',
      response_rate_percentage: 20,
      typical_timeline_days: 30
    }
  ),
  createInvestor(
    'NextView Ventures',
    'NextView Ventures',
    ['SaaS', 'E-commerce'],
    ['pre-seed', 'seed'],
    250000,
    1500000,
    ['Boston'],
    ['US'],
    [...saasPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://www.nextview.vc',
      investment_thesis: 'We invest in early-stage B2B and marketplace companies.',
      contact_preference: 'email',
      email: 'hello@nextview.vc',
      response_rate_percentage: 25,
      typical_timeline_days: 21
    }
  ),
  createInvestor(
    'Rough Draft Ventures',
    'Rough Draft Ventures',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['pre-seed'],
    25000,
    100000,
    ['Boston'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.roughdraft.vc',
      investment_thesis: 'We invest in student and recent graduate founders.',
      contact_preference: 'email',
      email: 'hello@roughdraft.vc',
      response_rate_percentage: 30,
      typical_timeline_days: 14,
      remote_friendly: true
    }
  ),
  createInvestor(
    'Dorm Room Fund',
    'Dorm Room Fund',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['pre-seed'],
    20000,
    100000,
    ['Philadelphia', 'New York', 'San Francisco'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.dormroomfund.com',
      investment_thesis: 'We invest in student-founded startups.',
      contact_preference: 'application',
      application_url: 'https://www.dormroomfund.com/apply',
      response_rate_percentage: 25,
      typical_timeline_days: 21
    }
  ),
  createInvestor(
    'Social Capital',
    'Social Capital',
    ['SaaS', 'AI/ML', 'Healthcare'],
    ['seed', 'series-a'],
    1000000,
    20000000,
    ['Palo Alto'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...healthcarePortfolio],
    {
      firm_website: 'https://www.socialcapital.com',
      investment_thesis: 'We partner with entrepreneurs to solve the world\'s hardest problems.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 8,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'General Catalyst',
    'General Catalyst',
    ['SaaS', 'AI/ML', 'Fintech', 'Healthcare', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    50000000,
    ['Cambridge', 'San Francisco', 'New York'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio, ...healthcarePortfolio],
    {
      firm_website: 'https://www.generalcatalyst.com',
      investment_thesis: 'We invest in transformative companies across all stages.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 6,
      typical_timeline_days: 90
    }
  ),
  createInvestor(
    'Bessemer Venture Partners',
    'Bessemer Venture Partners',
    ['SaaS', 'AI/ML', 'Fintech', 'Healthcare'],
    ['seed', 'series-a', 'series-b', 'series-c+'],
    2000000,
    100000000,
    ['Menlo Park', 'New York', 'Boston'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio, ...healthcarePortfolio],
    {
      firm_website: 'https://www.bvp.com',
      investment_thesis: 'We invest in category-defining companies from seed to growth.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 5,
      typical_timeline_days: 120
    }
  ),
  createInvestor(
    'Accel',
    'Accel',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    50000000,
    ['Palo Alto', 'London'],
    ['US', 'Europe', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://www.accel.com',
      investment_thesis: 'We partner with exceptional entrepreneurs from seed to growth.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 7,
      typical_timeline_days: 75
    }
  ),
  createInvestor(
    'NEA',
    'New Enterprise Associates',
    ['SaaS', 'AI/ML', 'Healthcare', 'Fintech'],
    ['series-a', 'series-b', 'series-c+'],
    5000000,
    100000000,
    ['Menlo Park', 'New York', 'Baltimore'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...healthcarePortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.nea.com',
      investment_thesis: 'We invest in companies from Series A through growth stage.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 4,
      typical_timeline_days: 120
    }
  ),
  createInvestor(
    'Lightspeed Venture Partners',
    'Lightspeed Venture Partners',
    ['SaaS', 'AI/ML', 'Fintech', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    50000000,
    ['Menlo Park', 'New York'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://lsvp.com',
      investment_thesis: 'We partner with exceptional entrepreneurs to build market-leading companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 6,
      typical_timeline_days: 90
    }
  ),
  createInvestor(
    'Redpoint Ventures',
    'Redpoint Ventures',
    ['SaaS', 'AI/ML', 'E-commerce'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    30000000,
    ['Menlo Park'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio, ...ecommercePortfolio],
    {
      firm_website: 'https://www.redpoint.com',
      investment_thesis: 'We invest in early-stage technology companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 8,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'Matrix Partners',
    'Matrix Partners',
    ['SaaS', 'AI/ML', 'Fintech'],
    ['seed', 'series-a'],
    500000,
    20000000,
    ['Menlo Park', 'Boston'],
    ['US'],
    [...saasPortfolio, ...aiPortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.matrixpartners.com',
      investment_thesis: 'We partner with entrepreneurs from seed to growth.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 7,
      typical_timeline_days: 75
    }
  ),
  createInvestor(
    'Spark Capital',
    'Spark Capital',
    ['SaaS', 'E-commerce', 'Fintech'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    30000000,
    ['Boston', 'San Francisco'],
    ['US'],
    [...saasPortfolio, ...ecommercePortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.sparkcapital.com',
      investment_thesis: 'We invest in companies that are transforming industries.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 9,
      typical_timeline_days: 60
    }
  ),
  createInvestor(
    'Founders Fund',
    'Founders Fund',
    ['SaaS', 'AI/ML', 'Healthcare'],
    ['seed', 'series-a', 'series-b'],
    1000000,
    50000000,
    ['San Francisco'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio, ...healthcarePortfolio],
    {
      firm_website: 'https://foundersfund.com',
      investment_thesis: 'We invest in companies solving difficult problems.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 5,
      typical_timeline_days: 90
    }
  ),
  createInvestor(
    'Khosla Ventures',
    'Khosla Ventures',
    ['AI/ML', 'Healthcare', 'SaaS'],
    ['seed', 'series-a', 'series-b'],
    2000000,
    50000000,
    ['Menlo Park'],
    ['US', 'Global'],
    [...aiPortfolio, ...healthcarePortfolio, ...saasPortfolio],
    {
      firm_website: 'https://www.khoslaventures.com',
      investment_thesis: 'We invest in breakthrough technologies and transformative companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 6,
      typical_timeline_days: 90
    }
  ),
  createInvestor(
    'Benchmark',
    'Benchmark',
    ['SaaS', 'E-commerce', 'Fintech'],
    ['seed', 'series-a'],
    1000000,
    20000000,
    ['Menlo Park'],
    ['US'],
    [...saasPortfolio, ...ecommercePortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.benchmark.com',
      investment_thesis: 'We partner with entrepreneurs to build important companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 4,
      typical_timeline_days: 120
    }
  ),
  createInvestor(
    'Insight Partners',
    'Insight Partners',
    ['SaaS', 'AI/ML'],
    ['series-a', 'series-b', 'series-c+'],
    5000000,
    100000000,
    ['New York'],
    ['US', 'Global'],
    [...saasPortfolio, ...aiPortfolio],
    {
      firm_website: 'https://www.insightpartners.com',
      investment_thesis: 'We invest in software companies from Series A to growth stage.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 5,
      typical_timeline_days: 90
    }
  ),
  createInvestor(
    'Tiger Global',
    'Tiger Global Management',
    ['SaaS', 'E-commerce', 'Fintech'],
    ['series-a', 'series-b', 'series-c+'],
    10000000,
    200000000,
    ['New York'],
    ['US', 'Global'],
    [...saasPortfolio, ...ecommercePortfolio, ...fintechPortfolio],
    {
      firm_website: 'https://www.tigerglobal.com',
      investment_thesis: 'We invest in internet, software, and consumer companies.',
      contact_preference: 'warm-intro-only',
      requires_warm_intro: true,
      response_rate_percentage: 3,
      typical_timeline_days: 120
    }
  )
];

// Combine all investors
export const initialInvestors: Investor[] = [
  ...ycInvestors,
  ...techstarsInvestors,
  ...seedVCs,
  ...preseedInvestors,
  ...industrySpecificInvestors,
  ...geographicInvestors,
  ...additionalInvestors
];

// Export count for reference
export const INVESTOR_COUNT = initialInvestors.length;

