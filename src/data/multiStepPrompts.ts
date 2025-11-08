// Multi-step prompts for BizMap AI - Complete 30-day journey
// Each business concept has 7 prompts covering all BizMap steps

export interface MultiStepPrompt {
  id: number;
  conceptTitle: string;
  category: string;
  description: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  steps: {
    step: number;
    title: string;
    dayRange: string;
    prompt: string;
  }[];
}

// ENHANCED helper function to generate HIGHLY DETAILED, concept-1 quality prompts for steps 2-7
function generateStandardSteps(conceptTitle: string, step1Prompt: string): Array<{step: number; title: string; dayRange: string; prompt: string}> {
  // Advanced business type detection with more granularity
  const lower = step1Prompt.toLowerCase();

  // Primary business model detection
  const isSaaS = lower.includes('saas') || lower.includes('software') || (lower.includes('platform') && !lower.includes('marketplace')) || (lower.includes('app') && !lower.includes('mobile app for local'));
  const isMarketplace = lower.includes('marketplace') || (lower.includes('platform') && lower.includes('connect'));
  const isConsulting = lower.includes('consulting') || lower.includes('consultancy');
  const isAgency = lower.includes('agency');
  const isService = (lower.includes('service') && !lower.includes('saas')) || isConsulting || isAgency;
  const isSubscription = lower.includes('subscription box') || lower.includes('subscription service');
  const isPhysicalProduct = lower.includes('product') || lower.includes('store') || lower.includes('vending') || lower.includes('meal prep') || isSubscription;
  const isMobileApp = lower.includes('mobile app');
  const isCourse = lower.includes('course');

  // Target market detection
  const isB2B = lower.includes('businesses') || lower.includes('companies') || lower.includes('b2b') || lower.includes('small business') || lower.includes('mid-size companies');
  const isB2C = lower.includes('homeowners') || lower.includes('consumers') || lower.includes('individuals') || lower.includes('professionals') || lower.includes('remote workers') || lower.includes('parents');
  const isCreatorFocused = lower.includes('creators') || lower.includes('influencers') || lower.includes('content creator');
  const isLocal = lower.includes('local') || lower.includes('in-person') || lower.includes('installation') || lower.includes('neighborhood');

  // Special categories
  const isEducation = lower.includes('education') || lower.includes('learning') || lower.includes('course') || lower.includes('bootcamp');
  const isHealth = lower.includes('health') || lower.includes('wellness') || lower.includes('mental health') || lower.includes('fitness') || lower.includes('care');
  const isSustainability = lower.includes('sustainability') || lower.includes('eco-friendly') || lower.includes('renewable energy') || lower.includes('carbon');

  // Determine primary business type for prompts
  let businessType = 'default';
  if (isSaaS && !isMarketplace) businessType = 'saas';
  else if (isMarketplace) businessType = 'marketplace';
  else if (isConsulting) businessType = 'consulting';
  else if (isAgency) businessType = 'agency';
  else if (isSubscription) businessType = 'subscription';
  else if (isService && isLocal) businessType = 'local-service';
  else if (isService) businessType = 'service';
  else if (isPhysicalProduct) businessType = 'physical-product';
  else if (isCourse) businessType = 'course';

  // Determine target market for prompts
  let targetMarket = 'general';
  if (isB2B && !isB2C) targetMarket = 'b2b';
  else if (isB2C && !isB2B) targetMarket = 'b2c';
  else if (isCreatorFocused) targetMarket = 'creators';
  else if (isLocal) targetMarket = 'local';
  else if (isB2B && isB2C) targetMarket = 'hybrid'; // Both B2B and B2C

  const useB2BPrompts = targetMarket === 'b2b' || targetMarket === 'hybrid';

  // STEP 2: Target Customer - HIGHLY DETAILED like concept 1
  let step2Prompt = '';
  if (businessType === 'marketplace') {
    step2Prompt = `My ideal first customers are on both sides of the marketplace: Supply side - ${targetMarket === 'creators' ? 'content creators or service providers with 1K-100K followers' : 'service providers or sellers with proven track records'} who are frustrated with high commission fees (15-30%) on existing platforms and want better discovery. They're active in ${targetMarket === 'b2b' ? 'industry LinkedIn groups, professional Slack communities, and trade associations' : 'Facebook groups, Reddit communities, and Discord servers'} for their niche. Demand side - ${targetMarket === 'b2b' ? 'businesses (5-100 employees) with $500-2K monthly budgets' : 'consumers aged 25-45 with disposable income'} currently using ${targetMarket === 'b2b' ? 'Upwork, Fiverr, or LinkedIn' : 'traditional search methods or outdated platforms'} and dissatisfied with quality/price. I can reach them through: ${targetMarket === 'b2b' ? 'LinkedIn outreach to decision-makers, industry conference networking, posting in r/smallbusiness, B2B Facebook groups, and partnerships with business consultants' : 'targeted social media ads, posting in relevant subreddits, Facebook groups for enthusiasts, influencer partnerships, and local community forums'}.`;
  } else if (businessType === 'saas') {
    step2Prompt = `My ideal first customers are ${targetMarket === 'b2b' ? 'small to mid-size companies (10-100 employees) with $50K-500K annual revenue' : targetMarket === 'creators' ? 'content creators with 10K-500K followers earning $2K-20K monthly' : 'professionals or power users aged 25-45'} who are currently ${lower.includes('project') ? 'drowning in email chains, spreadsheets, and missed deadlines' : lower.includes('ai') ? 'spending 10-20 hours weekly on manual tasks that could be automated' : lower.includes('analytics') ? 'making business decisions blindly without data insights' : 'frustrated with clunky, expensive legacy tools that do not solve their specific problem'}. They are active in ${targetMarket === 'b2b' ? 'LinkedIn groups for their industry, Slack communities for business ops, and attend SaaS/startup conferences' : targetMarket === 'creators' ? 'creator Discord servers, YouTuber subreddits like r/PartneredYoutube, and follow creator economy newsletters' : 'productivity subreddits, Product Hunt, Hacker News, and indie hacker communities'}. I can reach them through: ${targetMarket === 'b2b' ? 'LinkedIn posts showing ROI calculations, cold outreach to targeted companies, partnerships with consultants who serve this market, posting case studies in r/SaaS, and industry-specific Facebook groups' : targetMarket === 'creators' ? 'Twitter threads about creator business tools, Instagram posts showing tool demos, partnerships with creator coaches, posting in Discord servers, and creator-focused ads' : 'Product Hunt launch, posting helpful insights in r/productivity and r/SaaS, Twitter threads about workflow optimization, and targeted LinkedIn content'}.`;
  } else if (businessType === 'consulting') {
    step2Prompt = `My ideal first clients are ${targetMarket === 'b2b' ? 'small businesses (5-50 employees) with $500K-5M annual revenue' : 'professionals or individuals'} who are ${lower.includes('marketing') ? 'spending $2K-10K monthly on ads with poor ROAS and no clear attribution' : lower.includes('financial') ? 'drowning in bookkeeping chaos, facing tax deadline stress, or missing financial optimization opportunities' : lower.includes('operations') ? 'losing 15-20 hours weekly to inefficient processes and manual work' : lower.includes('strategy') ? 'stuck at their current revenue plateau and need expert guidance to break through' : 'frustrated with lack of expertise in this specific area and willing to invest in expert help'}. They're active in ${targetMarket === 'b2b' ? 'local Chamber of Commerce meetings, LinkedIn industry groups, small business Facebook groups, and attend regional business conferences' : 'professional associations, LinkedIn groups for their field, and follow industry thought leaders'}. I can reach them through: ${targetMarket === 'b2b' ? 'LinkedIn posts showing client results and case studies, speaking at local business networking events, partnerships with CPAs/lawyers/web designers who can refer, posting in r/smallbusiness with valuable insights, and direct outreach to businesses showing obvious pain points' : 'LinkedIn content demonstrating expertise, speaking at professional association meetings, referrals from complementary service providers, posting in industry-specific online communities, and targeted outreach to individuals in my network'}.`;
  } else if (businessType === 'subscription') {
    step2Prompt = `My ideal first subscribers are ${lower.includes('remote') ? 'remote workers and digital nomads (25-45 years old, $60K-120K income) working from home 3-5 days weekly' : lower.includes('pet') ? 'pet owners (30-50 years old, $70K+ household income) with dogs or cats who treat pets like family' : lower.includes('beauty') || lower.includes('skincare') ? 'beauty enthusiasts (women 25-40, $50K+ income) who buy 3+ beauty products monthly' : lower.includes('book') ? 'avid readers (30-55 years old, college-educated, $60K+ income) who read 15+ books yearly' : lower.includes('snack') || lower.includes('food') ? 'health-conscious consumers (25-45, $60K+ income) who prioritize organic/premium food options' : 'enthusiasts (age 25-50, $60K-100K income)'} who are ${lower.includes('remote') ? 'struggling with productivity, ergonomics, and work-life balance at home' : lower.includes('pet') ? 'spending $100+ monthly on pet supplies but overwhelmed by product choices' : lower.includes('beauty') ? 'tired of wasting money on products that don't work for their skin type' : lower.includes('book') ? 'overwhelmed by too many book choices and want curated recommendations' : lower.includes('snack') ? 'frustrated with unhealthy office snacks or lack of quality options' : 'actively seeking discovery of new products but overwhelmed by choices'}. They follow ${lower.includes('remote') ? 'remote work influencers on LinkedIn/Twitter, watch productivity YouTubers, and read newsletters like Remote Tools and Distributed' : lower.includes('pet') ? 'pet influencers on Instagram, active in r/dogs and r/cats, follow pet care blogs, and watch pet TikToks' : lower.includes('beauty') ? 'beauty YouTubers and TikTokers, read Glossier/Sephora blogs, active in r/SkincareAddiction, and follow clean beauty influencers' : lower.includes('book') ? 'BookTok creators, Bookstagram accounts, r/books community, Goodreads groups, and literary newsletters' : 'niche influencers and enthusiast communities'}. I can reach them through: ${lower.includes('remote') ? 'posting in r/remotework and r/WorkFromHome, LinkedIn articles about remote work setup, Instagram posts showing box unboxings, partnerships with productivity influencers, and targeted Facebook ads to remote workers' : lower.includes('pet') ? 'Instagram posts and reels showing product unboxings, partnerships with pet micro-influencers (10K-50K followers), posting in pet Facebook groups and r/dogs, TikTok videos of pets enjoying products, and targeted ads to pet owner audiences' : lower.includes('beauty') ? 'Instagram and TikTok content showing product reveals, partnerships with beauty micro-influencers, posting in r/SkincareAddiction and beauty Facebook groups, unboxing videos on YouTube, and targeted Instagram ads to beauty enthusiasts' : lower.includes('book') ? 'BookTok and Bookstagram content, posting in r/books and book club Facebook groups, partnerships with book bloggers, Goodreads groups, and targeted ads to Kindle/Goodreads users' : 'social media content in the niche, influencer partnerships, relevant subreddits and Facebook groups, and targeted ads to enthusiast audiences'}.`;
  } else if (businessType === 'local-service') {
    step2Prompt = `My ideal first customers are ${lower.includes('home') || lower.includes('cleaning') || lower.includes('lawn') || lower.includes('handyman') ? 'homeowners (35-65 years old, $80K-200K household income, home value $300K+) in middle to upper-middle class neighborhoods' : lower.includes('pet') ? 'pet owners (25-55 years old, $60K+ income) with busy work schedules' : lower.includes('car') || lower.includes('auto') ? 'busy professionals and families (30-55 years old, $70K+ income) who value convenience over price' : 'local residents or businesses'} within ${lower.includes('mobile') || lower.includes('delivery') ? '15-25 mile radius' : '5-10 mile radius'} who are ${lower.includes('cleaning') ? 'too busy to clean themselves and willing to pay $120-200 for peace of mind' : lower.includes('lawn') ? 'frustrated with unreliable lawn services and want consistent, quality work' : lower.includes('handyman') || lower.includes('repair') ? 'facing maintenance issues and need trustworthy help fast' : lower.includes('pet') ? 'worried about leaving pets home alone 8+ hours daily' : lower.includes('car') ? 'tired of wasting 2-3 hours at car service shops and prefer at-home convenience' : 'seeking reliable local service providers'}. They discover local services through ${lower.includes('emergency') || lower.includes('urgent') ? 'Google searches "near me", asking neighbors, and Nextdoor posts' : 'word-of-mouth referrals, Google searches, Facebook community groups, and Nextdoor recommendations'}. I can reach them through: ${lower.includes('home') ? 'posting in 5-8 neighborhood-specific Facebook groups and Nextdoor communities with helpful tips (not ads), partnering with real estate agents and property managers for referrals, Google My Business optimization with service area targeting, door hangers in target zip codes, and joining local business networking groups' : lower.includes('pet') ? 'posting in local pet owner Facebook groups and Nextdoor, partnering with local vets and pet stores for referrals, Google My Business with pet service focus, Instagram content showing happy pets, and attending local pet events' : lower.includes('car') ? 'posting in local Facebook groups and Nextdoor about car maintenance tips, partnering with apartment complexes and office parks, Google My Business optimization, targeted local Facebook ads, and employee/corporate partnerships' : 'neighborhood Facebook groups and Nextdoor communities (5-8 local groups), partnerships with 3-5 complementary local businesses for referrals, Google My Business profile optimization, local direct mail or door hangers, and attending community events'}.`;
  } else if (businessType === 'agency') {
    step2Prompt = `My ideal first clients are ${targetMarket === 'b2b' ? 'small to mid-size businesses (5-50 employees, $500K-10M revenue)' : 'individuals or professionals'} ${lower.includes('marketing') ? 'currently spending $2K-10K monthly on marketing with unclear ROI, no dedicated marketing team' : lower.includes('design') ? 'launching products/rebrands but lack in-house design expertise, spending $5K-15K on scattered freelancers' : lower.includes('social') ? 'posting inconsistently on social media (1-2x weekly), getting low engagement, and missing growth opportunities' : lower.includes('content') ? 'struggling to create consistent, high-quality content and have no content strategy or calendar' : lower.includes('seo') ? 'ranking poorly on Google (page 2-3), losing leads to competitors, and getting 100-500 monthly organic visitors' : lower.includes('video') ? 'wanting to leverage video marketing but lack expertise and equipment for professional content' : 'needing specialized agency services but dissatisfied with current providers or doing it themselves poorly'} in industries like ${lower.includes('ecommerce') || lower.includes('retail') ? 'e-commerce, DTC brands, and online retail' : lower.includes('saas') || lower.includes('tech') ? 'SaaS, tech startups, and software companies' : lower.includes('real estate') ? 'real estate, property management, and construction' : lower.includes('health') ? 'healthcare, wellness, and fitness' : lower.includes('restaurant') || lower.includes('food') ? 'restaurants, food services, and hospitality' : 'professional services, e-commerce, or local businesses'}. They're active in ${targetMarket === 'b2b' ? 'LinkedIn groups for their industry, small business Facebook groups, attend local Chamber events, and follow marketing/growth influencers' : 'professional networks and industry-specific online communities'}. I can reach them through: ${lower.includes('marketing') || lower.includes('social') || lower.includes('content') ? 'LinkedIn posts showcasing client results and case studies with specific metrics, offering free marketing audits to 5 ideal clients, posting valuable insights in r/marketing and r/smallbusiness, partnerships with web developers and consultants, and direct outreach to businesses with obvious marketing gaps' : lower.includes('design') ? 'posting design work on Dribbble and Behance, LinkedIn content showing before/after case studies, offering free brand audits, partnerships with marketing agencies and consultants, and outreach to businesses with poor branding' : lower.includes('seo') ? 'LinkedIn posts about SEO with case study results, offering free SEO audits showing specific opportunities, posting in r/SEO and r/smallbusiness, partnerships with web developers, and outreach to businesses ranking poorly' : lower.includes('video') ? 'sharing video portfolio on LinkedIn and Instagram, offering free video strategy sessions, partnering with marketing agencies, posting in business Facebook groups, and outreach to brands with poor video presence' : 'LinkedIn content demonstrating expertise with case studies, offering free audits or strategy sessions, partnerships with complementary agencies, posting valuable insights in industry communities, and targeted outreach to businesses with obvious needs'}.`;
  } else if (businessType === 'course') {
    step2Prompt = `My ideal first students are ${lower.includes('coding') || lower.includes('programming') ? 'aspiring developers or career changers (22-40 years old) with basic tech skills looking to land first developer job in 6-12 months' : lower.includes('marketing') ? 'small business owners or marketing coordinators (25-45) wanting to learn effective marketing without expensive agencies' : lower.includes('design') ? 'freelancers, side hustlers, or career pivoters (25-40) wanting to learn professional design skills' : lower.includes('business') || lower.includes('entrepreneur') ? 'aspiring entrepreneurs or side hustlers (25-50) with business ideas but no roadmap to launch' : lower.includes('finance') || lower.includes('investing') ? 'professionals or individuals (30-55, $50K-150K income) wanting to build wealth and understand investing' : lower.includes('language') ? 'professionals or travelers (25-50) wanting conversational fluency for career/travel in 3-6 months' : lower.includes('fitness') || lower.includes('health') ? 'busy professionals (30-50) struggling with health/fitness despite trying various programs' : 'individuals seeking skill development or transformation'} who are ${lower.includes('coding') ? 'currently earning $35K-65K in non-tech jobs, spending 10-15 hours weekly on YouTube tutorials without clear direction' : lower.includes('marketing') ? 'wasting $1K-3K monthly on ads with no strategy, feeling overwhelmed by marketing options' : lower.includes('design') ? 'creating amateurish designs in Canva, losing clients due to poor design quality' : lower.includes('business') ? 'stuck in planning phase for 6-12 months, overwhelmed by all the business advice online' : lower.includes('finance') ? 'have $10K-100K saved but confused about investing, worried about retirement readiness' : lower.includes('language') ? 'tried Duolingo/apps for months with minimal progress, need structured approach for fluency' : lower.includes('fitness') ? 'tried 5+ programs/gyms without lasting results, need sustainable approach that fits busy life' : 'frustrated with self-teaching or need structured expert guidance'} and willing to invest ${lower.includes('coding') || lower.includes('business') ? '$500-2,000' : lower.includes('marketing') || lower.includes('design') || lower.includes('finance') ? '$300-1,000' : '$200-700'} for a structured path to results. They're active in ${lower.includes('coding') ? 'r/learnprogramming, r/cscareerquestions, freeCodeCamp forums, coding Discord servers, and follow tech YouTubers' : lower.includes('marketing') ? 'r/marketing, r/smallbusiness, marketing Facebook groups, follow growth hackers on Twitter, and read marketing newsletters' : lower.includes('design') ? 'r/graphic_design, Dribbble community, design Discord servers, follow design influencers on Instagram, and design Facebook groups' : lower.includes('business') ? 'r/Entrepreneur, Indie Hackers, small business Facebook groups, startup Twitter, and follow business YouTubers' : lower.includes('finance') ? 'r/personalfinance, r/investing, Bogleheads forum, follow finance YouTubers, and read investment newsletters' : lower.includes('language') ? 'language learning subreddits, language exchange apps, follow polyglot YouTubers, and language learning Facebook groups' : lower.includes('fitness') ? 'r/fitness, r/loseit, fitness Facebook groups, follow fitness influencers, and health/wellness communities' : 'relevant online communities, forums, and social media groups for the skill'}. I can reach them through: ${lower.includes('coding') ? 'posting helpful coding tutorials in r/learnprogramming and dev.to, creating YouTube shorts showing quick wins, hosting free "land your first dev job" webinar, posting in coding Discord servers, and offering free roadmap/career consultations' : lower.includes('marketing') ? 'LinkedIn posts about marketing mistakes and fixes, free marketing strategy webinars, posting case studies in r/marketing, email sequence from free resource download, and partnerships with business coaches' : lower.includes('design') ? 'sharing design process videos on YouTube/TikTok, posting before/after work on Instagram, free design challenge or webinar, design tips in subreddits, and partnerships with freelance communities' : lower.includes('business') ? 'posting business launch insights in r/Entrepreneur and Indie Hackers, hosting free "validate your idea in 7 days" workshop, Twitter threads about business lessons, valuable LinkedIn content, and partnerships with startup communities' : lower.includes('finance') ? 'creating finance education TikToks/YouTube shorts, posting investing tips in r/personalfinance, hosting free "investing 101" webinar, free investment calculator or resource, and partnerships with finance YouTubers' : lower.includes('language') ? 'posting language tips on TikTok/Instagram, creating YouTube videos with common phrases, free conversation practice sessions, posting in language subreddits, and partnerships with language exchange platforms' : lower.includes('fitness') ? 'sharing fitness transformation content on Instagram, posting workout tips in fitness subreddits, hosting free fitness challenge, workout videos on YouTube/TikTok, and partnerships with fitness influencers' : 'creating free valuable content in the niche (blog, YouTube, social), hosting free webinar or challenge, posting in relevant communities, offering free resources/templates, and partnerships with influencers in the space'}.`;
  } else if (targetMarket === 'b2b') {
    step2Prompt = `My ideal first customers are ${lower.includes('enterprise') || lower.includes('large') ? 'mid to large companies (100-1000 employees) with $10M-100M annual revenue' : 'small to mid-size businesses (10-100 employees) with $500K-10M annual revenue'} in industries like ${lower.includes('tech') || lower.includes('saas') ? 'SaaS, technology, and software companies' : lower.includes('ecommerce') || lower.includes('retail') ? 'e-commerce and retail businesses' : lower.includes('finance') ? 'financial services and fintech' : lower.includes('health') ? 'healthcare and medical practices' : lower.includes('manufacturing') ? 'manufacturing and distribution' : 'professional services, consulting, or B2B services'} who are ${lower.includes('sales') ? 'struggling with manual sales processes, losing 20-30% of leads due to slow follow-up, and using outdated CRM systems' : lower.includes('hr') || lower.includes('hiring') ? 'spending 40-60 hours per hire on manual recruiting, losing candidates to slow processes, and using job boards exclusively' : lower.includes('finance') || lower.includes('accounting') ? 'wasting 15-20 hours monthly on manual bookkeeping, missing tax deductions, and lacking financial visibility' : lower.includes('inventory') ? 'experiencing stockouts or overstock costing $10K-50K annually, tracking inventory in spreadsheets' : lower.includes('customer') ? 'receiving 50-200 customer inquiries daily, response time 4-8 hours, and customer satisfaction declining' : 'facing operational inefficiencies costing them significant time and money'}. The decision-maker is typically the ${lower.includes('sales') ? 'VP of Sales or Sales Operations Director' : lower.includes('hr') ? 'HR Director or Talent Acquisition Manager' : lower.includes('finance') ? 'CFO, Controller, or Finance Director' : lower.includes('operations') || lower.includes('inventory') ? 'COO or Operations Manager' : lower.includes('customer') ? 'Customer Success Director or Support Manager' : 'department head or VP-level executive'} with ${lower.includes('enterprise') ? '$50K-200K' : '$10K-100K'} annual budget. They're active in ${lower.includes('sales') ? 'LinkedIn Sales Navigator, sales enablement communities, attending SaaS conferences, and r/sales' : lower.includes('hr') ? 'LinkedIn HR groups, SHRM communities, r/recruiting, and HR tech forums' : lower.includes('finance') ? 'CFO forums, accounting LinkedIn groups, r/accounting, and finance conferences' : lower.includes('operations') ? 'operations management LinkedIn groups, supply chain forums, and industry conferences' : lower.includes('customer') ? 'customer success communities, support forums, SaaS groups, and CS conferences' : 'industry-specific LinkedIn groups, professional associations, trade conferences, and business operations forums'}. I can reach them through: ${lower.includes('enterprise') ? 'LinkedIn Sales Navigator outreach with personalized messages, speaking at industry conferences, partnerships with industry consultants, thought leadership content on LinkedIn, and targeted account-based marketing campaigns' : 'LinkedIn outreach to decision-makers with specific pain points, posting case studies with ROI metrics in relevant LinkedIn groups and r/smallbusiness, partnerships with consultants who serve this market (referral agreements), offering free audits or assessments showing concrete opportunities, and attending industry networking events'}.`;
  } else {
    step2Prompt = `My ideal first customers are ${lower.includes('parents') ? 'busy parents (30-45 years old, $70K-150K household income) with children aged 2-12' : lower.includes('senior') || lower.includes('elderly') ? 'seniors (60-80 years old) or their adult children (40-60) making care decisions' : lower.includes('student') ? 'college students or recent graduates (18-25 years old) with limited budgets but high motivation' : lower.includes('professional') ? 'working professionals (28-50 years old, $60K-150K income) in corporate or knowledge work roles' : 'individuals aged 25-55 with $50K-120K annual income'} who are ${lower.includes('time') || lower.includes('busy') ? 'extremely time-constrained, working 50-60 hours weekly with family responsibilities' : lower.includes('health') ? 'struggling with health issues and seeking solutions after trying 3-5 other options' : lower.includes('financial') || lower.includes('money') ? 'worried about financial security and making poor money decisions without expert guidance' : lower.includes('education') || lower.includes('learning') ? 'committed to self-improvement and willing to invest in education for career advancement' : lower.includes('convenience') ? 'prioritizing convenience over price and willing to pay premium for time-saving solutions' : 'seeking solutions after being frustrated with current alternatives'}. They ${lower.includes('online') ? 'spend 3-5 hours daily online, active on social media, and comfortable with digital purchases' : lower.includes('local') ? 'prefer local, trusted providers and make decisions based on reviews and referrals' : 'research extensively before purchasing and value expert recommendations'}. I can reach them through: ${lower.includes('parents') ? 'parenting Facebook groups (local and national), mommy bloggers and parent influencers on Instagram, posting helpful advice in r/Parenting, partnerships with pediatricians or family services, and targeted Facebook ads to parents' : lower.includes('senior') ? 'senior community centers and groups, adult children in caregiver Facebook groups, partnerships with doctors and senior living facilities, posting in r/AgingParents, and local senior newsletters' : lower.includes('student') ? 'college subreddits and Facebook groups, posting on LinkedIn for career-focused students, partnerships with university career centers, Instagram content targeting students, and campus ambassadors' : lower.includes('professional') ? 'LinkedIn content targeting specific job titles, professional association groups, posting in r/careerguidance or relevant profession subreddits, industry conferences, and targeted LinkedIn ads' : 'relevant Facebook groups and subreddits, social media content targeting specific interests, partnerships with complementary service providers or influencers, and targeted digital advertising on platforms they use daily'}.`;
  }

  return [
    {
      step: 1,
      title: "Business Concept",
      dayRange: "Days 1-2",
      prompt: step1Prompt
    },
    {
      step: 2,
      title: "Target Customer",
      dayRange: "Days 3-4",
      prompt: step2Prompt
    },
    // STEP 3: Validation Plan
    {
      step: 3,
      title: "Validation Plan",
      dayRange: "Days 5-7",
      prompt: (function() {
        if (businessType === 'saas' || businessType === 'marketplace') {
          return `For my ${conceptTitle.toLowerCase()}: Validation this week: 1) User Interviews: Talk to 8-12 potential users - understand current workflow, pain severity (1-10), what they pay now, and must-have features. Record insights. 2) Landing Page Test: Build simple page explaining value prop with email signup or "Request Access" button. Drive 100 visits via communities - target 15-25% conversion to signups. 3) Competitor Deep Dive: Analyze 5 competitors' G2/Capterra reviews - what do users love/hate? Where are gaps I can fill? What validates this is worth building?`;
        } else if (businessType === 'subscription' || businessType === 'physical-product') {
          return `For my ${conceptTitle.toLowerCase()}: Market validation: 1) Pre-Launch Campaign: Set up pre-order page or crowdfunding campaign (Kickstarter/Indiegogo) - target 15-25 commitments with deposit/full payment. This proves purchase intent. 2) Customer Research: Interview 10 potential buyers about price sensitivity, must-have vs nice-to-have features, and purchase triggers. 3) Supply Chain Check: Contact 3-5 suppliers - confirm costs, MOQs, lead times, and quality. Can I deliver profitably? What metrics prove demand is real?`;
        } else if (businessType === 'consulting') {
          return `For my ${conceptTitle.toLowerCase()}: Validate demand: 1) Free Audits/Consultations: Offer 5 free initial consultations to ideal clients - pitch paid engagement at the end. Track conversion rate. 2) Network Outreach: Contact 20 potential clients explaining my offer - gauge interest and objections. Document feedback. 3) Competitive Analysis: Research 5 competitors - what do they charge, what services, what's their positioning? Find my differentiation angle. What proves people will pay for this expertise?`;
        } else if (businessType === 'local-service') {
          return `For my ${conceptTitle.toLowerCase()}: Local validation: 1) Door-to-Door/Direct Outreach: Talk to 15-20 local potential customers - understand needs, current solutions, and willingness to try new provider. Collect emails for launch. 2) Test Offer: Post special intro offer in 3 local Facebook groups and Nextdoor - track inquiries and conversion. 3) Partner Reconnaissance: Meet with 3 complementary local businesses about referral partnerships. What proves this local market wants and will pay for my service?`;
        } else if (businessType === 'agency') {
          return `For my ${conceptTitle.toLowerCase()}: Validation strategy: 1) Sample Projects: Create 3-5 portfolio samples in target niche showing my work quality and results. Share in communities for feedback. 2) Outbound Testing: Reach out to 25 ideal clients with personalized pitch - track response and interest level. 3) Competitive Audit: Analyze 5 agency competitors - pricing, services, positioning, client results. Where's my wedge? What proves agencies/clients want this service at my price point?`;
        } else if (businessType === 'course') {
          return `For my ${conceptTitle.toLowerCase()}: Course validation: 1) Free Workshop/Webinar: Host free 60-min training on the topic - pitch full course at end. Target 20+ attendees, 20% conversion to course waitlist. 2) Survey Potential Students: Ask 30 people in target market about learning goals, current barriers, willingness to pay, and preferred format. 3) Competitor Research: Review 5 similar courses - pricing, curriculum, reviews. What's missing that I can provide? What proves people will buy my course?`;
        } else {
          return `For my ${conceptTitle.toLowerCase()}: Demand validation: 1) Customer Discovery: Conduct 10-15 detailed interviews with target customers - understand current pain level, what they do now, budget available, and decision criteria. 2) MVP Test: Create simple test offer (landing page, social post, or direct outreach) - measure inquiry rate and conversion to intent/payment. 3) Market Analysis: Research 5 competitors and alternatives - pricing, positioning, customer sentiment. What gap do I fill? What specific results prove people want and will pay for this?`;
        }
      })()
    },
    // STEP 4: MVP Design
    {
      step: 4,
      title: "MVP Design",
      dayRange: "Days 8-14",
      prompt: (function() {
        if (businessType === 'saas') {
          return `For my ${conceptTitle.toLowerCase()}: Minimum viable product: 1) ONE core feature solving the main pain point (be specific - what exactly does it do?), 2) Simple, functional UI/dashboard - clean but not fancy, 3) User auth and basic account management, 4) Critical integration if needed to work (specify which one). Explicitly NOT building yet: mobile app, advanced analytics, API, team features, multiple integrations, customization, or premium features. Launch lean, learn fast, iterate based on real usage.`;
        } else if (businessType === 'marketplace') {
          return `For my ${conceptTitle.toLowerCase()}: Platform MVP: 1) Simple two-sided marketplace - basic profiles for both supply and demand sides, 2) Core matching/connection mechanism (search, browse, or matching algorithm), 3) Basic messaging between parties, 4) Simple payment processing or booking system if transactions happen on-platform. NOT building: ratings/reviews system, advanced filters, mobile app, analytics dashboards, API, or premium features. Start with manual processes where possible. Which side launches first?`;
        } else if (businessType === 'consulting') {
          return `For my ${conceptTitle.toLowerCase()}: Initial consulting offering: 1) ONE core service package focused on biggest client pain (define exactly what's included), 2) Standard deliverables template I can reuse (report, strategy doc, implementation plan), 3) Simple client process: discovery call → proposal → delivery → follow-up, 4) Basic tools: Google Docs, Zoom, email. NOT offering yet: multiple service tiers, custom solutions, ongoing retainers, or rush delivery. Standardize to scale. What's included in my core package?`;
        } else if (businessType === 'agency') {
          return `For my ${conceptTitle.toLowerCase()}: Agency MVP service: 1) ONE service offering (specify exactly what I deliver), 2) Standard package with clear scope and deliverables, 3) Simple client workflow I can repeat, 4) Basic project management and communication (Trello, Slack, email). NOT offering: multiple service lines, custom pricing, 24/7 support, or white-label until proven. Focus on one thing, do it excellently. What's my signature service and delivery timeline?`;
        } else if (businessType === 'subscription') {
          return `For my ${conceptTitle.toLowerCase()}: First box/subscription: 1) 5-7 curated items solving core customer need, 2) Simple packaging with branded experience, 3) Monthly subscription model with easy cancellation, 4) Basic fulfillment process (may start manual). NOT including yet: customization options, multiple tier levels, add-ons, or mobile app. Validate core concept first. What exactly is in the first box and why will subscribers love it?`;
        } else if (businessType === 'local-service') {
          return `For my ${conceptTitle.toLowerCase()}: Service MVP: 1) Core service offering (be specific about what's included/excluded), 2) Standard pricing and service area coverage, 3) Simple booking process (phone, text, or basic online form), 4) Basic tools and equipment needed. NOT offering yet: premium/rush service, extended service area, multiple service packages, or 24/7 availability. Start focused. What's included in my standard service visit?`;
        } else if (businessType === 'course') {
          return `For my ${conceptTitle.toLowerCase()}: MVP course structure: 1) 4-6 core modules covering essential learning outcomes, 2) Mix of video lessons + workbooks/exercises, 3) Simple hosting (Teachable, Gumroad, or even Google Drive + email), 4) Basic student support (email or simple community). NOT building: interactive platform, live coaching, certification, lifetime updates, or mobile app. Validate content quality and student results first. What transformation will students achieve?`;
        } else {
          return `For my ${conceptTitle.toLowerCase()}: MVP scope: 1) Core product/service delivering main customer benefit (describe specifically), 2) Essential features only - cut everything not critical to solve the pain, 3) Simple delivery/fulfillment process (manual OK initially), 4) Basic customer communication and support. Explicitly NOT building: premium features, customization, automation, advanced options, or expansion until core is validated. Start small to launch fast. What's the absolute minimum that delivers value?`;
        }
      })()
    },
    // STEP 5: Launch Strategy
    {
      step: 5,
      title: "Launch Strategy",
      dayRange: "Days 15-21",
      prompt: (function() {
        if (businessType === 'saas' || businessType === 'marketplace') {
          return `For my ${conceptTitle.toLowerCase()}: First 10 users strategy: 1) Product Hunt launch with story + demo video + founder deal, 2) Direct outreach to 30 ideal users from validation interviews offering beta access, 3) Founder-led content: Post valuable insights in 5 relevant communities (Reddit, forums, Slack groups) - soft mention my solution, 4) Beta launch post on LinkedIn/Twitter with specific benefits and early adopter pricing, 5) Partner with 1-2 complementary tools/services for co-marketing. Launch offer: Lifetime 50% off for first 10 paying customers. How do I build trust fast with no track record?`;
        } else if (businessType === 'local-service') {
          return `For my ${conceptTitle.toLowerCase()}: Local customer acquisition: 1) Personal network: Text/call 25 contacts who match profile or know people who do - ask for referrals, 2) Local partnerships: Meet with 3 complementary businesses (real estate agents, contractors, etc.) to exchange referrals, 3) Community presence: Post in 5 local Facebook groups and Nextdoor with helpful advice (not spammy) + mention service, 4) Google My Business: Set up profile, get first 5-star reviews from beta customers, 5) Door hangers/flyers in target neighborhoods. Founding customer special: 30% off first service. How do I stand out locally?`;
        } else if (businessType === 'consulting' || businessType === 'agency') {
          return `For my ${conceptTitle.toLowerCase()}: First client acquisition: 1) Warm outreach: Contact 20 people in network who fit ideal client or can refer - personalized message explaining what I do now, 2) LinkedIn presence: Post 3x weekly about insights in my domain - include case studies and my POV. Invite connections to free consultation, 3) Strategic partnerships: Identify 3 referral partners who serve same audience different way - set up commission structure, 4) Free value: Offer 3 free audits/consultations - convert to paid at end, 5) Speaking: Present at 1 local event or online webinar in my niche. Founding rate: 30% off for first 5 clients locked in 6 months for testimonials. How do I prove expertise fast?`;
        } else if (businessType === 'subscription') {
          return `For my ${conceptTitle.toLowerCase()}: Subscriber acquisition: 1) Influencer seeding: Send free boxes to 5-10 micro-influencers in niche - ask for honest reviews/unboxing videos, 2) Social launch: Post unboxing content, behind-the-scenes, and founder story on Instagram/TikTok with special launch code, 3) Community engagement: Active in 5 relevant subreddits, Facebook groups, forums - provide value, mention box when relevant, 4) Friends & family: Offer first 25 people special founders price - focus on getting great reviews, 5) Paid test: Run small Facebook/Instagram ad test to subscription landing page. Launch special: First month 50% off. How do I get people to commit to subscription?`;
        } else if (businessType === 'course') {
          return `For my ${conceptTitle.toLowerCase()}: Student acquisition: 1) Free lead magnet: Create valuable free resource (cheat sheet, mini-course, template) to build email list - pitch course to list, 2) Launch webinar: Host live free training showing key insights - sell course at end. Target 30+ attendees, 3) Community launch: Share in 5 communities where target students hang out - focus on transformation results, 4) Testimonial push: Get 3 beta students through course for free in exchange for detailed video testimonials, 5) Personal outreach: Message 20 people who would benefit - explain outcomes and offer founding pricing. Early bird: $100 off for first 25 students. How do I prove course quality before launch?`;
        } else {
          return `For my ${conceptTitle.toLowerCase()}: Customer acquisition plan: 1) Direct targeted outreach: Personal messages to 50 ideal customers from validation phase - specific value prop for each, 2) Network activation: Reach out to 20 people who can refer or introduce me to customers, 3) Community presence: Provide valuable content/advice in 5 online communities - soft pitch when contextually relevant, 4) Social proof campaign: Share my journey, progress, early results on LinkedIn/Twitter with clear call-to-action, 5) Strategic partnerships: Secure 2 referral partners who serve my audience. Launch offer: Founding customer pricing - 25-30% off for first 10. How do I overcome the trust barrier as a new business?`;
        }
      })()
    },
    // STEP 6: Pricing Model
    {
      step: 6,
      title: "Pricing Model",
      dayRange: "Days 22-25",
      prompt: (function() {
        if (businessType === 'saas' || businessType === 'marketplace') {
          return `For my ${conceptTitle.toLowerCase()}: Pricing strategy: Start with 2 simple tiers - Starter ($X/month) for individuals/small users and Pro ($Y/month) for power users/teams. Based on competitor research, similar solutions cost $__-$__ monthly. I'm pricing at [lower end/middle/premium] to [acquire users faster/signal quality/maximize revenue]. My per-user costs: hosting $__, third-party APIs $__, support time $__ = total $__ per user monthly. Launch special: First 25 customers get lifetime 50% discount to build case studies. What price point gets me to first revenue fastest while covering costs?`;
        } else if (businessType === 'consulting') {
          return `For my ${conceptTitle.toLowerCase()}: Consulting pricing: Core package at $X per project (or $Y/hour for hourly model). Competitive analysis shows market rate is $__-$__ for similar work. My pricing factors: typical project takes X hours, my expertise level, overhead costs, desired margin for my time investment. Positioning as [affordable entry point/mid-market/premium expert]. Founding client offer: First 5 clients get $__ (30% off) locked in for 6 months in exchange for detailed testimonials and case study participation. Is this price compelling enough to close while demonstrating value?`;
        } else if (businessType === 'agency') {
          return `For my ${conceptTitle.toLowerCase()}: Agency pricing: Starting at $X for standard package (or $Y retainer for ongoing work). Benchmarking: competitors charge $__-$__ for similar deliverables. My rate reflects: hours required (X-Y hours), team costs if any, tools/software, expertise value, and desired profit margin. Positioning as [affordable alternative/boutique quality/full-service premium]. Launch pricing: First 5 clients get founding rate of $__ (25-30% discount) valid for 6 months with testimonial agreement. Does this pricing win clients while sustaining operations?`;
        } else if (businessType === 'subscription') {
          return `For my ${conceptTitle.toLowerCase()}: Subscription pricing: $X per month (or $Y quarterly with discount). Cost breakdown: product costs $__, packaging $__, shipping $__, platform fees $__ = $__ COGS per box. Target margin: 40-50%. Competitive subscriptions in this space: $__-$__ monthly. I'm positioning as [affordable/premium/value leader]. Launch offer: First 50 subscribers get first month 50% off + free shipping to reduce risk and get reviews. Break-even: need X subscribers to cover fixed costs. What price maximizes signups while maintaining healthy margins?`;
        } else if (businessType === 'local-service') {
          return `For my ${conceptTitle.toLowerCase()}: Service pricing: $X per standard job (or $Y/hour if hourly). Local competitors charge $__-$__ for similar work. My pricing considers: time per job (X hours), materials/supplies $__, travel time, expertise level, and local market rates. Positioning as [budget-friendly/mid-market/premium quality]. Founding customer special: First 10 customers get 30% off first service + satisfaction guarantee to reduce risk and generate reviews. At this price, I need X jobs per week to hit revenue goals. Does this pricing attract local customers while being profitable?`;
        } else if (businessType === 'course') {
          return `For my ${conceptTitle.toLowerCase()}: Course pricing: One-time payment of $X (or payment plan of $Y/month for 3-6 months). Comparable courses on this topic: $__-$__. My pricing reflects: transformation value, course depth (X hours of content + materials), my expertise level, and production costs. Positioning as [accessible entry/mid-tier/premium masterclass]. Early bird pricing: First 25 students get $100-150 off ($X instead of $Y) to generate initial testimonials and momentum. Lifetime access included. At this price, I need X students to hit revenue goal and validate content quality. Does this feel like a valuable investment to students?`;
        } else {
          return `For my ${conceptTitle.toLowerCase()}: Pricing structure: Core offering at $X [per unit/per month/per project]. Cost analysis: direct costs $__, overhead $__, time investment valued at $__ = need to charge $__ minimum to break even. Market research shows competitors at $__-$__. I'm pricing at [lower/middle/higher] end to [acquire customers faster/position as quality/maximize margins]. Early adopter special: First 15-20 customers get 25% off to reduce friction and collect testimonials. Need X sales at $Y each to cover initial costs and validate pricing. What price point makes the purchase decision easy for customers while ensuring profitability?`;
        }
      })()
    },
    // STEP 7: Day 30 Success Metrics
    {
      step: 7,
      title: "Day 30 Success Metrics",
      dayRange: "Days 26-30",
      prompt: (function() {
        if (businessType === 'saas' || businessType === 'marketplace') {
          return `For my ${conceptTitle.toLowerCase()}: Day 30 success definition: 1) Revenue: 3-5 paying customers generating $__+ in MRR (specify exact dollar amount), 2) Pipeline: 50+ email signups, 20+ trial starts, 10+ active product qualified leads, 3) Engagement: __% of users active weekly using core feature (proves value delivery), 4) Retention: 80%+ of paying users continue to second month, 5) Social proof: 2-3 detailed testimonials and case study with metrics. This validates product-market fit and justifies continuing. Alternative: If no paid users, need 100+ signups with 30%+ active usage proving demand exists. What's my minimum success threshold?`;
        } else if (businessType === 'consulting' || businessType === 'agency') {
          return `For my ${conceptTitle.toLowerCase()}: By Day 30, success means: 1) Revenue: 2-3 paying clients generating $__ total (specify amount), 2) Sales pipeline: 15+ qualified leads, 8+ discovery calls held, 5+ proposals sent, 3) Delivery proof: Successfully completed at least 1 client project with measurable results and great feedback, 4) Social proof: 2 detailed written testimonials + 1 video testimonial showcasing results delivered, 5) Referral generated: At least 1 client refers someone new or requests additional work. This validates my service model works and I can scale by refining process or hiring help. What revenue and client number proves viability?`;
        } else if (businessType === 'subscription') {
          return `For my ${conceptTitle.toLowerCase()}: Day 30 success metrics: 1) Subscribers: 20-30 paying subscribers at $X/month = $__-$__ MRR, 2) Retention: 85%+ keep subscription into month 2 (low churn proves value), 3) Social proof: 10+ positive reviews/ratings and 3+ unboxing posts/videos from customers, 4) Referrals: At least 2 subscribers refer friends (proves love-it factor), 5) Operations: Confirmed I can source, pack, and ship profitably at scale. This validates the subscription model works. Alternative: 50+ waitlist signups if not launched. What subscriber count and revenue proves sustainability?`;
        } else if (businessType === 'local-service') {
          return `For my ${conceptTitle.toLowerCase()}: Local business success by Day 30: 1) Revenue: Completed 8-12 jobs generating $__ total revenue, 2) Customer acquisition: Proven I can consistently generate leads through [specific channel] at $__ cost per lead, 3) Reviews: 5-8 five-star Google/Yelp reviews from satisfied customers, 4) Referrals: At least 2 customers referred new business, 5) Operations: Confirmed profitable delivery - time per job, materials cost, and margin math works. This proves local market demand exists and word-of-mouth engine is starting. What job volume and revenue validates full-time viability?`;
        } else if (businessType === 'course') {
          return `For my ${conceptTitle.toLowerCase()}: Course launch success metrics by Day 30: 1) Revenue: 15-25 students enrolled at $X = $__-$__ total revenue, 2) Engagement: 70%+ course completion rate proving content is valuable and students stick with it, 3) Results: At least 3 students share specific wins/transformations from applying lessons, 4) Testimonials: 5+ detailed video or written testimonials about course value and results achieved, 5) Repeat interest: 20+ waitlist signups for advanced course or cohort 2. This validates content quality and market demand for my teaching. What student count and completion rate proves I should create more courses?`;
        } else {
          return `For my ${conceptTitle.toLowerCase()}: Day 30 success metrics: 1) Revenue: $__ from X paying customers (specify exact numbers that prove viability), 2) Channel validation: Proven I can acquire customers via [specific channel] at $__ customer acquisition cost, 3) Product validation: 80%+ customer satisfaction, NPS score above 8, positive feedback on core value delivered, 4) Social proof: 3-5 testimonials or case studies showcasing results, 5) Operational proof: Confirmed I can deliver/fulfill profitably at current scale. These metrics prove concept works and justifies going full-time or raising capital. What's my minimum threshold for each metric to continue?`;
        }
      })()
    }
  ];
}

export const multiStepPrompts: MultiStepPrompt[] = [
  // Detailed concepts (IDs 1-5) - Fully customized 7 steps
  {
    id: 1,
    conceptTitle: "AI-Powered Customer Service Automation",
    category: "ai",
    description: "Build AI chatbots and customer support solutions for small businesses",
    tags: ["AI", "automation", "customer service", "B2B"],
    difficulty: "Hard",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a business providing AI-powered customer service automation for small and medium businesses. The core problem I'm solving is helping businesses reduce support costs (averaging $15-30/hour for agents) while improving 24/7 availability and faster response times. My solution uses AI chatbots, automated email responses, and smart ticketing systems. I have technical background, $7,000 budget, and can work full-time."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first customers are e-commerce businesses with 5-50 employees who are currently overwhelmed with customer inquiries (50+ daily). They're active in Shopify communities, e-commerce Facebook groups, and attend local small business networking events. I can reach them through Shopify app store, LinkedIn outreach to e-commerce CMOs, and partnering with Shopify consultants who can recommend my service."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week, I will: 1) Conduct 10 interviews with e-commerce business owners about their customer service pain points and current costs, 2) Create a landing page offering a free chatbot audit and track signups (goal: 25 emails), 3) Analyze 5 competitors' pricing and features to identify gaps in the market that I can fill."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "My minimum viable product includes: 1) Pre-built AI chatbot trained on common e-commerce FAQs (shipping, returns, order status), 2) Simple dashboard showing conversation analytics, 3) Email integration for escalating complex queries to humans, 4) One-click Shopify integration. I'm skipping advanced features like multi-language support, custom AI training, and CRM integrations for the MVP."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 10 users, I will: 1) Launch on Product Hunt with a special founder's deal, 2) Post in 5 Shopify Facebook groups with a free trial offer, 3) Reach out to 20 e-commerce businesses personally via LinkedIn with customized demos, 4) Partner with 2 Shopify consultants to recommend my tool, 5) Offer first 10 customers lifetime 50% discount in exchange for testimonials."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing strategy: Early bird special at $49/month (normally $99) for first 10 customers with lifetime discount. This covers up to 1,000 conversations/month. I chose this because competitor pricing ranges from $79-$200/month, and my lower price helps overcome initial trust barriers while still covering hosting costs ($10/month) and OpenAI API fees ($20-30/month per customer)."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "For my AI-powered customer service automation business: Day 30 success definition: 2-3 paying customers at $49/month = $98-147 MRR, 100+ email signups showing strong market interest, 30+ active trial users testing the chatbot and providing feedback, and detailed positive feedback from at least 2 customers confirming this genuinely solves their customer service pain and saves them time/money. Critical success indicator: customers report handling 30-50% of inquiries automatically without human intervention. This validates the business model works, proves AI chatbot quality is production-ready, and gives me confidence to invest more time scaling customer acquisition and product features."
      }
    ]
  },
  {
    id: 2,
    conceptTitle: "Social Commerce Store (TikTok Shop)",
    category: "ecommerce",
    description: "Build a business around social media selling and livestream shopping",
    tags: ["social commerce", "TikTok", "live selling", "Gen Z"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a social commerce business using TikTok Shop and Instagram Shopping to sell trending lifestyle and tech accessories to Gen Z customers. The problem I'm solving is making online shopping more entertaining and social - turning boring product pages into fun, interactive experiences. I have $6,000 budget, social media experience, and can dedicate 30+ hours weekly."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first customers are Gen Z (ages 18-25), active on TikTok 2+ hours daily, interested in aesthetic phone accessories, LED lights, and trendy home decor. They follow lifestyle influencers, engage with #TikTokMadeMeBuyIt content, and prefer discovering products through entertainment rather than traditional ads. I can find them through TikTok FYP, aesthetic Pinterest communities, and Instagram explore page."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week: 1) Create 10 TikTok videos showcasing product ideas and track views/engagement (goal: 10,000 total views), 2) Survey 30 Gen Z friends/online communities about which products they'd buy immediately, 3) Test 5 products from AliExpress with Instagram story polls to gauge interest before buying inventory."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "My MVP includes: 1) TikTok Shop storefront with 10 curated trending products, 2) 3 viral-style TikTok videos per day showing products in use, 3) Simple Instagram Shopping posts, 4) Basic Shopify store as backup. I'm skipping: custom website, influencer partnerships, and multi-platform expansion until I prove TikTok works."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 10 customers: 1) Post 21 TikTok videos (3/day for 7 days) using trending sounds and hashtags, 2) Go live on TikTok 3 times showing products and offering live-exclusive discounts, 3) Engage with 100 comments daily on competitor posts, 4) Share in 3 Gen Z Facebook/Discord communities, 5) Offer first 10 customers 30% off + free shipping."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "For my social commerce business: My pricing strategy: Products range from $12-35 each (2-3x my cost from AliExpress/wholesale suppliers), which is competitive with Amazon but positioned as 'exclusive aesthetic finds' you can't get everywhere. Launch special: 25% off first purchase with code LAUNCH25 to drive initial sales and reviews. This pricing works because Gen Z is willing to pay 20-30% premium for unique, aesthetic products they discover through entertaining social content vs boring mass-market Amazon options. Shipping: $4.99 flat rate or free over $35 to encourage larger orders."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "For my social commerce business: Day 30 success metrics: 10-15 paying customers generating $250-400 total revenue, 1,000+ TikTok followers genuinely engaged with content, at least one video with 50K+ views proving viral content potential, 50-75 email subscribers for future product launches. Key validation: 20%+ of TikTok viewers visit shop link and 3-5% purchase conversion rate. This proves I can create engaging content that actually converts to sales and validates expanding product line and scaling content production with more videos daily."
      }
    ]
  },
  {
    id: 3,
    conceptTitle: "Micro-SaaS for Remote Teams",
    category: "saas",
    description: "Build a focused tool solving one specific remote work problem",
    tags: ["micro-SaaS", "remote work", "productivity", "meetings"],
    difficulty: "Hard",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I'm a software developer building a micro-SaaS tool that helps remote teams reduce meeting fatigue by tracking meeting effectiveness and providing actionable insights. The problem: teams waste 30-50% of meeting time on unproductive discussions, leading to burnout and low morale. My solution integrates with Zoom/Teams to analyze meeting patterns, suggest improvements, and help teams run better, shorter meetings. I have technical skills, $8,000 budget, and can work full-time."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My first customers are remote-first startup teams (10-50 people) led by founders/managers who are frustrated with excessive meetings. They're active in Indie Hackers, Slack communities for remote workers, and follow productivity influencers on Twitter. I can reach them through: Product Hunt, remote work Twitter, posting in r/startups, and LinkedIn outreach to remote company founders."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "Validation plan: 1) Interview 15 remote team leaders about their meeting challenges and willingness to pay for a solution, 2) Create a Typeform survey shared in 5 remote work communities asking about meeting pain points (goal: 100 responses), 3) Build a simple landing page with demo video and track email signups (goal: 30 interested users)."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP features: 1) Zoom integration that tracks meeting duration and participant engagement, 2) Simple dashboard showing weekly meeting stats (time spent, recurring meetings, largest time sinks), 3) Weekly email report with 3 actionable suggestions to reduce meeting time, 4) Basic team sharing. Skipping: AI analysis, calendar integrations, mobile app, advanced analytics until validated."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "Launch plan for first 10 users: 1) Product Hunt launch with founder story and special launch pricing, 2) Post detailed launch story on Indie Hackers with beta access links, 3) Twitter thread about building in public with demo, 4) Direct LinkedIn outreach to 30 remote company founders offering free 2-week trial, 5) Share in 3 Slack communities for remote teams."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "For my micro-SaaS for remote teams: My pricing strategy: $29/month for teams up to 20 people (launch price, normally $49 after first 50 customers). Competitor analysis shows similar meeting analytics tools range from $50-150/month, so I'm positioning as the affordable entry point for small remote teams. This pricing covers my hosting costs ($5/month), Zoom API costs ($10/month per team), and leaves healthy 50%+ margin. First 10 teams get lifetime 50% discount locked in ($29/month forever) in exchange for detailed testimonials, case studies, and feedback to improve the product."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "For my micro-SaaS for remote teams: Day 30 success definition: 3-5 paying teams at $29/month = $87-145 MRR, 50+ trial signups from Product Hunt and outreach, 200+ landing page visitors from launch activities, detailed testimonials from 2 happy customers proving measurable ROI and time saved. Most critical metric: usage data showing teams actually reduced their meeting time by average 15-20% using the tool within first month. This validates clear product-market fit exists and justifies continuing to build more features like calendar integration and AI suggestions."
      }
    ]
  },
  {
    id: 4,
    conceptTitle: "AI Content Creation Agency",
    category: "ai",
    description: "Leverage AI tools to create content for businesses at scale",
    tags: ["AI", "content creation", "marketing", "agency"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I'm a marketer launching an AI content generation agency that creates blog posts, social media content, and marketing copy for small businesses. The problem: businesses need consistent content but can't afford $2,000-5,000/month for traditional agencies. My solution uses AI tools (GPT, Midjourney, Copy.ai) to deliver high-quality content faster and 60% cheaper. I have marketing expertise, $4,000 budget, and can dedicate 40+ hours weekly."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "For my AI content creation agency: My first customers are solo entrepreneurs and small businesses (1-10 employees) in coaching, consulting, real estate, and professional services who know they need consistent content but are overwhelmed by the time and cost of creating it themselves or hiring traditional agencies. They're active in small business Facebook groups, follow marketing influencers on LinkedIn, attend Chamber of Commerce meetings, and search for affordable content solutions online. I can reach them through local business networking events, LinkedIn posts demonstrating AI + content quality, value-driven posts in Facebook groups, and partnerships with web designers and marketing consultants who need content partners."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "For my AI content creation agency: My validation approach: 1) Offer 5 free content audits to local businesses showing gaps in their current content strategy, then pitch paid monthly service at the end - track conversion rate, 2) Create sample AI-generated content portfolio for 5 different industries (coaching, real estate, consulting, healthcare, fitness) and share in business groups to gauge interest and collect feedback, 3) Survey 20-30 small business owners about their current content spend, biggest content pain points, and ideal monthly price point to identify sweet spot pricing and most valuable services."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "For my AI content creation agency: My MVP service offering: 1) Standard monthly package: 4 long-form blog posts (800-1200 words each) + 20 social media posts + 2 email newsletters, all customized to client's brand voice, 2) Simple delivery via Google Docs with two revision rounds included, 3) Custom AI prompts I develop to match each client's voice, tone, and industry, 4) Basic monthly analytics report showing content performance. Explicitly NOT offering yet: custom content portal, video content creation, full SEO optimization services, white-label solutions, or rush delivery until core offering is proven and streamlined."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "For my AI content creation agency: My first client acquisition plan: 1) Offer first 5 clients 'Founding Member' pricing at $497/month (50% off regular rate) locked in for 6 months, in exchange for detailed testimonials and case study participation, 2) LinkedIn content strategy: Daily posts for 21 days showing before/after AI content examples, ROI calculations, and my content creation process, 3) Present at 2 local business networking events with live AI content generation demonstrations, 4) Personal outreach to 25-30 businesses I've identified needing content help through LinkedIn and local directories, 5) Partner with 2-3 web designers, branding consultants, or virtual assistants who can refer content clients."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "For my AI content creation agency: My pricing strategy: Launch at $497/month for standard package (normally $997/month after first 10 clients). This is 50-70% cheaper than traditional content agencies ($2,000-5,000/month) but still highly profitable because AI tools cost only ~$50/month and content creation takes me 5-8 hours versus traditional 20-30 hours per client. Positioning as premium AI-enhanced quality at accessible small business prices. First 5 clients get founding rate of $497/month locked in for 6 months. Additional services: rush delivery (+$200), extra blog posts ($100 each), video scripts ($150 each)."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "For my AI content creation agency: Day 30 success metrics: 2-3 paying clients at $497/month = $994-1,491 MRR, 10-12 discovery calls completed showing strong interest, 5+ proposals sent to qualified leads, portfolio of 30+ high-quality content pieces across multiple industries to showcase. Key validation signals: clients confirm content quality matches their brand voice and drives measurable engagement (website traffic, social engagement, email opens). This proves the AI-enhanced + human oversight model works and I can confidently scale by refining processes and potentially hiring part-time editors or account managers."
      }
    ]
  },
  {
    id: 5,
    conceptTitle: "Sustainable E-commerce Store",
    category: "ecommerce",
    description: "Starting an eco-friendly online retail business",
    tags: ["sustainability", "e-commerce", "retail", "eco-friendly"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start an e-commerce business selling sustainable, eco-friendly products with carbon-neutral shipping and plastic-free packaging. The problem: environmentally conscious consumers struggle to find genuinely sustainable alternatives that aren't greenwashed or overpriced. My solution curates verified eco-friendly products with full transparency on environmental impact. I have $5,000 to start, marketing experience, and can dedicate 20-30 hours per week."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "For my sustainable e-commerce store: My ideal customers are environmentally conscious millennials and Gen Z (25-35 years old) who actively try to reduce waste, follow sustainability influencers on Instagram, participate in Buy Nothing groups, and read blogs like Treehugger. They shop at Whole Foods, bring reusable bags everywhere, and are willing to pay 15-20% premium for verified sustainable products. I'll find them in zero-waste Facebook groups, sustainability subreddits, r/zerowaste, Instagram eco-communities (#sustainableliving, #zerowaste), and through partnerships with eco-bloggers."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "For my sustainable e-commerce store: My validation approach this week: 1) Survey 50 people in zero-waste communities about their biggest challenges finding sustainable products, price sensitivity, and which product categories they need most, 2) Create Instagram polls asking which products they'd buy immediately (home goods, beauty, kitchen, clothing), 3) Test-sell 5 curated eco-friendly products on Etsy first to validate demand before building full store - track which products get most views and sales. Target: 10-15 Etsy sales proving demand exists."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "For my sustainable e-commerce store: My MVP includes: Simple Shopify store with 15-20 carefully curated products in 3 core categories (kitchen essentials, beauty/personal care, home goods). Each product page features detailed sustainability credentials, environmental impact metrics, and transparent sourcing information. Standard features: plastic-free shipping materials, carbon-neutral shipping through offset partner, email collection for launch list. Explicitly skipping: subscription boxes, mobile app, loyalty program, blog, extensive product range, custom packaging until core store is validated with customers."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "For my sustainable e-commerce store: My first customer acquisition plan: 1) Partner with 3-5 micro-influencers in sustainability space (10K-50K followers) for honest product reviews and unboxing content, 2) Launch week promotion: 25% off first order shared in 5-7 zero-waste Facebook groups and subreddits, 3) Create valuable free content (plastic-free living starter guide, sustainable swaps cheat sheet) to share in eco-communities with soft product mentions, 4) Instagram giveaway targeting first 100 followers, 5) Direct outreach to 10 sustainability bloggers for feature opportunities. Launch offer: First 25 customers get 30% off + free shipping."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "For my sustainable e-commerce store: My pricing strategy: Products marked up 2.5-3x wholesale cost, with most items averaging $20-45. This covers product cost, plastic-free packaging, carbon offset shipping, platform fees, and 30-40% margin. Launch promotion: 20% off first order plus free carbon-neutral shipping over $50. This premium positioning works because sustainable product customers expect to pay more for ethical sourcing and environmental benefits. Competitive analysis shows similar verified eco-products sell for 2-3x my planned prices on larger platforms, so I'm positioned as affordable sustainability."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "For my sustainable e-commerce store: Day 30 success metrics: 15-20 orders totaling $500-700 revenue, 500+ Instagram followers engaged with eco-content, 100-150 email subscribers for future launches, 5+ five-star product reviews emphasizing sustainability value, 20% of customers signing up for restock alerts on sold-out items. This validates: 1) Product-market fit exists for curated eco-products, 2) Premium pricing is acceptable to target market, 3) Social media and community marketing channels work effectively. These numbers justify expanding product line and increasing marketing budget."
      }
    ]
  },

  // Standard template concepts (IDs 6-48) - Using helper function for steps 2-7
  {
    id: 6,
    conceptTitle: "No-Code AI App Builder Service",
    category: "ai",
    description: "Help businesses build AI-powered apps without coding",
    tags: ["no-code", "AI", "app development", "B2B"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a service that helps small businesses build AI-powered applications using no-code platforms like Bubble, Zapier, and AI APIs. I have some technical skills, $5,000 budget, and can work full-time. My target is businesses that want AI functionality but can't afford custom development."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first clients are small businesses (5-25 employees) in professional services, local retail, and coaching who see competitors using AI tools but don't have technical teams or $50K+ budgets for custom development. They're active in small business Facebook groups, local Chamber of Commerce meetings, and follow no-code/automation influencers on LinkedIn. I can reach them through: LinkedIn posts showing AI automation demos, local business networking events, partnerships with web designers/consultants, and posting in r/smallbusiness about AI use cases."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "Validation approach: 1) Offer 5 free AI automation audits to local businesses - show them where AI could save time/money and pitch paid implementation, tracking interest level and pricing feedback, 2) Create 3 sample AI app demos for common use cases (appointment booking bot, customer FAQ assistant, lead qualifier) and share in business communities to gauge demand, 3) Survey 25 small business owners about their biggest manual tasks, budget for automation, and willingness to pay for no-code AI solutions."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP service offering: 1) Standard AI app package: needs analysis call + app built on Bubble/Softr with OpenAI integration + 2 revision rounds, 2) Three pre-defined app types: customer service chatbot, appointment scheduler, or lead qualification tool, 3) Simple handoff: video walkthrough + basic documentation, 4) 30-day email support included. NOT offering yet: custom apps outside three templates, ongoing maintenance packages, mobile apps, or complex integrations until proven these three types work."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "First client acquisition plan: 1) Offer first 5 clients 'Founding Client' rate of $1,497 (normally $2,997) for complete AI app in exchange for detailed video testimonial and case study, 2) LinkedIn strategy: Post 3x weekly showing before/after of manual process vs AI automation with ROI calculations, 3) Present at 2 local business networking events with live demo of AI chatbot being built in 10 minutes, 4) Partner with 3 web designers/virtual assistants who work with small businesses for referral commissions, 5) Personal outreach to 20 businesses I identify with obvious automation opportunities."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing structure: One-time project fee of $2,997 for standard AI app (chatbot, scheduler, or lead qualifier) including discovery, build, handoff, and 30-day support. This pricing factors in: 15-20 hours of my time, no-code platform costs ($50-100), OpenAI API setup, and healthy margin for my expertise. Competitive analysis shows custom AI development costs $15K-50K, and freelance developers charge $5K-10K, so I'm positioned as the affordable productized option. First 5 clients get founding rate of $1,497. Add-ons available: monthly maintenance ($297/month), additional app types (+$2,000 each), custom features (quoted separately)."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Day 30 success metrics: 2-3 paying clients generating $3K-6K total revenue, 15+ qualified leads from networking and LinkedIn, 8+ discovery calls completed, delivered at least 1 complete AI app with client reporting measurable time/cost savings. Key validation: client uses the app daily and refers 1+ other businesses. Portfolio includes 2-3 case studies with before/after metrics (hours saved, costs reduced, leads captured). This proves the service model works, delivery is smooth, and pricing is attractive enough while remaining profitable. Next steps: hire part-time no-code developer to scale delivery."
      }
    ]
  },
  {
    id: 7,
    conceptTitle: "Creator Management Platform",
    category: "creator",
    description: "Help content creators manage their business operations",
    tags: ["creator economy", "SaaS", "influencer marketing", "B2B"],
    difficulty: "Hard",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to build a SaaS platform that helps content creators manage their brand partnerships, sponsorship deals, content calendar, and finances in one place. I have business experience, $12,000 budget, and can work full-time. The target market is mid-tier creators (10K-500K followers) who are getting overwhelmed managing their creator business."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first customers are mid-tier content creators (10K-500K followers) on YouTube, Instagram, and TikTok who are juggling 5-10 brand partnerships monthly and struggling with disorganized emails, missed deadlines, and unclear revenue tracking. They're active in creator Discord servers, YouTuber subreddits like r/PartneredYoutube, and follow creator economy newsletters like Passionfroot and The Publish Press. I can reach them through: creator-focused LinkedIn posts, Twitter threads about creator business challenges, partnerships with creator coaching services, and targeted Instagram ads to creators in the 50K-200K follower range."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week: 1) Interview 15 mid-tier creators about their biggest partnership management pain points, current tools used (likely spreadsheets + email), and willingness to pay for an all-in-one solution, 2) Create a landing page showcasing key features (deal tracker, payment timeline, content calendar) with Loom video demo and collect 50+ email signups from creator communities, 3) Analyze 5 competitor tools (Aspire, Grin, CreatorIQ) to identify gaps - they serve either mega-influencers or brands, not mid-tier creators directly."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "My minimum viable product includes: 1) Brand deal pipeline tracker showing status of each partnership (negotiating, content creation, payment pending), 2) Content calendar with deliverable due dates and automated reminders, 3) Income dashboard tracking payments by brand and month, 4) Simple file storage for contracts and brand guidelines, 5) Email integration to import deal details automatically. I'm skipping: team collaboration features, analytics/reporting, media kit generator, tax calculation tools, and mobile app until I validate the core workflow solves the main pain."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 10 creator users: 1) Launch on Product Hunt with creator-focused positioning and early bird lifetime deal, 2) Partner with 3 creator coaches/consultants to recommend my tool to their clients in exchange for affiliate commission, 3) Create Twitter thread about 'how I manage $50K+ in creator deals' with screenshots of the tool, offering beta access, 4) Post in 5 creator Discord servers and subreddits with helpful content about organization, soft mentioning my tool, 5) Direct outreach to 30 creators in my target range via Instagram DMs explaining the tool. Offer first 10 users lifetime 60% discount in exchange for detailed feedback and testimonials."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing strategy: $29/month for individual creators (launch price, normally $49 after first 100 users). This pricing is positioned below enterprise tools ($200-500/month) but above simple productivity apps ($10-15/month), reflecting the revenue-generating value creators get from better deal management. Cost structure: hosting and database ($15/month for first 50 users), email integration API ($50/month), development time. First 10 users get lifetime rate of $29/month locked in. Revenue goal: 50 paying creators at $29 = $1,450 MRR to validate market and fund feature development."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Day 30 success definition: 5-8 paying creator users generating $145-230 MRR, 100+ email signups showing strong interest, 20+ active trial users testing the platform, and detailed feedback from 3 power users confirming this solves their deal management chaos. Critical metric: creators report saving 3-5 hours weekly on admin work and never missing a partnership deadline. This validates product-market fit exists, proves creators will pay for better business tools, and justifies building advanced features like analytics, media kit generation, and team collaboration."
      }
    ]
  },
  {
    id: 8,
    conceptTitle: "Course Creation Consultancy",
    category: "creator",
    description: "Help experts turn knowledge into profitable online courses",
    tags: ["online courses", "consulting", "education", "expertise monetization"],
    difficulty: "Medium",
    steps: [
      {
        step: 1,
        title: "Business Concept",
        dayRange: "Days 1-2",
        prompt: "I want to start a consultancy that helps professionals and experts create, launch, and market online courses. I have marketing and educational background, $3,000 budget, and can start part-time. My goal is to help people monetize their expertise through course creation, from content development to launch strategy."
      },
      {
        step: 2,
        title: "Target Customer",
        dayRange: "Days 3-4",
        prompt: "My ideal first clients are subject matter experts (consultants, coaches, corporate trainers) with 5-15 years experience who want to scale their knowledge into passive income but don't know where to start with online courses. They're active in LinkedIn professional groups, attend industry conferences, and follow online education influencers. I can reach them through: LinkedIn posts about course creation ROI, speaking at professional association meetings, partnerships with business coaches, and posting in industry-specific Facebook groups about knowledge monetization."
      },
      {
        step: 3,
        title: "Validation Plan",
        dayRange: "Days 5-7",
        prompt: "To validate demand this week: 1) Offer 5 free 30-minute course strategy sessions to potential clients - diagnose their expertise, identify course topic, and pitch full service at the end, 2) Create simple course creation roadmap template and share in 5 professional groups asking for feedback on biggest barriers to course creation, 3) Interview 15 subject matter experts about why they haven't created a course yet, their revenue goals, and what support they'd pay for."
      },
      {
        step: 4,
        title: "MVP Design",
        dayRange: "Days 8-14",
        prompt: "MVP service offering: 1) Course Blueprint Package: 3 consulting calls to define course topic, outline modules, identify target students, and create launch plan, 2) Content guidance templates for video scripts and workbooks, 3) Platform selection help (Teachable vs Kajabi vs Thinkific), 4) Launch strategy roadmap with specific marketing tactics. I'm skipping: done-for-you content creation, video production, sales funnels, email marketing execution, and ongoing promotion until clients validate they want help with strategy first."
      },
      {
        step: 5,
        title: "Launch Strategy",
        dayRange: "Days 15-21",
        prompt: "To get my first 5 clients: 1) Offer 'Founding Client' rate of $1,997 (normally $3,997) for complete Course Blueprint Package in exchange for video testimonial and detailed case study, 2) LinkedIn content strategy: 3 posts weekly about course creation myths, success stories, and revenue potential for experts, 3) Host free webinar 'How to Turn Your Expertise Into a $10K Course in 90 Days' targeting 30+ attendees and pitching service at end, 4) Partner with 2 business coaches who can refer clients ready to scale, 5) Direct outreach to 25 consultants/experts I identify on LinkedIn with obvious monetizable expertise."
      },
      {
        step: 6,
        title: "Pricing Model",
        dayRange: "Days 22-25",
        prompt: "Pricing strategy: $3,997 one-time fee for Course Blueprint Package (strategy + guidance + launch plan). This pricing reflects: 10-12 hours of consulting time, templates and frameworks, platform recommendations, and ongoing email support for 60 days. Competitive analysis shows course creation agencies charge $10K-25K for full done-for-you, and DIY courses teach for $500-1,000, so I'm positioned as the affordable expert guidance option. First 5 clients get founding rate of $1,997. Add-ons: launch support package ($2,000), tech setup service ($500), ongoing coaching ($500/month)."
      },
      {
        step: 7,
        title: "Day 30 Success Metrics",
        dayRange: "Days 26-30",
        prompt: "Day 30 success definition: 2-3 paying clients generating $4K-6K revenue, 15+ strategy session requests showing demand, 10+ discovery calls completed, delivered complete Course Blueprint to at least 1 client who begins content creation. Key validation: clients report having clear course roadmap and confidence to create their first course. Portfolio includes 2 detailed case studies. This proves the consulting model works, pricing is attractive for the value provided, and I can help experts successfully plan profitable courses. Next steps: systemize delivery process and add done-for-you services based on client feedback."
      }
    ]
  },
  {
    id: 9,
    conceptTitle: "Micro-Influencer Marketplace",
    category: "creator",
    description: "Connect local businesses with micro-influencers",
    tags: ["influencer marketing", "marketplace", "local business", "micro-influencers"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Micro-Influencer Marketplace",
      "I want to create a platform that connects local businesses with micro-influencers (1K-50K followers) in their area for authentic marketing campaigns. I have marketing experience, $8,000 budget, and can work full-time. The focus is on local restaurants, shops, and services working with community influencers."
    )
  },
  {
    id: 10,
    conceptTitle: "Subscription Box for Remote Workers",
    category: "ecommerce",
    description: "Curated productivity and wellness items for remote professionals",
    tags: ["subscription", "remote work", "productivity", "wellness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Subscription Box for Remote Workers",
      "I want to launch a subscription box service targeting remote workers and digital nomads, featuring productivity tools, ergonomic accessories, healthy snacks, and wellness items. I have $10,000 budget, some e-commerce experience, and can work full-time. The target audience is remote professionals who want to improve their home office setup and wellbeing."
    )
  },
  {
    id: 11,
    conceptTitle: "AI-Powered Project Management Tool",
    category: "saas",
    description: "Smart project management with AI assistance and automation",
    tags: ["saas", "AI", "project management", "automation"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Project Management Tool",
      "I want to create a SaaS project management tool that uses AI to predict project delays, suggest optimal task assignments, and automate routine project management tasks. I have technical skills, $15,000+ budget, and can work full-time. The target market is mid-size companies (50-200 employees) struggling with project visibility."
    )
  },
  {
    id: 12,
    conceptTitle: "Mobile App for Local Services",
    category: "saas",
    description: "Connecting service providers with customers",
    tags: ["mobile app", "marketplace", "local services", "on-demand"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Mobile App for Local Services",
      "I'm planning a mobile app that connects local service providers (plumbers, electricians, cleaners) with customers who need quick help. I have technical skills, $15,000 budget, and can work full-time. Think 'Uber for home services' but focused on my local market first with same-day booking capabilities."
    )
  },
  {
    id: 13,
    conceptTitle: "Carbon Footprint Tracking SaaS",
    category: "sustainability",
    description: "Help businesses measure and reduce their environmental impact",
    tags: ["climate tech", "sustainability", "SaaS", "ESG reporting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Carbon Footprint Tracking SaaS",
      "I want to create a SaaS platform that helps small and medium businesses track their carbon footprint, get actionable reduction recommendations, and report on their sustainability progress. I have environmental science background, $12,000 budget, and can work full-time. The target market is companies preparing for ESG reporting requirements."
    )
  },
  {
    id: 14,
    conceptTitle: "Renewable Energy Consulting",
    category: "sustainability",
    description: "Help homeowners and businesses transition to clean energy",
    tags: ["renewable energy", "consulting", "solar", "sustainability"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Renewable Energy Consulting",
      "I want to start a consulting business that helps homeowners and small businesses evaluate, plan, and implement renewable energy solutions like solar panels and battery storage. I have engineering background, $4,000 budget, and can start part-time. My goal is to make the transition to clean energy simple and cost-effective."
    )
  },
  {
    id: 15,
    conceptTitle: "Sustainable Product Marketplace",
    category: "sustainability",
    description: "Curated platform for verified eco-friendly products",
    tags: ["marketplace", "sustainability", "eco-friendly", "conscious consumption"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Sustainable Product Marketplace",
      "I want to create an online marketplace exclusively for verified sustainable and eco-friendly products, with strict vetting criteria and transparent impact metrics. I have e-commerce experience, $8,000 budget, and can work full-time. The platform will focus on helping conscious consumers find genuinely sustainable alternatives to everyday products."
    )
  },
  {
    id: 16,
    conceptTitle: "Mental Health App for Remote Workers",
    category: "health",
    description: "Digital wellness solution for isolated remote professionals",
    tags: ["mental health", "remote work", "wellness app", "burnout prevention"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Mental Health App for Remote Workers",
      "I want to develop a mental health and wellness app specifically for remote workers dealing with isolation, work-life balance issues, and burnout. I have psychology background, $10,000 budget, and can work full-time. The app should include guided meditations, virtual coworking sessions, and mood tracking."
    )
  },
  {
    id: 17,
    conceptTitle: "Senior Care Coordination Service",
    category: "health",
    description: "Help families manage elderly care with technology",
    tags: ["elderly care", "health tech", "family coordination", "aging population"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Senior Care Coordination Service",
      "I want to start a service that helps families coordinate care for elderly parents using a combination of technology and personal support. I have healthcare experience, $6,000 budget, and can dedicate 40+ hours weekly. The service will include medication reminders, appointment scheduling, and family communication tools."
    )
  },
  {
    id: 18,
    conceptTitle: "Corporate Wellness Platform",
    category: "health",
    description: "Comprehensive employee wellness programs for modern workplaces",
    tags: ["corporate wellness", "employee health", "B2B", "workplace wellness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Corporate Wellness Platform",
      "I want to create a comprehensive wellness platform for companies to improve employee health and reduce healthcare costs. I have HR and wellness background, $12,000 budget, and can work full-time. The platform should include fitness challenges, mental health resources, nutrition tracking, and stress management tools."
    )
  },
  {
    id: 19,
    conceptTitle: "Local Fitness Coaching with Virtual Reality",
    category: "local",
    description: "Combine in-person and VR fitness experiences",
    tags: ["fitness", "VR", "local", "innovative training"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Local Fitness Coaching with Virtual Reality",
      "I'm a certified personal trainer who wants to start a fitness business combining traditional personal training with virtual reality workout experiences. I have fitness expertise, $8,000 budget including VR equipment, and can work full-time. The target market is tech-savvy fitness enthusiasts looking for immersive workout experiences."
    )
  },
  {
    id: 20,
    conceptTitle: "Hyperlocal Delivery Network",
    category: "local",
    description: "Same-day delivery for local businesses and residents",
    tags: ["delivery", "local business", "logistics", "community"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Hyperlocal Delivery Network",
      "I want to create a hyperlocal delivery network that helps local businesses offer same-day delivery while also providing personal shopping and errand services for busy residents. I have logistics experience, $7,000 budget, and can work full-time. The focus is on building a strong community network of reliable delivery partners."
    )
  },
  {
    id: 21,
    conceptTitle: "Coworking Space for Creators",
    category: "local",
    description: "Physical space designed for content creators and digital professionals",
    tags: ["coworking", "content creation", "real estate", "community"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Coworking Space for Creators",
      "I want to open a coworking space specifically designed for content creators, including podcast studios, video recording rooms, and photography setups alongside traditional workspaces. I have real estate experience, $25,000 budget, and can commit full-time. The target market is freelance creators, small agencies, and remote workers."
    )
  },
  {
    id: 22,
    conceptTitle: "AI Implementation Consultancy",
    category: "consulting",
    description: "Help businesses integrate AI tools into their operations",
    tags: ["AI consulting", "business automation", "digital transformation", "B2B"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "AI Implementation Consultancy",
      "I want to start a consultancy that helps small and medium businesses identify and implement AI tools to improve their operations, from customer service chatbots to automated data analysis. I have business and technical background, $5,000 budget, and can dedicate 35+ hours weekly. My goal is to democratize AI adoption for smaller companies."
    )
  },
  {
    id: 23,
    conceptTitle: "Remote Work Transition Consulting",
    category: "consulting",
    description: "Help traditional businesses successfully adopt remote work",
    tags: ["remote work", "organizational change", "HR consulting", "business transformation"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Remote Work Transition Consulting",
      "I want to help traditional businesses successfully transition to hybrid or fully remote work models. I have HR and organizational psychology background, $3,000 budget, and can start part-time. My services include culture assessment, tool recommendations, policy development, and change management for remote work adoption."
    )
  },
  {
    id: 24,
    conceptTitle: "Sustainability Compliance Consulting",
    category: "consulting",
    description: "Help businesses meet new environmental regulations and ESG requirements",
    tags: ["ESG consulting", "sustainability", "compliance", "environmental regulations"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Sustainability Compliance Consulting",
      "I want to start a consulting practice that helps businesses comply with increasing environmental regulations and ESG reporting requirements. I have environmental law and business background, $4,000 budget, and can work 30+ hours weekly. My target clients are mid-size companies facing new sustainability compliance challenges."
    )
  },
  {
    id: 25,
    conceptTitle: "Digital Estate Planning Service",
    category: "consulting",
    description: "Help people manage their digital assets and online presence after death",
    tags: ["digital estate", "legacy planning", "digital assets", "legal services"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Digital Estate Planning Service",
      "I want to create a service that helps people organize and plan for their digital assets, social media accounts, cryptocurrency, and online subscriptions for when they pass away. I have legal background, $3,500 budget, and can start part-time. This addresses the growing need for digital legacy planning in our increasingly online world."
    )
  },
  {
    id: 26,
    conceptTitle: "Loneliness Solutions Platform",
    category: "health",
    description: "Combat social isolation with community-building technology",
    tags: ["social connection", "community building", "mental health", "loneliness"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Loneliness Solutions Platform",
      "I want to create a platform that helps combat loneliness and social isolation by connecting people with shared interests for both virtual and in-person activities. I have community organizing experience, $9,000 budget, and can work full-time. The focus is on creating meaningful connections for people struggling with social isolation, especially post-pandemic."
    )
  },
  {
    id: 27,
    conceptTitle: "AI Voice Assistant for Seniors",
    category: "saas",
    description: "Voice-activated companion and helper for elderly users",
    tags: ["AI", "voice technology", "elderly care", "healthcare"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Voice Assistant for Seniors",
      "I want to create an AI-powered voice assistant specifically designed for seniors to help with medication reminders, emergency contacts, entertainment, and staying connected with family. I have tech background, $12,000 budget, and can work full-time. The product should be simple, reliable, and focused on improving quality of life for aging adults."
    )
  },
  {
    id: 28,
    conceptTitle: "AI-Powered Personal Finance Coach",
    category: "saas",
    description: "Smart financial planning and budgeting with AI insights",
    tags: ["AI", "fintech", "personal finance", "budgeting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Personal Finance Coach",
      "I want to develop an AI-driven personal finance app that analyzes spending patterns, predicts future expenses, and provides personalized budgeting and investment advice. I have fintech experience, $15,000 budget, and can dedicate full-time. Target audience is millennials and Gen Z looking for smarter money management."
    )
  },
  {
    id: 29,
    conceptTitle: "No-Code AI Automation Platform",
    category: "saas",
    description: "Help small businesses automate tasks without coding",
    tags: ["no-code", "AI automation", "small business", "productivity"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "No-Code AI Automation Platform",
      "I want to create a no-code platform that allows small business owners to build AI-powered automations for customer service, data entry, and marketing tasks. I have technical background, $20,000+ budget, and can work full-time. The goal is to make AI automation accessible to non-technical business owners."
    )
  },
  {
    id: 30,
    conceptTitle: "AI Content Creation Studio",
    category: "creator",
    description: "AI-powered tools for content creators and marketers",
    tags: ["AI content", "creator tools", "video editing", "automation"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Content Creation Studio",
      "I want to launch a service that helps content creators and small businesses generate high-quality video, image, and text content using AI tools. I have marketing and design experience, $8,000 budget, and can work full-time. The service includes AI video editing, thumbnail generation, and content scheduling across platforms."
    )
  },
  {
    id: 31,
    conceptTitle: "Virtual Event Production Company",
    category: "creator",
    description: "Professional virtual and hybrid event planning and execution",
    tags: ["virtual events", "event planning", "business services", "technology"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Virtual Event Production Company",
      "I want to start an event production company specializing in virtual and hybrid events for businesses, creators, and organizations. I have event planning experience, $10,000 budget, and can work full-time. Services include technical setup, engagement strategies, and post-event analytics for immersive online experiences."
    )
  },
  {
    id: 32,
    conceptTitle: "Creator Analytics & Growth Platform",
    category: "creator",
    description: "Data-driven insights for content creator success",
    tags: ["creator analytics", "social media", "data analysis", "growth hacking"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Creator Analytics & Growth Platform",
      "I want to build a platform that provides deep analytics and growth strategies for content creators across multiple platforms (TikTok, Instagram, YouTube, etc.). I have data analysis background, $12,000 budget, and can work full-time. The platform will offer audience insights, optimal posting times, and content performance predictions."
    )
  },
  {
    id: 33,
    conceptTitle: "AI Mental Health Screening App",
    category: "health",
    description: "Early detection and intervention for mental health issues",
    tags: ["mental health", "AI", "healthcare", "prevention"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI Mental Health Screening App",
      "I want to develop an app that uses AI to analyze text, voice, and behavioral patterns to provide early mental health screening and connect users with appropriate resources. I have psychology and tech background, $15,000 budget, and can work full-time. The focus is on preventive mental healthcare and reducing barriers to treatment."
    )
  },
  {
    id: 34,
    conceptTitle: "Personalized Nutrition Planning Service",
    category: "health",
    description: "AI-driven meal planning based on individual health data",
    tags: ["nutrition", "personalized medicine", "meal planning", "health optimization"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Personalized Nutrition Planning Service",
      "I want to create a service that combines genetic testing, health metrics, and lifestyle data to provide personalized nutrition plans and meal recommendations. I have nutrition background, $10,000 budget, and can work full-time. The service includes meal delivery partnerships and health tracking integration."
    )
  },
  {
    id: 35,
    conceptTitle: "Workplace Wellness Coaching",
    category: "health",
    description: "On-site and virtual wellness programs for companies",
    tags: ["workplace wellness", "coaching", "corporate health", "stress management"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Workplace Wellness Coaching",
      "I want to start a wellness coaching business that provides on-site and virtual wellness programs for companies dealing with employee burnout and stress. I have wellness coaching certification, $5,000 budget, and can start part-time. Services include stress management workshops, fitness classes, and mental health first aid training."
    )
  },
  {
    id: 36,
    conceptTitle: "Carbon Credit Marketplace for SMBs",
    category: "sustainability",
    description: "Simplified carbon offsetting for small businesses",
    tags: ["carbon credits", "climate tech", "sustainability", "marketplace"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Carbon Credit Marketplace for SMBs",
      "I want to create a marketplace that makes it easy for small businesses to purchase verified carbon credits and track their carbon neutrality progress. I have environmental science background, $12,000 budget, and can work full-time. The platform will focus on transparency, affordability, and measurable impact for climate-conscious SMBs."
    )
  },
  {
    id: 37,
    conceptTitle: "Sustainable Fashion Rental Platform",
    category: "sustainability",
    description: "Circular fashion economy through clothing rental",
    tags: ["sustainable fashion", "rental economy", "circular economy", "clothing"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Sustainable Fashion Rental Platform",
      "I want to launch a clothing rental platform focused on sustainable fashion brands, targeting environmentally conscious consumers who want to reduce textile waste. I have fashion industry experience, $15,000 budget, and can work full-time. The platform includes professional cleaning, style consultations, and rent-to-own options."
    )
  },
  {
    id: 38,
    conceptTitle: "Home Energy Optimization Service",
    category: "sustainability",
    description: "Smart home energy auditing and optimization",
    tags: ["energy efficiency", "smart home", "renewable energy", "home optimization"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Home Energy Optimization Service",
      "I want to start a service that helps homeowners optimize their energy usage through smart home technology, solar installations, and energy-efficient upgrades. I have electrical engineering background, $8,000 budget, and can work full-time. The service includes energy audits, smart device installation, and ongoing optimization."
    )
  },
  {
    id: 39,
    conceptTitle: "AI-Powered Learning Platform for Kids",
    category: "saas",
    description: "Personalized education technology for children",
    tags: ["EdTech", "AI", "children's education", "personalized learning"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "AI-Powered Learning Platform for Kids",
      "I want to create an AI-powered learning platform that adapts to each child's learning style and pace, making education more engaging and effective. I have education and tech background, $18,000 budget, and can work full-time. The platform covers core subjects with gamification, progress tracking, and parent insights."
    )
  },
  {
    id: 40,
    conceptTitle: "Professional Skills Bootcamp",
    category: "consulting",
    description: "Intensive training for in-demand digital skills",
    tags: ["skills training", "bootcamp", "professional development", "career transition"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Professional Skills Bootcamp",
      "I want to start intensive bootcamp programs teaching high-demand skills like AI prompt engineering, no-code development, and digital marketing to professionals looking to upskill. I have training and business background, $7,000 budget, and can work full-time. Programs will be project-based with job placement assistance."
    )
  },
  {
    id: 41,
    conceptTitle: "Language Learning for Remote Workers",
    category: "saas",
    description: "Business-focused language learning with cultural context",
    tags: ["language learning", "remote work", "business communication", "cultural training"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Language Learning for Remote Workers",
      "I want to develop a language learning platform specifically for remote workers who need to communicate effectively in international business settings. I have linguistics background, $10,000 budget, and can work full-time. The platform focuses on business communication, cultural awareness, and virtual meeting skills."
    )
  },
  {
    id: 42,
    conceptTitle: "Neighborhood Social Network",
    category: "local",
    description: "Hyperlocal community platform for neighbors",
    tags: ["community building", "social network", "local services", "neighborhood"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Neighborhood Social Network",
      "I want to create a social network app that connects neighbors for local recommendations, community events, skill sharing, and mutual aid. I have community organizing experience, $8,000 budget, and can work full-time. The platform emphasizes safety, verification, and building stronger local communities."
    )
  },
  {
    id: 43,
    conceptTitle: "Mobile Car Care Service",
    category: "local",
    description: "On-demand automotive maintenance and detailing",
    tags: ["automotive", "mobile service", "convenience", "on-demand"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Mobile Car Care Service",
      "I want to start a mobile car care service that comes to customers' locations for routine maintenance, detailing, and minor repairs. I have automotive experience, $12,000 budget for equipment and vehicle, and can work full-time. The service targets busy professionals and includes electric vehicle specialization."
    )
  },
  {
    id: 44,
    conceptTitle: "Senior Tech Support Service",
    category: "local",
    description: "Patient technology help for elderly users",
    tags: ["senior services", "tech support", "elderly care", "digital literacy"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Senior Tech Support Service",
      "I want to start a business providing patient, in-home technology support for seniors who struggle with smartphones, tablets, and smart home devices. I have customer service background, $3,000 budget, and can start part-time. Services include device setup, training, and ongoing support with a focus on safety and simplicity."
    )
  },
  {
    id: 45,
    conceptTitle: "Micro-Investment App for Gen Z",
    category: "saas",
    description: "Social investing platform for young investors",
    tags: ["fintech", "micro-investing", "Gen Z", "social investing"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Micro-Investment App for Gen Z",
      "I want to create a micro-investment app that makes investing accessible and social for Gen Z users through fractional shares, gamification, and peer learning. I have fintech experience, $25,000+ budget, and can work full-time. The app includes investment education, social features, and integration with popular payment apps."
    )
  },
  {
    id: 46,
    conceptTitle: "Freelancer Financial Management",
    category: "saas",
    description: "All-in-one financial platform for independent contractors",
    tags: ["freelancer tools", "financial management", "gig economy", "accounting"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Freelancer Financial Management",
      "I want to build a financial management platform specifically for freelancers and independent contractors, including invoicing, expense tracking, tax preparation, and retirement planning. I have accounting background, $15,000 budget, and can work full-time. The platform addresses the unique financial challenges of gig economy workers."
    )
  },
  {
    id: 47,
    conceptTitle: "Telemedicine Platform for Rural Areas",
    category: "health",
    description: "Bridge healthcare gaps in underserved communities",
    tags: ["telemedicine", "rural healthcare", "health equity", "digital health"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Telemedicine Platform for Rural Areas",
      "I want to create a telemedicine platform specifically designed for rural and underserved communities, with features like mobile connectivity optimization and local health worker integration. I have healthcare and tech background, $20,000+ budget, and can work full-time. The goal is to improve healthcare access where traditional services are limited."
    )
  },
  {
    id: 48,
    conceptTitle: "Pet Health Monitoring Service",
    category: "health",
    description: "Tech-enabled preventive care for pets",
    tags: ["pet health", "wearable tech", "veterinary care", "AI monitoring"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Pet Health Monitoring Service",
      "I want to launch a service that uses wearable devices and AI to monitor pet health, detect early signs of illness, and provide personalized care recommendations to pet owners. I have veterinary background, $12,000 budget, and can work full-time. The service includes vet consultations and emergency alerts for pet health issues."
    )
  },
  {
    id: 49,
    conceptTitle: "AI Resume Builder & Career Coach",
    category: "saas",
    description: "AI-powered resume optimization and career guidance platform",
    tags: ["AI", "career services", "job search", "professional development"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "AI Resume Builder & Career Coach",
      "I want to create an AI-powered platform that helps job seekers optimize their resumes, prepare for interviews, and get personalized career advice. I have HR and tech background, $8,000 budget, and can work full-time. The platform analyzes job descriptions, suggests improvements, and provides industry-specific guidance for career advancement."
    )
  },
  {
    id: 50,
    conceptTitle: "Podcast Production Agency",
    category: "creator",
    description: "Full-service podcast creation and management for businesses and creators",
    tags: ["podcasting", "audio production", "content creation", "business services"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Podcast Production Agency",
      "I want to start an agency that handles everything for clients who want to launch podcasts: recording, editing, show notes, distribution, and promotion. I have audio production experience, $6,000 budget for equipment, and can work full-time. Target clients are thought leaders, businesses, and creators who want professional podcast production without the technical hassle."
    )
  },
  {
    id: 51,
    conceptTitle: "Smart Home Installation Service",
    category: "local",
    description: "Professional setup and integration of smart home devices",
    tags: ["smart home", "IoT", "home automation", "local services"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Smart Home Installation Service",
      "I want to offer professional smart home installation and setup services for homeowners who want automation but find it overwhelming. I have technical skills, $4,000 budget for tools and marketing, and can start part-time. Services include device installation, network optimization, automation setup, and ongoing support for smart homes."
    )
  },
  {
    id: 52,
    conceptTitle: "B2B Lead Generation SaaS",
    category: "saas",
    description: "Automated lead finding and qualification for B2B sales teams",
    tags: ["B2B", "sales automation", "lead generation", "AI"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "B2B Lead Generation SaaS",
      "I want to build a SaaS tool that uses AI to find, qualify, and enrich B2B leads automatically by scraping LinkedIn, company websites, and databases. I have sales and tech background, $15,000 budget, and can work full-time. The platform provides verified contact info, company insights, and personalized outreach suggestions for sales teams."
    )
  },
  {
    id: 53,
    conceptTitle: "Sustainable Meal Prep Service",
    category: "local",
    description: "Locally-sourced meal prep with eco-friendly packaging",
    tags: ["food service", "sustainability", "meal prep", "local business"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Sustainable Meal Prep Service",
      "I want to start a meal prep business that sources ingredients from local farms, uses compostable packaging, and delivers healthy, ready-to-eat meals. I have culinary background, $10,000 budget for kitchen equipment and initial inventory, and can work full-time. Target customers are health-conscious professionals who care about sustainability and convenience."
    )
  },
  {
    id: 54,
    conceptTitle: "Virtual Assistant Matching Platform",
    category: "saas",
    description: "Connect businesses with vetted virtual assistants worldwide",
    tags: ["remote work", "marketplace", "virtual assistants", "gig economy"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Virtual Assistant Matching Platform",
      "I want to create a platform that matches businesses with pre-vetted virtual assistants based on skills, timezone, and budget. I have marketplace experience, $12,000 budget, and can work full-time. The platform includes skill assessments, time tracking, payment processing, and quality guarantees to make hiring VAs seamless for small businesses."
    )
  },
  {
    id: 55,
    conceptTitle: "Children's Coding Bootcamp",
    category: "consulting",
    description: "After-school and summer coding programs for kids",
    tags: ["education", "coding", "children", "STEM"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Children's Coding Bootcamp",
      "I want to launch coding classes for kids ages 8-16, teaching programming through game development, robotics, and web design. I have teaching and programming background, $5,000 budget for equipment and curriculum, and can start part-time. Classes will be offered after-school, weekends, and summer camps with both in-person and virtual options."
    )
  },
  {
    id: 56,
    conceptTitle: "Influencer CRM Platform",
    category: "creator",
    description: "Relationship management tool for influencers and brand partnerships",
    tags: ["influencer marketing", "CRM", "creator tools", "brand partnerships"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Influencer CRM Platform",
      "I want to build a CRM specifically designed for influencers to manage brand relationships, track partnerships, organize contracts, and measure campaign performance. I have SaaS experience, $10,000 budget, and can work full-time. The platform helps creators professionalize their business operations and maximize partnership revenue."
    )
  },
  {
    id: 57,
    conceptTitle: "Electric Vehicle Charging Network",
    category: "sustainability",
    description: "Install and operate EV charging stations in strategic locations",
    tags: ["EV infrastructure", "sustainability", "charging stations", "clean energy"],
    difficulty: "Hard",
    steps: generateStandardSteps(
      "Electric Vehicle Charging Network",
      "I want to install and operate electric vehicle charging stations in underserved areas like apartment complexes, offices, and retail centers. I have business development background, $30,000+ budget for equipment, and can work full-time. Revenue comes from charging fees, advertising on stations, and partnerships with property owners."
    )
  },
  {
    id: 58,
    conceptTitle: "Niche Job Board Platform",
    category: "saas",
    description: "Specialized job board for specific industry or skill set",
    tags: ["job board", "recruitment", "niche market", "marketplace"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Niche Job Board Platform",
      "I want to create a job board focused on a specific niche (e.g., remote design jobs, sustainability careers, Web3 roles) where employers pay to post and talent gets curated opportunities. I have recruitment experience, $6,000 budget, and can work full-time. The platform emphasizes quality over quantity with verified companies and skilled professionals."
    )
  },
  {
    id: 59,
    conceptTitle: "Personal Branding Consultancy",
    category: "consulting",
    description: "Help professionals build their personal brand online",
    tags: ["personal branding", "social media", "career development", "consulting"],
    difficulty: "Easy",
    steps: generateStandardSteps(
      "Personal Branding Consultancy",
      "I want to start a consultancy helping professionals (executives, entrepreneurs, experts) build their personal brand on LinkedIn and other platforms. I have marketing background, $3,000 budget, and can start part-time. Services include brand strategy, content creation guidance, profile optimization, and engagement coaching to increase visibility and opportunities."
    )
  },
  {
    id: 60,
    conceptTitle: "Smart Vending Machine Business",
    category: "ecommerce",
    description: "Modern vending machines with healthy snacks and tech products",
    tags: ["vending machines", "passive income", "retail", "automation"],
    difficulty: "Medium",
    steps: generateStandardSteps(
      "Smart Vending Machine Business",
      "I want to operate smart vending machines stocked with healthy snacks, tech accessories, and local products in high-traffic locations like gyms, offices, and universities. I have $15,000 budget for machines and initial inventory, and can manage part-time. Machines accept mobile payments and provide real-time inventory tracking for efficient operations."
    )
  }
];
