import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  businessIdea: string;
  budget?: string;
  skills?: string;
  timeCommitment?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessIdea, budget, skills, timeCommitment }: AnalysisRequest = await req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create context-aware prompt for GPT-5
    const prompt = `You are a startup mentor and execution strategist. Analyze this business idea and provide a comprehensive, actionable business plan.

BUSINESS IDEA: "${businessIdea}"

USER CONTEXT:
- Budget: ${budget || "Not specified"}
- Skills: ${skills || "Not specified"}  
- Time Commitment: ${timeCommitment || "Not specified"}

Provide your analysis in this EXACT format:

# 📊 Business Analysis Report

## 💡 Business Idea Overview
"${businessIdea}"

## 🎯 Viability Assessment

### Market Potential Analysis
[Provide 2-3 sentences on market size, growth trends, and accessibility]

### Key Risk Factors
[List 3-4 main risks with brief explanations]

### Growth Opportunities
[Identify 3-4 key opportunities for expansion/differentiation]

### **Viability Score: X/10**
**Reasoning:** [2-3 sentences explaining the score based on market, competition, execution difficulty, and user context]

---

## 🚀 Strategic Improvements

1. **[Improvement Title]:** [Specific actionable recommendation]
2. **[Improvement Title]:** [Specific actionable recommendation] 
3. **[Improvement Title]:** [Specific actionable recommendation]

---

## 🧪 Quick Validation Experiments (Complete in 2 weeks)

### Experiment 1: [Name]
- **Method:** [Specific approach]
- **Tools:** [Free/low-cost tools, adjust for budget]
- **Target Metric:** [Success criteria]
- **Budget:** [Cost estimate]

### Experiment 2: [Name]
- **Method:** [Specific approach]
- **Tools:** [Free/low-cost tools]
- **Target Metric:** [Success criteria]
- **Budget:** [Cost estimate]

---

## 📋 Custom Execution Blueprint

### Phase 1: Validation & Research (Weeks 1-4)
**Objective:** [Main goal]
**Key Actions:**
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
**Recommended Tools:** [Free/low-cost options based on budget]
**Timeline:** [Adjust for time commitment]
**Success Metrics:** [Measurable outcomes]

### Phase 2: MVP Development (Weeks 5-12)  
**Objective:** [Main goal]
**Key Actions:**
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
**Recommended Tools:** [Tools appropriate for their skill level]
**Timeline:** [Adjust for time commitment]
**Success Metrics:** [Measurable outcomes]

### Phase 3: Market Launch (Weeks 13-24)
**Objective:** [Main goal]
**Key Actions:**
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
**Recommended Tools:** [Marketing tools within budget]
**Timeline:** [Adjust for time commitment]
**Success Metrics:** [Measurable outcomes]

### Phase 4: Growth & Scale (Weeks 25-52)
**Objective:** [Main goal]
**Key Actions:**
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
• [Action tailored to user's skills/budget]
**Recommended Tools:** [Advanced tools as budget allows]
**Timeline:** [Adjust for time commitment]  
**Success Metrics:** [Measurable outcomes]

---

## 📅 Prioritized Next Steps

### This Week (Immediate Actions)
1. [Specific task for this week]
2. [Specific task for this week]
3. [Specific task for this week]

### This Month (Foundation Building)
1. [Monthly milestone]
2. [Monthly milestone]
3. [Monthly milestone]

### This Quarter (Growth Objectives)
1. [Quarterly goal]
2. [Quarterly goal]
3. [Quarterly goal]

---

*📄 This personalized business plan is formatted for easy export and can be saved as your strategic roadmap.*

IMPORTANT: 
- Adapt ALL recommendations to the user's budget, skills, and time constraints
- Suggest free/low-cost tools when budget is under $1,000
- Adjust timelines if they're part-time (5-10 hours/week)
- Leverage their existing skills and suggest partnerships for skill gaps
- Be specific and actionable, not generic
- Keep tone practical and supportive`;

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
            content: 'You are a startup mentor and execution strategist. Provide practical, actionable business analysis with specific recommendations tailored to the user\'s constraints. Always use the exact formatting requested.'
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
    const analysis = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ analysis }),
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
        error: error.message || 'Failed to generate analysis',
        fallback: "I apologize, but I'm having trouble connecting to the AI analysis service right now. Please try again in a moment, or feel free to describe your business idea and I'll do my best to help you manually."
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