import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  region?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { answers, region }: LaunchReportRequest = await req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create Launch Report prompt for GPT-5
    const prompt = `You are a global startup co-founder in chatbot form. Your mission is to guide entrepreneurs through creating a clear, actionable "Launch Report" they can follow to start and grow their business. You are practical, globally relevant, and use plain language.

USER'S 7-STEP RESPONSES:
1. Overview: ${answers.overview}
2. Market: ${answers.market}
3. Problem: ${answers.problem}
4. Solution: ${answers.solution}
5. Channels: ${answers.channels}
6. Pricing/Costs: ${answers.pricing}
7. Goals: ${answers.goals}

TARGET REGION: ${region || "Global"}

Generate a LAUNCH REPORT with these EXACT sections:

# 🚀 Launch Report

## Executive Summary
[2-3 sentences summarizing the business opportunity and key success factors]

## Lean Canvas Snapshot
**Problem:** [From their response]
**Solution:** [From their response]  
**Key Customers:** [Based on market/problem responses]
**Channels:** [From their response + regional recommendations]
**Revenue Streams:** [Based on pricing response]
**Key Costs:** [From pricing response + realistic estimates]

## Customer Persona
**Name:** [Give them a name]
**Demographics:** [Age, location, income level]
**Pain Points:** [Top 3 specific problems]
**Where They Spend Time:** [Digital platforms, physical locations]
**Buying Triggers:** [What makes them purchase]

## Validation Plan - 5 Next Steps
1. **[Step Name]:** [Specific action in 1-2 weeks]
2. **[Step Name]:** [Specific action in 1-2 weeks]
3. **[Step Name]:** [Specific action in 1-2 weeks]
4. **[Step Name]:** [Specific action in 1-2 weeks]
5. **[Step Name]:** [Specific action in 1-2 weeks]

## Go-To-Market One-Pager
**Primary Channel Focus:** [Single best channel for their situation]
**First 10 Customers Plan:**
• [Specific tactic 1]
• [Specific tactic 2]
• [Specific tactic 3]

## Simple Pricing & Breakeven Analysis
**Recommended Pricing:** [Specific price point]
**Key Assumptions:**
• Customer acquisition cost: $[X]
• Monthly customers needed: [X]
• Break-even timeline: [X] months

**Monthly Revenue Target:** $[X]
**Monthly Cost Estimate:** $[X]

## 90-Day Roadmap & KPIs

### Month 1: Foundation
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]

### Month 2: Validation  
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]

### Month 3: Launch
**Goal:** [Specific milestone]
**Key Actions:** [3 specific tasks]
**KPI:** [Measurable metric]

## Copy-Paste Scripts

### WhatsApp/SMS Message:
"[Ready-to-use customer outreach message]"

### Cold Email Subject + Body:
**Subject:** [Compelling subject line]
**Body:** [3-4 sentence email template]

### Landing Page Headline:
"[Compelling headline that addresses their problem]"

---

⚡ This plan is a starting point. Execute, test, and adjust fast.

IMPORTANT GUIDELINES:
- Be region-aware (WhatsApp for LATAM, LinkedIn for EU/US, WeChat for China)
- No unrealistic market data - use ballpark figures with noted assumptions
- Focus on execution over theory
- Use plain language, avoid jargon
- Be practical and actionable
- Keep it concise but complete`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are a global startup co-founder in chatbot form. You guide entrepreneurs through creating clear, actionable Launch Reports. You are practical, globally relevant, use plain language, and focus on execution over theory. Always use the exact formatting requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const launchReport = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ launchReport }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

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