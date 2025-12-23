import React, { useState, useMemo, useEffect } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, LogIn, ArrowRight, Briefcase, TrendingUp, Zap, Globe, FileText, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { CreditGate } from "@/components/CreditGate";
import { CREDIT_COSTS } from "@/config/constants";

interface Criterion {
  id: string;
  title: string;
  description: string;
  helpText: string;
  icon: React.ReactNode;
}

interface AIAnalysis {
  verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
  confidence: number;
  strengths: string[];
  critical_gaps: string[];
  prioritized_actions: Array<{
    action: string;
    priority: 'High' | 'Medium' | 'Low';
    estimated_time?: string;
  }>;
  timeline_to_readiness?: string;
  risk_assessment?: string;
  summary: string;
  average_score?: number;
  scores?: {
    team_complementary: number;
    team_experience: number;
    traction_revenue: number;
    milestone_achieved: number;
    mvp_working: number;
    product_live: number;
    market_size: number;
    demand_validated: number;
    pitch_deck: number;
    funding_defined: number;
  };
}

const criteria: Criterion[] = [
  {
    id: "team_complementary",
    title: "Complementary Founding Team",
    description: "Do you have a founding team with complementary skills (for example, tech + business)?",
    helpText: `This evaluates whether your founding team has the essential skills needed to build and scale your startup. Investors want to see a balanced team that can execute.

What 0 means:
• Solo founder with gaps in critical skills (e.g., only technical OR only business)
• No co-founders or advisors with complementary expertise
• Missing key capabilities needed for your business model

What 10 means:
• Complete founding team (2-3 co-founders) with complementary skills
• Clear division: tech lead + business lead + domain expert (if needed)
• Each founder brings distinct, non-overlapping expertise
• Proven ability to work together effectively

Scoring guide:
• 0-2: Solo founder, missing critical skills (e.g., technical founder with no business/sales skills)
• 3-4: Solo founder with advisors/mentors, or one co-founder but still missing key skills
• 5-6: Two co-founders with some complementary skills (e.g., tech + business) but missing domain expertise
• 7-8: Strong founding team (2-3 people) with clear complementary skills covering all essential areas
• 9-10: Ideal team: complete skill coverage, proven collaboration, clear roles

Why this matters for fundraising:
Investors reduce risk by investing in teams. A solo founder is a single point of failure. A complementary team shows you can delegate, collaborate, and scale beyond individual limitations. Investors also look for teams that can build the product AND sell it.

Examples of complementary skills:
• Technical + Business/Sales (most common)
• Product + Marketing/Growth
• Domain Expert + Technical + Operations
• Design + Engineering + Business Development`,
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "team_experience",
    title: "Previous Startup Experience",
    description: "Have you or someone on your team previously built or scaled a startup or product?",
    helpText: `This measures whether anyone on your team has hands-on experience building, launching, or scaling products/companies. Experience significantly reduces investor risk.

What 0 means:
• No one on the team has built or scaled a startup or product before
• First-time founders with no track record
• Team members may have corporate experience but no startup/entrepreneurial experience

What 10 means:
• At least one founder has successfully built and scaled a startup (raised funding, achieved significant revenue, exit, etc.)
• Multiple team members with relevant startup experience
• Track record of product launches, user growth, or revenue generation
• Previous experience is directly relevant to current startup

Scoring guide:
• 0-2: First-time founders, no startup/product experience
• 3-4: Some team members have corporate experience or worked at startups (not as founders)
• 5-6: One founder has built/sold products or small businesses (but not VC-scale startups)
• 7-8: At least one founder has previous startup experience (built product, raised some funding, or achieved traction)
• 9-10: Multiple founders with proven track records: successful exits, scaled startups, or significant achievements

Why this matters for fundraising:
Experience matters enormously. First-time founders face a steep learning curve. Investors prefer teams who've "been there before" - they make fewer mistakes, move faster, and understand what it takes to scale. Even one experienced founder can dramatically improve your odds.

What counts as "relevant experience":
• Previously founded/scaled a startup
• Led product launches that gained significant traction
• Built and grew products from 0 to thousands/millions of users
• Raised funding before (even if company didn't exit)
• Worked at high-growth startups in leadership roles (especially relevant if your startup is similar)`,
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    id: "traction_revenue",
    title: "Revenue or User Traction",
    description: "Are you currently generating revenue or have measurable user traction (like user signups, active users)?",
    helpText: `This assesses whether you have real proof that people want your product - either by paying for it (revenue) or actively using it (traction). This is one of the strongest signals to investors.

What 0 means:
• No revenue and no users
• Product not launched yet
• No measurable traction or engagement
• Still in ideation/pre-development phase

What 10 means:
• Significant, consistent revenue ($10K+ MRR with growth) OR
• Large, engaged user base (10K+ active users with strong retention)
• Clear growth trajectory (month-over-month increases)
• Revenue/users are from real customers (not friends/family)
• Sustainable and scalable growth pattern

Scoring guide:
• 0-2: No revenue, no users, product not live
• 3-4: Product launched but minimal traction (few users, no revenue, or only friends/family)
• 5-6: Some early traction: $1K-$5K MRR OR 100-1,000 active users (but growth is flat or inconsistent)
• 7-8: Good traction: $5K-$10K MRR with growth OR 1K-10K active users with engagement
• 9-10: Strong traction: $10K+ MRR with consistent growth OR 10K+ active users with strong retention and growth

Why this matters for fundraising:
Traction is the ultimate validator. Revenue proves people will pay. Active users prove people want your product. Without traction, you're selling a vision. With traction, you're selling a proven opportunity. Investors invest in traction more than ideas.

What counts as "measurable traction":
• Monthly Recurring Revenue (MRR) - most important for B2B SaaS
• Active users (DAU/MAU) - for consumer products
• Signups/growth rate - for early stage
• Engagement metrics (time spent, retention, frequency)
• Pre-orders or waitlist size (shows demand before launch)`,
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    id: "milestone_achieved",
    title: "Key Growth Milestone Achieved",
    description: "Have you hit at least one key growth milestone (for example, $5,000 MRR, 10,000 users, or pre-orders)?",
    helpText: `This measures whether you've reached investor-recognized milestones that prove your business model works. Milestones are concrete proof points that reduce investor risk.

What 0 means:
• No significant milestones achieved
• Haven't reached any investor-recognized benchmarks
• Traction is too early or unclear
• No quantifiable proof of progress

What 10 means:
• Multiple strong milestones achieved
• Exceeded key benchmarks significantly (e.g., $15K+ MRR, 50K+ users)
• Consistent milestone progression (hitting new milestones regularly)
• Milestones demonstrate scalable growth pattern
• Clear path to next milestone

Scoring guide:
• 0-2: No milestones achieved, still validating basic assumptions
• 3-4: Early progress toward milestones (e.g., $1K-$2K MRR, approaching a milestone)
• 5-6: Hit one key milestone (e.g., $5K MRR OR 10K users OR $50K pre-orders)
• 7-8: Hit multiple milestones OR significantly exceeded one (e.g., $10K+ MRR, 25K+ users)
• 9-10: Multiple strong milestones with consistent growth trajectory (e.g., $15K+ MRR with 20%+ MoM growth)

Why this matters for fundraising:
Milestones are shortcuts for investors. They signal you've reached certain validation points. Common milestones investors look for:
• $5,000+ Monthly Recurring Revenue (MRR) - for SaaS
• 10,000+ active users - for consumer products
• $50,000+ in pre-orders - for physical products
• 20%+ month-over-month growth for 3+ months - shows scalability
• 100+ paying customers - proves product-market fit
• Break-even or profitability - shows sustainable business

Why multiple milestones matter:
One milestone could be luck. Multiple milestones show a pattern of success and execution capability. Investors want to see you can consistently hit targets.`,
    icon: <Zap className="h-5 w-5" />,
  },
  {
    id: "mvp_working",
    title: "Working MVP or Prototype",
    description: "Do you have a working MVP (minimum viable product) or prototype?",
    helpText: `This evaluates whether you have a functional version of your product that you can demonstrate. An MVP proves you can build and that your idea works in practice, not just theory.

What 0 means:
• No product exists yet
• Only ideas, mockups, or wireframes
• Nothing functional to show or test
• Still in planning/design phase

What 10 means:
• Fully functional MVP with core features working
• Product is polished and ready for users
• Core value proposition is clearly demonstrated
• You can show it working end-to-end
• Multiple features implemented based on user feedback

Scoring guide:
• 0-2: No product - only ideas, sketches, or wireframes
• 3-4: Early prototype with basic functionality (some features work but incomplete)
• 5-6: Functional MVP with core features working (can demonstrate value but needs refinement)
• 7-8: Solid MVP with most features working, being used by beta users or early customers
• 9-10: Polished MVP with multiple features, user feedback incorporated, ready to scale

Why this matters for fundraising:
Investors want proof you can execute. An MVP shows you can build, not just talk. It also proves your idea works in reality. Without an MVP, you're asking investors to bet on an unproven concept. With an MVP, you're showing them a working product that people can use.

What counts as an MVP:
• A working product (website, app, service) with core functionality
• Can demonstrate the main value proposition
• Doesn't need all features - just enough to prove the concept
• Should be usable by real people (even if basic)
• Better to have a simple working product than a complex incomplete one

Remember:
Perfect is the enemy of good. An imperfect MVP that works is far better than a perfect product that doesn't exist. Investors prefer founders who ship and iterate over founders who perfect.`,
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "product_live",
    title: "Product Live and in Use",
    description: "Is your product live and being used by real customers or users?",
    helpText: `This measures whether your product is actually deployed and being used by real people (not just friends/family). A live product with real users proves demand and gives you real data.

What 0 means:
• Product not launched or deployed
• No one is using it (or only you/test accounts)
• Still in development/testing phase
• Not accessible to real customers

What 10 means:
• Product is live and publicly available
• Hundreds or thousands of real users actively using it
• Strong usage metrics (daily active users, retention, engagement)
• Real customers paying for it (not just free users)
• Product is stable and reliable

Scoring guide:
• 0-2: Product not launched, only internal testing
• 3-4: Product launched but minimal usage (mostly friends/family, or very low engagement)
• 5-6: Product live with some real users (50-500 users) but usage is sporadic or low engagement
• 7-8: Product live with good user base (500-5,000 users) and decent engagement/retention
• 9-10: Product live with strong user base (5,000+ users) and excellent engagement metrics

Why this matters for fundraising:
A live product with real users is dramatically different from an MVP in testing. It proves:
• Your product works in the real world (not just in theory)
• People actually want it (they're using it)
• You can operate and maintain a product
• You have real data to improve and scale
• You're past the "will this work?" phase

What "real users" means:
• People who found your product organically (not just friends you asked)
• Users who come back (shows value, not just curiosity)
• Paying customers (proves willingness to pay)
• Users who actually use core features (not just signed up and forgot)

Difference between MVP and Live Product:
• MVP = You can demonstrate it works
• Live Product = It's publicly available and people are actually using it
• Investors prefer live products because they prove real demand and give you real metrics to improve.`,
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: "market_size",
    title: "Large & Growing Market",
    description: "Is your target market large (for example, $1B+) and growing?",
    helpText: `This evaluates the size and growth potential of your target market. Investors need to see the potential for a large return, which requires a large market. A small market limits your upside.

What 0 means:
• Market is very small (under $100M total addressable market)
• Market is shrinking or declining
• Very niche market with limited growth potential
• Unclear or undefined target market

What 10 means:
• Large Total Addressable Market (TAM) - $1B+ or significantly larger
• Market is growing rapidly (10%+ annual growth)
• Multiple ways to expand and capture more market share
• Clear path to capturing meaningful market share (1-5%+)
• Market supports billion-dollar company potential

Scoring guide:
• 0-2: Small market (<$100M TAM) or declining market
• 3-4: Moderate market ($100M-$500M) with slow or unclear growth
• 5-6: Decent market ($500M-$1B) with steady growth (5-10% annually)
• 7-8: Large market ($1B-$10B) with good growth (10%+ annually)
• 9-10: Very large market ($10B+) with strong growth (15%+ annually) and clear expansion opportunities

Why this matters for fundraising:
Venture capital math requires large markets. Investors need the potential for 10x-100x returns. A $10M market can't support a $100M+ exit. Investors also prefer growing markets because it's easier to succeed in a rising tide.

How to calculate market size:
• Total Addressable Market (TAM): Total revenue opportunity if you captured 100% of the market
• Serviceable Addressable Market (SAM): The portion of TAM you can realistically serve
• Serviceable Obtainable Market (SOM): Market share you can capture in 3-5 years (realistic target)

What makes a market attractive:
• Large size ($1B+ TAM for VC-funded startups)
• Growing (10%+ annual growth rate)
• Underserved (problems not well solved)
• High willingness to pay (B2B often better than B2C)
• Fragmented (no dominant player)

Examples:
• SaaS for small businesses: $50B+ market, growing 15%+ annually
• E-commerce platform: $500B+ market, growing
• Niche B2B software: $1B+ market, high willingness to pay`,
    icon: <Globe className="h-5 w-5" />,
  },
  {
    id: "demand_validated",
    title: "Customer Demand Validated",
    description: "Have you validated customer demand through surveys, pre-orders, or beta users?",
    helpText: `This measures whether you've proven that customers actually want your product before you build it or scale it. Validation reduces the risk that you're building something nobody wants.

What 0 means:
• No validation done - building based on assumptions
• Haven't asked potential customers if they want this
• No proof of demand (surveys, pre-orders, beta signups, etc.)
• Building without customer input

What 10 means:
• Extensive validation with multiple methods (surveys, interviews, pre-orders, beta)
• Strong proof of demand (hundreds of pre-orders, high survey scores, long beta waitlist)
• Quantitative AND qualitative validation
• Validation from target customers (not just friends/family)
• Clear evidence customers will pay for this

Scoring guide:
• 0-2: No validation - building on assumptions, haven't talked to customers
• 3-4: Basic validation - talked to a few people, some interest but no concrete proof
• 5-6: Moderate validation - surveys/interviews with 20-50 people showing interest, or small pre-order amounts ($5K-$20K)
• 7-8: Strong validation - multiple validation methods, clear demand signals (50+ survey responses, $20K-$50K pre-orders, active beta waitlist)
• 9-10: Excellent validation - extensive validation (100+ responses, $50K+ pre-orders, strong beta engagement) with clear willingness to pay

Why this matters for fundraising:
Validation proves you're not building in a vacuum. It shows you understand your customers and that they actually want what you're building. Investors see unvalidated ideas as risky. Validated ideas have proof of demand.

Validation methods (best when combined):
• Customer interviews (20-50+ conversations with target customers)
• Surveys (100+ responses from target market)
• Pre-orders or pre-sales (money is the ultimate validation)
• Beta waitlist (shows demand before product exists)
• Landing page signups (email list shows interest)
• Letters of Intent (LOIs) from businesses (B2B validation)

What "strong validation" looks like:
• 70%+ of surveyed customers say they'd buy
• $50K+ in pre-orders (proves willingness to pay)
• 1,000+ people on beta waitlist
• Multiple customers willing to sign LOIs (B2B)
• Clear patterns in feedback showing specific pain points

Remember:
One validation method is good, but multiple methods are better. Pre-orders are stronger than surveys. Customer interviews provide qualitative depth that numbers alone can't show.`,
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    id: "pitch_deck",
    title: "Pitch Deck Ready",
    description: "Do you have a completed pitch deck ready?",
    helpText: `This evaluates whether you have a professional pitch deck that tells your story clearly and persuasively. A pitch deck is essential for fundraising - it's how you communicate your opportunity to investors.

What 0 means:
• No pitch deck exists
• Only rough notes or ideas
• Haven't prepared materials to present to investors
• Not ready to pitch

What 10 means:
• Professional, polished pitch deck (10-15 slides)
• All key sections covered (problem, solution, market, traction, team, ask)
• Clear, compelling narrative
• Visual and well-designed
• Tested and refined based on feedback
• Ready to present to investors

Scoring guide:
• 0-2: No pitch deck, only rough notes
• 3-4: Basic deck started but incomplete (missing key sections, rough)
• 5-6: Complete deck but needs refinement (all sections present but could be clearer/more compelling)
• 7-8: Good pitch deck - complete, clear, and professional (ready for initial investor meetings)
• 9-10: Excellent pitch deck - polished, compelling, tested, and optimized for investor conversations

Why this matters for fundraising:
Your pitch deck is often investors' first impression. A poor deck suggests you're not serious or prepared. A great deck shows professionalism and clarity of thought. You can't raise without one.

Essential pitch deck slides (10-15 slides):
1. Problem - What problem are you solving?
2. Solution - How do you solve it?
3. Market - How big is the opportunity?
4. Business Model - How do you make money?
5. Traction - What proof do you have?
6. Competition - Who else is doing this?
7. Team - Why are you the right team?
8. Financials - What are the numbers?
9. Ask - How much are you raising and why?
10. Vision - Where is this going?

What makes a great pitch deck:
• Clear, simple language (avoid jargon)
• Visual (charts, graphs, images)
• Data-driven (show numbers, not just claims)
• Compelling narrative (tells a story)
• Concise (10-15 slides, can present in 10 minutes)
• Tested (get feedback and iterate)

Remember:
Your pitch deck is a living document. Refine it based on feedback. Different investors may need slight variations. The goal is to get a meeting, not to close the deal - the deck opens doors.`,
    icon: <FileText className="h-5 w-5" />,
  },
  {
    id: "funding_defined",
    title: "Funding Amount & Use Defined",
    description: "Have you defined exactly how much capital you want to raise and what milestones it will fund?",
    helpText: `This measures whether you've thought through your funding needs clearly. Investors want to see you know exactly why you need money and how you'll use it to reach specific milestones.

What 0 means:
• Haven't decided how much to raise
• Unclear on what you'd use the money for
• No specific milestones or goals defined
• Not ready to discuss funding terms

What 10 means:
• Exact funding amount determined (e.g., $500K, $1M, $2M)
• Clear, detailed use of funds breakdown
• Specific milestones that funding will achieve (with timelines)
• Clear connection between funding amount and milestones
• Financial model showing how funds translate to growth
• Understand dilution and valuation implications

Scoring guide:
• 0-2: Haven't thought about funding amount or use case
• 3-4: Rough idea of amount needed but unclear on specifics or milestones
• 5-6: Defined approximate amount ($500K-$2M range) and general use cases (product, team, marketing) but milestones not specific
• 7-8: Clear funding amount and use breakdown, specific milestones identified but timelines may be rough
• 9-10: Exact amount with detailed use of funds, specific milestones with timelines, financial model, and clear ROI for investors

Why this matters for fundraising:
Investors test your thinking. If you can't explain why you need $X and how you'll use it, you're not ready. Specificity shows you've thought through your plan. Vague asks suggest you don't have a clear plan.

What to define:
1. Funding Amount: Exact number (e.g., $750K) - based on what you need to reach next milestone
2. Use of Funds: Detailed breakdown (e.g., 40% product, 30% team, 20% marketing, 10% operations)
3. Milestones: Specific, measurable goals (e.g., "Reach $50K MRR in 12 months", "Hire 3 engineers", "Launch in 3 new markets")
4. Timeline: When will you achieve each milestone?
5. Next Round: What will you need next and when?

How to determine funding amount:
• Calculate costs to reach next major milestone (18-24 months)
• Include: team salaries, product development, marketing, operations
• Add 20-30% buffer for unexpected costs
• Should get you to next fundraising milestone or profitability

Example use of funds breakdown:
• Product Development: 35% ($350K of $1M)
• Team (hiring): 40% ($400K)
• Marketing/Growth: 15% ($150K)
• Operations/Other: 10% ($100K)

Why milestones matter:
Milestones show investors what they're buying. "We'll use this money to reach $50K MRR" is clear. "We'll use this to grow" is vague. Milestones also help you know when you need the next round.

Remember:
Be specific but realistic. Investors will question your numbers. Have a financial model. Be ready to explain why you need this amount and how it gets you to the next stage.`,
    icon: <BarChart className="h-5 w-5" />,
  }
];

const scoreLabels: { [key: number]: string } = {
  0: "Not Started",
  1: "Just Beginning",
  2: "Early Stage",
  3: "Making Progress",
  4: "Getting There",
  5: "Halfway There",
  6: "Strong Progress",
  7: "Almost Ready",
  8: "Very Close",
  9: "Nearly Complete",
  10: "Complete"
};

const FundraisingReadinessToolkit = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { hasCredits, balance } = useCredits();
  const [scores, setScores] = useState<{ [key: string]: number }>({
    team_complementary: 0,
    team_experience: 0,
    traction_revenue: 0,
    milestone_achieved: 0,
    mvp_working: 0,
    product_live: 0,
    market_size: 0,
    demand_validated: 0,
    pitch_deck: 0,
    funding_defined: 0
  });
  const [expandedHelp, setExpandedHelp] = useState<{ [key: string]: boolean }>({});
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const averageScore = useMemo(() => {
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) return 0;
    const sum = scoreValues.reduce((acc, val) => acc + val, 0);
    return sum / scoreValues.length;
  }, [scores]);

  const allScored = useMemo(() => {
    return Object.values(scores).every(score => score > 0);
  }, [scores]);

  const handleScoreChange = (criterionId: string, value: number[]) => {
    const newScore = value[0];
    setScores(prev => ({
      ...prev,
      [criterionId]: newScore
    }));
    // Clear previous analysis when scores change
    if (aiAnalysis) {
      setAiAnalysis(null);
      setAnalysisError(null);
    }
  };

  const toggleHelp = (criterionId: string) => {
    setExpandedHelp(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const goToNext = () => {
    const currentQuestion = criteria[currentQuestionIndex];
    const currentScore = scores[currentQuestion.id] || 0;
    if (currentQuestionIndex < criteria.length - 1 && currentScore > 0) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const currentQuestion = criteria[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / criteria.length) * 100;
  const progressText = `${currentQuestionIndex + 1} of ${criteria.length}`;
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === criteria.length - 1;
  const currentScore = scores[currentQuestion.id] || 0;
  const canProceed = currentScore > 0;

  const analyzeReadiness = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to analyze your readiness");
      navigate('/login', { state: { returnTo: '/insighta' } });
      return;
    }

    if (!allScored) {
      toast.error("Please set all scores before analyzing");
      return;
    }

    // Check credits before proceeding
    const requiredCredits = CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS;
    if (!hasCredits(requiredCredits)) {
      setCreditGateOpen(true);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke('fundraising-readiness-analyzer', {
        body: {
          team_complementary_score: scores.team_complementary,
          team_experience_score: scores.team_experience,
          traction_revenue_score: scores.traction_revenue,
          milestone_achieved_score: scores.milestone_achieved,
          mvp_working_score: scores.mvp_working,
          product_live_score: scores.product_live,
          market_size_score: scores.market_size,
          demand_validated_score: scores.demand_validated,
          pitch_deck_score: scores.pitch_deck,
          funding_defined_score: scores.funding_defined
        }
      });

      if (error) {
        // Handle credit errors specifically
        if (error.status === 402 || (error.message && error.message.includes('credits'))) {
          setCreditGateOpen(true);
          throw new Error('Insufficient credits');
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          setCreditGateOpen(true);
          throw new Error('Insufficient credits');
        }
        throw new Error(data.error);
      }

      setAiAnalysis(data as AIAnalysis);
      toast.success(`Analysis complete! (Used ${requiredCredits} credits)`);
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze readiness. Please try again.';
      setAnalysisError(errorMessage);
      if (!errorMessage.includes('credits')) {
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="py-20 px-4 relative overflow-hidden" data-section="fundraising-readiness">
      {/* Background styling */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div
          className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
            animationDuration: '28s'
          }}
        />
      </div>

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Insighta Test
            </h2>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Take our comprehensive self-assessment to evaluate your startup's fundraising readiness, identify gaps, and understand exactly what you need to improve before approaching investors.
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary animate-pulse">How ready are you?</CardTitle>
            {isAuthenticated && (
            <CardDescription className="mt-2">
                Answer each question honestly by moving the slider from 0 (Not Started) to 10 (Complete)
            </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-muted-foreground">Question {progressText}</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Current Question */}
            <TooltipProvider>
              <div className="space-y-4 pt-4">
                  {/* Criterion Header */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                    {currentQuestion.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{currentQuestion.title}</h3>
                        {currentScore > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {scoreLabels[currentScore]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                      {currentQuestion.description}
                      </p>
                      
                      {/* Help Text */}
                    <Collapsible open={expandedHelp[currentQuestion.id]} onOpenChange={() => toggleHelp(currentQuestion.id)}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <HelpCircle className="h-3 w-3 mr-1" />
                          {expandedHelp[currentQuestion.id] ? "Hide help" : "What does this mean?"}
                          {expandedHelp[currentQuestion.id] ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="text-sm text-muted-foreground mt-2 pl-4 border-l-2 border-primary/20 space-y-2 whitespace-pre-line">
                        {currentQuestion.helpText}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-3 pl-12">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Score: {currentScore} / 10</span>
                      <span className="text-xs text-muted-foreground">{scoreLabels[currentScore]}</span>
                    </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "relative",
                            !isAuthenticated && "cursor-not-allowed"
                          )}>
                            <Slider
                              value={[currentScore]}
                              onValueChange={(value) => {
                                if (isAuthenticated) {
                              handleScoreChange(currentQuestion.id, value);
                                }
                              }}
                              min={0}
                              max={10}
                              step={1}
                              disabled={!isAuthenticated}
                              className={cn(
                                "w-full",
                                !isAuthenticated && "opacity-60"
                              )}
                            />
                            {!isAuthenticated && (
                              <div className="absolute inset-0 cursor-not-allowed z-10" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {!isAuthenticated && (
                          <TooltipContent>
                            <p>Sign in to adjust this score</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>2</span>
                      <span>4</span>
                      <span>6</span>
                      <span>8</span>
                      <span>10</span>
                    </div>
                    
                    {/* Progress Bar */}
                    {currentScore > 0 && (
                      <div className="space-y-1">
                        <Progress value={(currentScore / 10) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
            </TooltipProvider>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              {!isFirstQuestion && (
                <Button
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={!isAuthenticated}
                  className="min-w-[100px]"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              {isFirstQuestion && <div />}

              {!isLastQuestion && (
                <Button
                  onClick={goToNext}
                  disabled={!canProceed || !isAuthenticated}
                  className="min-w-[100px]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {isLastQuestion && <div />}
            </div>
          </CardContent>
        </Card>

        {/* Average Score Display (when all questions answered) */}
        {allScored && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold">{averageScore.toFixed(1)} / 10.0</p>
                </div>
                {/* Insighta Test Results Button */}
                {isAuthenticated && (
                  <Button
                    onClick={analyzeReadiness}
                    disabled={isAnalyzing}
                    size="lg"
                    className="w-full sm:w-auto min-w-[200px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Insighta Test Results
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign In Prompt (if not authenticated) */}
        {!isAuthenticated && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                  Sign in to complete the assessment and get AI-powered analysis of your fundraising readiness
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate('/login', { state: { returnTo: '/insighta' } })}
                      className="w-full md:w-auto min-w-[200px]"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                  Sign In to Continue
                    </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {analysisError && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Analysis Error</p>
                  <p className="text-sm text-muted-foreground mt-1">{analysisError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={analyzeReadiness}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <Card className={cn(
            "border-2",
            aiAnalysis.verdict === 'Ready' ? "border-green-500/50 bg-green-500/5" : 
            aiAnalysis.verdict === 'Almost Ready' ? "border-yellow-500/50 bg-yellow-500/5" :
            "border-orange-500/50 bg-orange-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {aiAnalysis.verdict === 'Ready' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    {aiAnalysis.verdict === 'Ready' ? "You're Ready! 🎉" : 
                     aiAnalysis.verdict === 'Almost Ready' ? "Almost Ready! ⚡" :
                     "Not Quite Ready Yet"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Confidence: {aiAnalysis.confidence}% • Average Score: {aiAnalysis.average_score?.toFixed(1) || averageScore.toFixed(1)} / 10.0
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className={cn(
                "p-4 rounded-lg",
                aiAnalysis.verdict === 'Ready' ? "bg-green-500/10 border border-green-500/20" : 
                aiAnalysis.verdict === 'Almost Ready' ? "bg-yellow-500/10 border border-yellow-500/20" :
                "bg-orange-500/10 border border-orange-500/20"
              )}>
                <p className="text-sm font-medium mb-2">Summary</p>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
              </div>

              {/* Strengths */}
              {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-green-500 mt-1">✓</span>
                        <span className="text-muted-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Gaps */}
              {aiAnalysis.critical_gaps && aiAnalysis.critical_gaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Critical Gaps
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.critical_gaps.map((gap, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-orange-500 mt-1">•</span>
                        <span className="text-muted-foreground">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prioritized Actions */}
              {aiAnalysis.prioritized_actions && aiAnalysis.prioritized_actions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Prioritized Action Items
                  </h4>
                  <ul className="space-y-3">
                    {aiAnalysis.prioritized_actions.map((action, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <Badge 
                          variant={action.priority === 'High' ? 'destructive' : action.priority === 'Medium' ? 'default' : 'secondary'}
                          className="h-fit"
                        >
                          {action.priority}
                        </Badge>
                        <div className="flex-1">
                          <span className="text-foreground">{action.action}</span>
                          {action.estimated_time && (
                            <span className="text-xs text-muted-foreground ml-2">({action.estimated_time})</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline & Risk Assessment */}
              {(aiAnalysis.timeline_to_readiness || aiAnalysis.risk_assessment) && (
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  {aiAnalysis.timeline_to_readiness && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Timeline to Readiness</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.timeline_to_readiness}</p>
                    </div>
                  )}
                  {aiAnalysis.risk_assessment && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.risk_assessment}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Find My Investors Button - appears after analysis */}
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
                  // Store assessment data for the matching tool
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
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => setCreditGateOpen(false)}
        requiredCredits={CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS}
        feature="Fundraising Readiness Analysis"
      />
    </section>
  );
};

export default FundraisingReadinessToolkit;
