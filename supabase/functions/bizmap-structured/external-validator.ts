// External data validator
// Cross-references with market data, competitors, and benchmarks

import type {
  ComponentType,
  ProblemComponent,
  TargetUserComponent,
  ValuePropComponent,
  RevenueComponent,
  DistributionComponent,
  BizMapComponent,
  ValidationError
} from './types.ts';

export interface ExternalValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  externalDataRefs: Record<string, any>;
}

export async function validateWithExternalData(
  components: Partial<Record<ComponentType, BizMapComponent>>,
  supabase: any
): Promise<ExternalValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const externalDataRefs: Record<string, any> = {};

  const problem = components.problem as ProblemComponent | undefined;
  const targetUser = components.target_user as TargetUserComponent | undefined;
  const valueProp = components.value_prop as ValuePropComponent | undefined;
  const revenue = components.revenue as RevenueComponent | undefined;
  const distribution = components.distribution as DistributionComponent | undefined;

  // Validate problem against market intelligence
  if (problem && problem.problem_statement) {
    try {
      const problemKeywords = extractKeywords(problem.problem_statement);
      
      // Query market intelligence for similar problems
      const { data: marketData, error } = await supabase
        .from('market_intelligence')
        .select('data_payload, industry, relevance_score, data_type')
        .or(problemKeywords.map((kw, i) => `keywords.cs.{${kw}}`).join(','))
        .eq('data_type', 'trend')
        .gte('relevance_score', 0.3)
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (!error && marketData && marketData.length > 0) {
        externalDataRefs.problem_market_data = marketData;
        
        // Check if similar problems exist with high relevance
        const highRelevanceMatches = marketData.filter((m: any) => m.relevance_score > 0.7);
        
        if (highRelevanceMatches.length > 0) {
          warnings.push({
            component: 'problem',
            message: 'Similar problems identified in market intelligence - validate uniqueness',
            severity: 'warning',
            suggestion: 'Review market intelligence data to ensure differentiation'
          });
        }
      }
    } catch (error) {
      console.error('Error validating problem with external data:', error);
    }
  }

  // Validate target user against market data
  if (targetUser && targetUser.demographics) {
    try {
      const industry = targetUser.demographics.location;
      
      if (industry) {
        const { data: marketData, error } = await supabase
          .from('market_intelligence')
          .select('data_payload, industry, data_type, keywords')
          .ilike('geographic_region', `%${industry}%`)
          .in('data_type', ['trend', 'customer_behavior'])
          .order('freshness_score', { ascending: false })
          .limit(3);

        if (!error && marketData && marketData.length > 0) {
          externalDataRefs.target_user_market_data = marketData;
        }
      }
    } catch (error) {
      console.error('Error validating target user with external data:', error);
    }
  }

  // Validate revenue pricing against benchmarks
  if (revenue && revenue.price_point && revenue.model_type) {
    try {
      // Query for similar pricing in market intelligence
      const { data: pricingData, error } = await supabase
        .from('market_intelligence')
        .select('data_payload, industry, data_type')
        .eq('data_type', 'pricing')
        .order('freshness_score', { ascending: false })
        .limit(5);

      if (!error && pricingData && pricingData.length > 0) {
        externalDataRefs.pricing_benchmarks = pricingData;
        
        // Extract pricing ranges from market data
        const pricingRanges = extractPricingRanges(pricingData, revenue.model_type);
        
        if (pricingRanges.length > 0) {
          const minPrice = Math.min(...pricingRanges);
          const maxPrice = Math.max(...pricingRanges);
          
          if (revenue.price_point < minPrice * 0.5) {
            warnings.push({
              component: 'revenue',
              message: `Price point (${revenue.price_point}) may be below market benchmarks (${minPrice}-${maxPrice})`,
              severity: 'warning',
              suggestion: 'Consider increasing price to match market standards'
            });
          } else if (revenue.price_point > maxPrice * 2) {
            warnings.push({
              component: 'revenue',
              message: `Price point (${revenue.price_point}) is significantly above market benchmarks (${minPrice}-${maxPrice})`,
              severity: 'warning',
              suggestion: 'Ensure value proposition justifies premium pricing'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error validating revenue with external data:', error);
    }
  }

  // Validate value prop against competitors
  if (valueProp && valueProp.unique_value) {
    try {
      const valueKeywords = extractKeywords(valueProp.unique_value);
      
      // Query for competitive intelligence
      const { data: competitorData, error } = await supabase
        .from('market_intelligence')
        .select('data_payload, industry, data_type, keywords')
        .eq('data_type', 'competitor')
        .or(valueKeywords.map((kw, i) => `keywords.cs.{${kw}}`).join(','))
        .order('relevance_score', { ascending: false })
        .limit(5);

      if (!error && competitorData && competitorData.length > 0) {
        externalDataRefs.competitor_data = competitorData;
        
        // Check if similar value props exist
        const similarValueProps = competitorData.filter((c: any) => {
          const competitorValue = JSON.stringify(c.data_payload).toLowerCase();
          const ourValue = valueProp.unique_value.toLowerCase();
          return competitorValue.includes(ourValue) || ourValue.includes(competitorValue);
        });

        if (similarValueProps.length > 0) {
          warnings.push({
            component: 'value_prop',
            message: 'Similar value propositions identified - validate uniqueness',
            severity: 'warning',
            suggestion: 'Review competitor data to strengthen differentiation'
          });
        }
      }
    } catch (error) {
      console.error('Error validating value prop with external data:', error);
    }
  }

  // Validate distribution channels against market intelligence
  if (distribution && distribution.channels && distribution.channels.length > 0) {
    try {
      const channelKeywords = distribution.channels.join(' ');
      const keywords = extractKeywords(channelKeywords);
      
      const { data: channelData, error } = await supabase
        .from('market_intelligence')
        .select('data_payload, industry, data_type')
        .eq('data_type', 'marketing_channels')
        .or(keywords.map((kw, i) => `keywords.cs.{${kw}}`).join(','))
        .order('relevance_score', { ascending: false })
        .limit(3);

      if (!error && channelData && channelData.length > 0) {
        externalDataRefs.distribution_channel_data = channelData;
      }
    } catch (error) {
      console.error('Error validating distribution with external data:', error);
    }
  }

  // Query market validation scores for similar business ideas
  if (problem && valueProp) {
    try {
      const businessIdea = `${problem.problem_statement} ${valueProp.unique_value}`;
      const ideaKeywords = extractKeywords(businessIdea);
      
      // This is a simplified check - in production, you'd want more sophisticated matching
      const { data: validationScores, error } = await supabase
        .from('market_validation_scores')
        .select('business_idea, overall_validation_score, demand_score, competition_score')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && validationScores && validationScores.length > 0) {
        externalDataRefs.market_validation_examples = validationScores;
        
        // Check average validation scores for reference
        const avgValidation = validationScores.reduce((sum: number, v: any) => 
          sum + (v.overall_validation_score || 0), 0) / validationScores.length;
        
        if (avgValidation < 50) {
          warnings.push({
            component: 'problem',
            message: 'Market validation scores in this area tend to be low - validate demand thoroughly',
            severity: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error querying market validation scores:', error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    externalDataRefs
  };
}

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - remove stop words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Return unique keywords, max 10
  return [...new Set(words)].slice(0, 10);
}

// Helper function to extract pricing ranges from market data
function extractPricingRanges(marketData: any[], modelType: string): number[] {
  const prices: number[] = [];
  
  marketData.forEach(item => {
    try {
      const payload = typeof item.data_payload === 'string' 
        ? JSON.parse(item.data_payload) 
        : item.data_payload;
      
      // Try to extract pricing information
      if (payload.pricing) {
        const pricing = payload.pricing;
        if (typeof pricing === 'number') {
          prices.push(pricing);
        } else if (pricing.min && pricing.max) {
          prices.push(pricing.min, pricing.max);
        } else if (pricing.price) {
          prices.push(pricing.price);
        }
      }
      
      // Try common pricing fields
      if (payload.price) prices.push(Number(payload.price));
      if (payload.monthly_price) prices.push(Number(payload.monthly_price));
      if (payload.annual_price) prices.push(Number(payload.annual_price));
    } catch (error) {
      // Skip invalid data
    }
  });

  return prices.filter(p => p > 0 && p < 1000000); // Filter out invalid prices
}

