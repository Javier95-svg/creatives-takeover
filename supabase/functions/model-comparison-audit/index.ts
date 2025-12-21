import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model configurations for Lovable API
// Note: Model names may vary - verify with Lovable API documentation
// Common formats: 'provider/model-name' or just 'model-name'
const MODELS = {
  gemini: 'google/gemini-2.5-flash',  // Currently used
  // Alternative: 'gemini-2.5-flash', 'gemini-2.0-flash'
  claude: 'anthropic/claude-sonnet-4-20250514',  // Claude Sonnet
  // Alternative: 'claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022'
  gpt5: 'openai/gpt-5-2025-08-07'  // GPT-5
  // Alternative: 'gpt-5-2025-08-07', 'gpt-5'
};

// Test cases for business planning evaluation
const TEST_CASES = [
  {
    id: 'context_retention',
    name: 'Context Understanding and Retention',
    description: 'Multi-turn conversation with business context',
    messages: [
      {
        role: 'system',
        content: `You are BizMap AI - an expert business strategist for creative entrepreneurs.

CRITICAL: RESPONSE FORMAT REQUIREMENT
You MUST structure ALL responses in this exact format:

Problem: [What challenge or issue the founder is facing - be specific]
Insight: [Why this matters, what data/trends show, or strategic context - cite sources when providing facts]
Recommendation: [Specific, actionable advice tailored to their situation]
Next Actions: [Concrete steps they can take immediately - use bullet points, not numbered lists]

- Use bullet points for lists, not numbered lists or bold formatting
- Avoid using ** for emphasis - use clear, direct language instead`
      },
      {
        role: 'user',
        content: 'I want to build a SaaS tool for freelance designers to manage their client projects. The tool will help them track time, send invoices, and manage client communication all in one place.'
      },
      {
        role: 'assistant',
        content: 'That\'s a solid business idea. Let me help you think through this systematically.'
      },
      {
        role: 'user',
        content: 'What should my pricing model be?'
      }
    ],
    evaluation: {
      checks: [
        'Remembers the SaaS tool context (freelance designers, project management)',
        'Refers to previously mentioned features (time tracking, invoicing, client communication)',
        'Provides pricing specific to the SaaS/freelancer context, not generic advice'
      ]
    }
  },
  {
    id: 'logical_consistency',
    name: 'Logical Consistency in Multi-Step Reasoning',
    description: 'Structured business component alignment',
    messages: [
      {
        role: 'system',
        content: `You are BizMap AI - an expert business strategist for creative entrepreneurs.

CRITICAL: RESPONSE FORMAT REQUIREMENT
You MUST structure ALL responses in this exact format:

Problem: [What challenge or issue the founder is facing - be specific]
Insight: [Why this matters, what data/trends show, or strategic context - cite sources when providing facts]
Recommendation: [Specific, actionable advice tailored to their situation]
Next Actions: [Concrete steps they can take immediately - use bullet points, not numbered lists]`
      },
      {
        role: 'user',
        content: `I'm building a mobile app for college students to find study groups. My target customers are college students aged 18-22 who struggle with motivation and time management. I'm planning to charge $9.99/month per student. Should I sell through the App Store only, or also have a web version?`
      }
    ],
    evaluation: {
      checks: [
        'Revenue model ($9.99/month) aligns with distribution strategy recommendation',
        'Target customer (college students) influences distribution channel choice',
        'Reasoning connects problem → customer → revenue → distribution logically',
        'No contradictory advice (e.g., recommending expensive channels for low ARPU customers)'
      ]
    }
  },
  {
    id: 'structured_output',
    name: 'Structured, Non-Hallucinatory Output',
    description: 'Adherence to format requirements without fabrication',
    messages: [
      {
        role: 'system',
        content: `You are BizMap AI - an expert business strategist for creative entrepreneurs.

CRITICAL: RESPONSE FORMAT REQUIREMENT
You MUST structure ALL responses in this exact format:

Problem: [What challenge or issue the founder is facing - be specific]
Insight: [Why this matters, what data/trends show, or strategic context - cite sources when providing facts]
Recommendation: [Specific, actionable advice tailored to their situation]
Next Actions: [Concrete steps they can take immediately - use bullet points, not numbered lists]

HALLUCINATION PREVENTION RULES:
- NEVER fabricate specific statistics, company names, or market data without sources
- If you don't know something, say "I don't have current data on [X]. Here's how to find reliable sources: [specific steps]"
- ALWAYS distinguish between verified facts (with [Source X]) and strategic insights (your recommendations)`
      },
      {
        role: 'user',
        content: 'What\'s the average CAC for B2B SaaS companies targeting SMBs?'
      }
    ],
    evaluation: {
      checks: [
        'Follows Problem/Insight/Recommendation/Next Actions format exactly',
        'Does not fabricate specific numbers without sources',
        'If providing data, cites sources or acknowledges uncertainty',
        'Uses bullet points, not numbered lists or ** formatting',
        'Provides actionable, specific advice without generic platitudes'
      ]
    }
  },
  {
    id: 'component_alignment',
    name: 'Business Component Alignment',
    description: 'Consistency across problem, customer, value prop, revenue, distribution',
    messages: [
      {
        role: 'system',
        content: `You are BizMap AI - an expert business strategist for creative entrepreneurs.`

      },
      {
        role: 'user',
        content: `Problem: Small restaurants waste 30% of food due to poor inventory management.
Customer: Independent restaurant owners, 1-3 locations, $500K-$2M annual revenue.
Value Proposition: AI-powered inventory system that reduces food waste by 25% and saves $15K/year.
Revenue: $299/month per restaurant.
Distribution: Direct sales team reaching out to restaurants.

Does this business model make sense? What are the gaps?`
      }
    ],
    evaluation: {
      checks: [
        'Analyzes alignment between all components (problem matches customer, value prop matches problem, revenue matches customer ability to pay, distribution matches customer acquisition)',
        'Identifies logical inconsistencies if present',
        'Provides specific, actionable feedback, not vague observations',
        'Reasoning is clear and traceable'
      ]
    }
  },
  {
    id: 'specificity',
    name: 'Low Tendency for Vague/Generic Responses',
    description: 'Specific, actionable advice vs generic statements',
    messages: [
      {
        role: 'system',
        content: `You are BizMap AI - an expert business strategist for creative entrepreneurs.

CRITICAL: RESPONSE FORMAT REQUIREMENT
You MUST structure ALL responses in this exact format:

Problem: [What challenge or issue the founder is facing - be specific]
Insight: [Why this matters, what data/trends show, or strategic context - cite sources when providing facts]
Recommendation: [Specific, actionable advice tailored to their situation]
Next Actions: [Concrete steps they can take immediately - use bullet points, not numbered lists]

QUALITY STANDARDS:
- Provide specific, actionable advice with concrete examples and numbers when possible
- Avoid generic platitudes like "focus on your customers" or "build something great"
- Break down complex concepts into clear, understandable steps`
      },
      {
        role: 'user',
        content: 'How do I validate my business idea before building?'
      }
    ],
    evaluation: {
      checks: [
        'Provides specific validation methods (e.g., "create a landing page with Carrd", "interview 10 customers via LinkedIn")',
        'Includes concrete numbers or timeframes (e.g., "2-week sprint", "5 interviews")',
        'Avoids generic advice like "talk to customers" without specifics',
        'Each recommendation is actionable and testable'
      ]
    }
  }
];

interface ModelResponse {
  model: string;
  response: string;
  latency: number;
  error?: string;
}

interface EvaluationResult {
  model: string;
  testCase: string;
  response: string;
  scores: {
    contextRetention?: number;
    logicalConsistency?: number;
    structuredOutput?: number;
    componentAlignment?: number;
    specificity?: number;
  };
  strengths: string[];
  weaknesses: string[];
  evaluation: string;
}

async function callModel(modelName: string, messages: any[], temperature: number = 0.5): Promise<{ response: string; latency: number }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: temperature,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;
    
    return {
      response: data.choices[0].message.content,
      latency: latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    throw new Error(`Model call failed: ${error.message}`);
  }
}

function evaluateResponse(testCase: any, response: string, modelName: string): EvaluationResult {
  const lowerResponse = response.toLowerCase();
  const scores: any = {};
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const evaluationNotes: string[] = [];

  // Context retention evaluation
  if (testCase.id === 'context_retention') {
    let score = 0;
    const checks = testCase.evaluation.checks;
    
    if (checks[0] && (lowerResponse.includes('saas') || lowerResponse.includes('designer') || lowerResponse.includes('freelance'))) {
      score += 1;
      strengths.push('Maintains context of SaaS tool for designers');
    } else {
      weaknesses.push('Lost context of SaaS/designer focus');
    }
    
    if (checks[1] && (lowerResponse.includes('time') || lowerResponse.includes('invoice') || lowerResponse.includes('client'))) {
      score += 1;
      strengths.push('References previously mentioned features');
    } else {
      weaknesses.push('Does not reference specific features mentioned');
    }
    
    if (checks[2] && (lowerResponse.includes('saas') || lowerResponse.includes('monthly') || lowerResponse.includes('subscription') || lowerResponse.includes('freelance'))) {
      score += 1;
      strengths.push('Provides context-specific pricing advice');
    } else {
      weaknesses.push('Generic pricing advice, not tailored to context');
    }
    
    scores.contextRetention = (score / checks.length) * 100;
  }

  // Logical consistency evaluation
  if (testCase.id === 'logical_consistency') {
    let score = 0;
    const checks = testCase.evaluation.checks;
    
    // Check for alignment mentions
    const mentionsAlignment = lowerResponse.includes('align') || lowerResponse.includes('consistent') || lowerResponse.includes('makes sense') || lowerResponse.includes('logical');
    if (mentionsAlignment || (lowerResponse.includes('app store') && lowerResponse.includes('student'))) {
      score += 1;
      strengths.push('Considers alignment between components');
    } else {
      weaknesses.push('Does not explicitly evaluate component alignment');
    }
    
    // Check for logical reasoning
    const hasReasoning = lowerResponse.includes('because') || lowerResponse.includes('since') || lowerResponse.includes('given that') || lowerResponse.includes('considering');
    if (hasReasoning) {
      score += 1;
      strengths.push('Provides clear logical reasoning');
    } else {
      weaknesses.push('Lacks explicit logical connections');
    }
    
    // Check format adherence
    const hasFormat = lowerResponse.includes('problem:') && lowerResponse.includes('insight:') && lowerResponse.includes('recommendation:');
    if (hasFormat) {
      score += 1;
      strengths.push('Follows required format structure');
    } else {
      weaknesses.push('Does not follow required format');
    }
    
    scores.logicalConsistency = (score / checks.length) * 100;
  }

  // Structured output evaluation
  if (testCase.id === 'structured_output') {
    let score = 0;
    const checks = testCase.evaluation.checks;
    
    const hasFormat = lowerResponse.includes('problem:') && lowerResponse.includes('insight:') && lowerResponse.includes('recommendation:') && lowerResponse.includes('next actions:');
    if (hasFormat) {
      score += 1;
      strengths.push('Follows exact format requirements');
    } else {
      weaknesses.push('Does not follow required format structure');
    }
    
    // Check for fabricated statistics (negative check - should NOT have unsubstantiated numbers)
    const hasUncitedNumbers = /\d+%/g.test(response) && !lowerResponse.includes('source') && !lowerResponse.includes('typically') && !lowerResponse.includes('generally');
    if (!hasUncitedNumbers) {
      score += 1;
      strengths.push('Avoids unsourced statistical claims');
    } else {
      weaknesses.push('Includes unsubstantiated statistics');
    }
    
    // Check for source citations or uncertainty acknowledgment
    const hasSources = lowerResponse.includes('[source') || lowerResponse.includes('source') || lowerResponse.includes('don\'t have') || lowerResponse.includes('uncertain');
    if (hasSources) {
      score += 1;
      strengths.push('Cites sources or acknowledges uncertainty');
    } else {
      // Only mark as weakness if numbers are present
      if (/\d+%/g.test(response)) {
        weaknesses.push('Provides numbers without source citations');
      }
    }
    
    // Check formatting (no **, uses bullets)
    const hasBoldMarkdown = response.includes('**');
    const hasBullets = response.includes('- ') || response.includes('•');
    if (!hasBoldMarkdown && hasBullets) {
      score += 1;
      strengths.push('Uses bullet points, avoids markdown formatting');
    } else if (hasBoldMarkdown) {
      weaknesses.push('Uses ** markdown formatting (should avoid)');
    }
    
    // Check for specificity vs generic advice
    const isGeneric = lowerResponse.includes('it depends') && !lowerResponse.includes('specific') || 
                      (lowerResponse.match(/should|could|might/g) || []).length > 5;
    if (!isGeneric) {
      score += 1;
      strengths.push('Provides specific, actionable advice');
    } else {
      weaknesses.push('Response is too generic or vague');
    }
    
    scores.structuredOutput = (score / checks.length) * 100;
  }

  // Component alignment evaluation
  if (testCase.id === 'component_alignment') {
    let score = 0;
    const checks = testCase.evaluation.checks;
    
    // Check if response analyzes alignment
    const analyzesAlignment = lowerResponse.includes('align') || lowerResponse.includes('consistent') || lowerResponse.includes('makes sense') || 
                              lowerResponse.includes('gap') || lowerResponse.includes('issue') || lowerResponse.includes('concern');
    if (analyzesAlignment) {
      score += 1;
      strengths.push('Analyzes component alignment');
    } else {
      weaknesses.push('Does not analyze alignment between components');
    }
    
    // Check for specific feedback
    const isSpecific = (lowerResponse.match(/\$|\d+|specific|example/g) || []).length >= 3;
    if (isSpecific) {
      score += 1;
      strengths.push('Provides specific, concrete feedback');
    } else {
      weaknesses.push('Feedback is too vague or generic');
    }
    
    // Check for actionable insights
    const isActionable = lowerResponse.includes('should') || lowerResponse.includes('consider') || lowerResponse.includes('recommend');
    if (isActionable) {
      score += 1;
      strengths.push('Provides actionable recommendations');
    } else {
      weaknesses.push('Lacks actionable recommendations');
    }
    
    scores.componentAlignment = (score / checks.length) * 100;
  }

  // Specificity evaluation
  if (testCase.id === 'specificity') {
    let score = 0;
    const checks = testCase.evaluation.checks;
    
    // Check for specific methods
    const hasSpecificMethods = lowerResponse.includes('landing page') || lowerResponse.includes('interview') || 
                               lowerResponse.includes('survey') || lowerResponse.includes('prototype') ||
                               lowerResponse.includes('carrd') || lowerResponse.includes('linkedin');
    if (hasSpecificMethods) {
      score += 1;
      strengths.push('Provides specific validation methods');
    } else {
      weaknesses.push('Methods are too generic or abstract');
    }
    
    // Check for concrete numbers/timeframes
    const hasNumbers = /\d+/.test(response) && (lowerResponse.includes('week') || lowerResponse.includes('day') || 
                                                lowerResponse.includes('month') || lowerResponse.includes('customer'));
    if (hasNumbers) {
      score += 1;
      strengths.push('Includes concrete numbers and timeframes');
    } else {
      weaknesses.push('Lacks specific numbers or timeframes');
    }
    
    // Check for generic platitudes (negative)
    const hasGenericPlatitudes = lowerResponse.includes('focus on your customers') || 
                                 lowerResponse.includes('build something great') ||
                                 lowerResponse.includes('find product-market fit') && !lowerResponse.includes('specific');
    if (!hasGenericPlatitudes) {
      score += 1;
      strengths.push('Avoids generic platitudes');
    } else {
      weaknesses.push('Contains generic platitudes without specifics');
    }
    
    // Check actionability
    const isActionable = (lowerResponse.match(/create|build|interview|set up|launch|test/g) || []).length >= 3;
    if (isActionable) {
      score += 1;
      strengths.push('Recommendations are actionable and testable');
    } else {
      weaknesses.push('Recommendations lack clear actionability');
    }
    
    scores.specificity = (score / checks.length) * 100;
  }

  return {
    model: modelName,
    testCase: testCase.id,
    response: response,
    scores: scores,
    strengths: strengths,
    weaknesses: weaknesses,
    evaluation: evaluationNotes.join('; ')
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: EvaluationResult[] = [];
    
    // Test each model on each test case
    for (const [modelKey, modelName] of Object.entries(MODELS)) {
      console.log(`\n=== Testing ${modelKey.toUpperCase()} (${modelName}) ===\n`);
      
      for (const testCase of TEST_CASES) {
        console.log(`Testing: ${testCase.name}`);
        
        try {
          const { response, latency } = await callModel(modelName, testCase.messages, 0.5);
          const evaluation = evaluateResponse(testCase, response, modelName);
          evaluation.response = response.substring(0, 1000); // Truncate for storage
          
          results.push(evaluation);
          console.log(`  ✓ Completed (${latency}ms)`);
          console.log(`  Scores:`, evaluation.scores);
          
          // Small delay between requests
          await new Promise(r => setTimeout(r, 1000));
        } catch (error) {
          console.error(`  ✗ Failed: ${error.message}`);
          results.push({
            model: modelName,
            testCase: testCase.id,
            response: '',
            scores: {},
            strengths: [],
            weaknesses: [`Error: ${error.message}`],
            evaluation: 'Model call failed'
          });
        }
      }
    }

    // Aggregate results by model
    const modelSummaries: any = {};
    
    for (const [modelKey, modelName] of Object.entries(MODELS)) {
      const modelResults = results.filter(r => r.model === modelName);
      
      const avgScores: any = {};
      const allStrengths: string[] = [];
      const allWeaknesses: string[] = [];
      
      for (const result of modelResults) {
        for (const [scoreType, score] of Object.entries(result.scores)) {
          if (!avgScores[scoreType]) {
            avgScores[scoreType] = [];
          }
          avgScores[scoreType].push(score);
        }
        allStrengths.push(...result.strengths);
        allWeaknesses.push(...result.weaknesses);
      }
      
      const finalScores: any = {};
      for (const [scoreType, scoreArray] of Object.entries(avgScores)) {
        finalScores[scoreType] = (scoreArray as number[]).reduce((a, b) => a + b, 0) / (scoreArray as number[]).length;
      }
      
      modelSummaries[modelKey] = {
        model: modelName,
        averageScores: finalScores,
        overallAverage: Object.values(finalScores).length > 0 
          ? Object.values(finalScores).reduce((a: any, b: any) => a + b, 0) / Object.values(finalScores).length 
          : 0,
        commonStrengths: allStrengths,
        commonWeaknesses: allWeaknesses,
        testResults: modelResults
      };
    }

    // Generate recommendation
    const modelRankings = Object.entries(modelSummaries)
      .map(([key, summary]: [string, any]) => ({
        key,
        model: summary.model,
        score: summary.overallAverage
      }))
      .sort((a, b) => b.score - a.score);

    const recommendation = {
      bestModel: modelRankings[0],
      rankings: modelRankings,
      detailedResults: modelSummaries,
      rawResults: results
    };

    return new Response(JSON.stringify(recommendation, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Audit error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

