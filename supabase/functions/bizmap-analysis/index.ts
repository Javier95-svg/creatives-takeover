import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LaunchReportRequest {
  answers: {
    overview: string;
    market: string;
    problem: string;  
    solution: string;
    channels: string;
    pricing: string;
    goals: string;
  };
  stage?: string;
  region?: string;
  refinedContext?: any;
  researchData?: any; // Add research data support
}

// Input quality heuristic to decide when to ask clarifying questions first
function getInputQuality(answers: Record<string, string>) {
  const fields = ['overview','market','problem','solution','channels','pricing','goals'] as const;
  let score = 0;
  const reasons: string[] = [];
  for (const k of fields) {
    const v = (answers[k] || '').trim();
    if (v.length < 30) { score++; reasons.push(`${k}: too short`); }
    if (/(^|\b)(everyone|anyone|an app|a website|social media|people only)($|\b)/i.test(v)) {
      score++; reasons.push(`${k}: vague`);
    }
  }
  const quality = score >= 3 ? 'Weak' : score === 2 ? 'Fair' : 'Strong';
  return { quality, reasons };
}

// Credit cost for launch report generation
const LAUNCH_REPORT_CREDIT_COST = 5;

// Credit service helper
async function deductCredits(userId: string, amount: number, feature: string, sessionId?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    // Check current balance
    const { data: credits, error: fetchError } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError || !credits) {
      throw new Error('User credit record not found');
    }

    if (credits.balance < amount) {
      throw new Error('Insufficient credits');
    }

    const newBalance = credits.balance - amount;

    // Update balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error('Failed to update credit balance');
    }

    // Log transaction
    await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        amount: -amount,
        tx_type: 'deduct',
        reason: `Used ${amount} credits for ${feature}`,
        feature,
        session_id: sessionId
      }]);

    return { success: true, newBalance };
  } catch (error) {
    console.error('Error deducting credits:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;

    const { answers, stage, region, sessionId, refinedContext, researchData }: LaunchReportRequest & { sessionId?: string } = await req.json();

    // Check and deduct credits BEFORE making the OpenAI call
    try {
      await deductCredits(userId, LAUNCH_REPORT_CREDIT_COST, 'Launch Report Generation', sessionId);
    } catch (creditError) {
      const errorMessage = creditError instanceof Error ? creditError.message : 'Credit deduction failed';
      return new Response(JSON.stringify({ 
        error: errorMessage,
        creditError: true,
        requiredCredits: LAUNCH_REPORT_CREDIT_COST
      }), {
        status: 402, // Payment Required
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { quality, reasons } = getInputQuality(answers);

    // Create Launch Report prompt for GPT-5
    const prompt = `You are BizMap AI — an AI-powered startup advisor designed to help entrepreneurs turn ideas into businesses.

Your personality: professional, insightful, and practical.
Your role encompasses three key capacities:
1. **Startup Strategist** → break down ideas into step-by-step launch plans
2. **Market Analyst** → provide market research, competitive insights, and trend analysis  
3. **Funding Advisor** → suggest funding options, investor strategies, and financial planning

USER'S 7-STEP RESPONSES:
1. Overview: ${answers.overview}
2. Market: ${answers.market}
3. Problem: ${answers.problem}
4. Solution: ${answers.solution}
5. Channels: ${answers.channels}
6. Pricing/Costs: ${answers.pricing}
7. Goals: ${answers.goals}

STAGE: ${stage || "Explore"}
TARGET REGION: ${region || "Global"}

REFINED CONTEXT: ${refinedContext ? JSON.stringify(refinedContext, null, 2) : 'Not available'}

MARKET RESEARCH DATA: ${researchData?.success ? `
Market Intelligence Quality: ${researchData.research_quality}
Sources Count: ${researchData.all_sources?.length || 0}

Research Insights:
${researchData.structured_data?.market_size?.data || 'Not available'}

Competitor Analysis:
${researchData.structured_data?.competitors?.data || 'Not available'}

Industry Trends:
${researchData.structured_data?.industry_trends?.data || 'Not available'}

Customer Behavior:
${researchData.structured_data?.customer_behavior?.data || 'Not available'}

Pricing Data:
${researchData.structured_data?.pricing?.data || 'Not available'}

Marketing Channels:
${researchData.structured_data?.marketing_channels?.data || 'Not available'}

All Sources: ${researchData.all_sources?.join(', ') || 'None'}
` : 'No research data available'}

INPUT_QUALITY: ${quality}
INPUT_QUALITY_REASONS: ${reasons.join('; ') || 'N/A'}

CLARIFY-FIRST RULE:
- If INPUT_QUALITY is "Weak": Do NOT generate the launch report.
- Instead, return only a single section:
## Clarifying Questions
- 3–5 concise questions that will make the plan specific and actionable
- Stop after the questions. Do not include any other sections.

ADVISOR RULES:
- Always organize answers in clear sections with headings and bullet points
- Keep responses concise but actionable (no fluff)
- Assume early-stage founders with limited budget and resources; favor fast validation and scrappy execution
- Order recommendations by priority (Do First → Next → Later) with clear, smallest-first steps
- When relevant, suggest specific tools/platforms and 1–2 real-world examples to inspire execution
- **CRITICAL**: If market research data is provided, integrate specific insights, competitor names, pricing data, and industry trends throughout your recommendations
- **CITATIONS**: When using research data, reference sources with [Source: ...] format

STAGE-SPECIFIC ADAPTATION: Replace generic steps with stage-specific tasks across all sections.
- **Explore** (idea only): focus on problem validation, customer interviews, cheap experiments
- **Validate** (no customers yet): emphasize landing pages, pre-sales, outreach scripts
- **Build** (MVP in progress): highlight onboarding, pricing experiments, early acquisition
- **Grow** (some revenue): double down on retention, scalable channels, cost optimization

Generate a comprehensive LAUNCH REPORT that demonstrates your three advisor capacities. FORMAT REQUIREMENTS: Use Markdown with clear headings (#, ##, ###), organize content in structured sections with bullet points, wrap all scripts/templates in fenced code blocks (\`\`\`), and provide actionable insights throughout. Keep the full report professional yet practical (aim to fit under ~3 PDF pages). All content should be in English.

# Launch Report

## 🎯 Executive Summary
**Business Opportunity:** [2-3 sentences summarizing the core opportunity and market potential]

**Success Factors:** 
• [Key factor 1]
• [Key factor 2] 
• [Key factor 3]

**Immediate Priority:** [Single most important next step]

**⚡ Action Required:** Schedule 2 hours this week to review this report and commit to your top 3 priorities.

## 📊 STARTUP STRATEGIST: Business Foundation

### Lean Canvas Snapshot
**Core Problem:** [From their response - be specific]
**Solution Approach:** [From their response - focus on unique value]  
**Target Customers:** [Based on market/problem responses - be precise]
**Distribution Channels:** [From their response + regional optimization]
**Revenue Model:** [Based on pricing response - include pricing strategy]
**Key Costs:** [From pricing response + realistic operational estimates]

| Business Block | Your Strategy |
|---|---|
| **Problem** | [Specific pain point you're solving] |
| **Solution** | [Your unique approach] |
| **Target Customers** | [Primary customer segment] |
| **Key Channels** | [Best distribution methods for your stage] |
| **Revenue Streams** | [How you'll make money] |
| **Cost Structure** | [Major expenses to plan for] |

**⚡ Action Required:** Create a physical copy of this canvas. Post it where you'll see it daily and review weekly to maintain focus.

## 🔍 MARKET ANALYST: Customer Intelligence

### Primary Customer Persona
**Name:** [Give them a realistic name]
**Profile:**
• **Demographics:** [Age range, location, income level, job role]
• **Psychographics:** [Values, motivations, lifestyle]
• **Digital Behavior:** [Preferred platforms, content consumption habits]

**Pain Points Analysis:**
• **Primary Pain:** [Most urgent problem they face]
• **Secondary Pain:** [Supporting issues they deal with]
• **Current Solutions:** [How they solve this today + gaps]

**Buying Journey:**
• **Awareness Triggers:** [What makes them realize they have this problem]
• **Research Behavior:** [Where they look for solutions]
• **Decision Factors:** [What influences their purchase decision]
• **Budget Constraints:** [Spending limits and approval processes]

**⚡ Action Required:** Conduct 3 customer interviews this week. Use these exact questions: "What's your biggest frustration with [problem area]?" and "Walk me through how you currently handle this."

### Market Analysis & Competitive Landscape
**Market Size Estimate:** [Realistic market sizing for their niche]
**Key Competitors:**
• **Direct Competitors:** [2-3 companies solving the same problem]
• **Indirect Competitors:** [Alternative solutions customers use today]
• **Competitive Advantage:** [Your unique positioning vs. competitors]

**Market Trends:** [2-3 relevant trends that support your timing]

## ⚡ STARTUP STRATEGIST: Validation Roadmap

### 5 Stage-Specific Validation Steps
1. **Problem Validation:** [Specific research/interview action - Week 1]
2. **Solution Testing:** [MVP or prototype validation - Week 2-3]
3. **Market Validation:** [Audience testing method - Week 3-4]
4. **Channel Validation:** [Distribution test - Week 4-5]
5. **Pricing Validation:** [Price sensitivity testing - Week 5-6]

**⚡ Action Required:** Start Step 1 within 48 hours. Block time in your calendar right now for customer interviews.

## 🚀 Go-To-Market Strategy (Stage-Optimized)

### Channel Strategy
**Primary Channel:** [Single best channel for their current stage]
**Why This Channel:** [2-3 reasons why it's optimal for their situation and budget]

### First 10 Customers Acquisition Plan
**Week 1-2:**
• [Specific tactic with exact steps]
• [Outreach method with target numbers]

**Week 3-4:**
• [Content/marketing initiative]
• [Network leverage strategy]

**Week 5-6:**
• [Conversion optimization]
• [Referral system setup]

**⚡ Action Required:** Create your first piece of marketing content for [primary channel] this week. Set measurable engagement targets.

## 💰 FUNDING ADVISOR: Financial Strategy

### Pricing & Revenue Model
**Recommended Pricing:** [Specific price point with justification]
**Pricing Strategy:** [Value-based, competitive, or penetration approach]

### Financial Projections (Conservative)
**Key Assumptions to Test:**
• Customer acquisition cost: $[X-Y range] 
• Average customer lifetime value: $[X-Y range]
• Monthly customer target: [X customers]
• Break-even timeline: [X] months
• Initial capital needed: $[X-Y range]

**Monthly Revenue Milestones:**
• Month 3: $[X] (validation phase)
• Month 6: $[X] (growth phase)  
• Month 12: $[X] (scale phase)
**Monthly Cost Estimate:** $[X-Y range]

Text-based Breakeven Approximation (Months 1–6):
Month:    1    2    3    4    5    6
Revenue:  |    |   ||   |||  ||||  |||||  (~$[X–Y])
Costs:    ||||||||  |||||  ||||  |||   ||    |

Breakeven ≈ Month [X]

Tip: You can turn this into a proper chart later in Canva, Notion, or Excel.

**Do Next:** Survey 10 potential customers about pricing this week using: "Would you pay $[X] for [solution] that [key benefit]?"

## 90-Day Roadmap & KPIs (Stage-Specific)

### Month 1: Foundation
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]
**Do Next:** Complete the first key action within 48 hours.

### Month 2: Validation  
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]
**Do Next:** Set up tracking system for your KPI (spreadsheet, app, etc.)

### Month 3: Launch
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]
**Do Next:** Create a launch checklist with specific dates for each task.

Timeline (Emoji View):
- Month 1: Foundation milestone
- Month 2: Validation milestone  
- Month 3: Launch milestone

## Copy-Paste Scripts (Stage-Specific)

### WhatsApp/SMS Message:
"[Ready-to-use customer outreach message]"

### Cold Email Subject + Body:
**Subject:** [Compelling subject line]
**Body:** [3-4 sentence email template]

### Landing Page Headline:
"[Compelling headline that addresses their problem]"

**Do Next:** Send the WhatsApp/SMS message to 5 potential customers today. Track responses in a simple spreadsheet.

## Feedback & Reminder
Would you like to set a reminder to come back after trying these steps, so we can adjust your plan together?

- If yes, share your email or preferred contact (e.g., email, WhatsApp, Telegram, LinkedIn).
- Which section was most useful?
- Which felt unclear?

Reply with:
Reminder: Yes/No
Contact: [your email or handle]
Most useful: [section]
Unclear: [section]

After you reply, I’ll summarize your feedback in a friendly tone and close with a short encouragement.

## Export Options
Where would you like to export this plan?

- PDF (ready to share): In your browser press Ctrl/Cmd+P → Destination: “Save as PDF”. For nicer styling, paste into Google Docs or Notion first, then File → Download/Export as PDF.
- Notion template (importable): In Notion, click Import → Markdown & CSV and upload a saved .md of this report; or create a new page and paste—use “Turn into” to format headings/blocks.
- Google Doc (editable): Open docs.new → Paste the report → Insert → Table of contents (optional) → Share as needed.
- Simple text copy (for WhatsApp/email): Copy the sections you need, or ask me for a condensed text-only version and I’ll generate it.

Tip: You can easily turn this into a chart using Canva, Notion, or Excel.

Reply with: Export: PDF / Notion / Google Doc / Text

---

This plan is a starting point. Execute, test, and adjust fast.

**⚠️ Important Disclaimer:** BizMap AI is not a legal or financial advisor. This report gives practical guidance to kickstart your journey, but always validate with real customers and professional advice where needed.

IMPORTANT GUIDELINES:
- Be region-aware (WhatsApp for LATAM, LinkedIn for EU/US, WeChat for China)
- **CRITICAL: Data Responsibility** - For pricing, market size, or benchmarks:
  * NEVER fabricate exact data or claim precision without sources
  * ALWAYS provide reasonable ranges with clear assumptions
  * ALWAYS suggest specific verification sources
  * Format: "For [industry] in [region], [metric] typically ranges between $X–$Y based on [assumption]. To verify/expand: check [specific sources]."
  * Example: "For SaaS tools in North America, monthly pricing usually ranges $15–$50 per user based on similar B2B software. To confirm your market: check Statista's SaaS pricing reports, Google Trends for demand, or LinkedIn searches for competitor analysis."
  * Verification sources to suggest: Google Trends, Statista, World Bank data, LinkedIn company searches, industry association reports, competitor websites, government databases
- Focus on execution over theory
- Use plain language, avoid jargon
- Be practical and actionable
- Keep it concise but complete`;

    const wantsStream = req.headers.get('Accept')?.includes('text/event-stream');

    const payload = {
      model: 'gpt-5-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are a global startup co-founder in chatbot form. You guide entrepreneurs through creating clear, actionable Launch Reports. You are practical, globally relevant, use plain language, and focus on execution over theory. Always use the exact formatting requested.'
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 2000,
      ...(wantsStream ? { stream: true } as const : {})
    };

    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!oaRes.ok) {
      const errorData = await oaRes.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = oaRes.body!.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await oaRes.json();
    const launchReport = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ launchReport }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bizmap-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate launch report',
        fallback: "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment, or feel free to continue and I'll do my best to help you manually."
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});