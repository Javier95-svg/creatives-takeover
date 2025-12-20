// Cross-component validation system
// Validates consistency between components

import type {
  ComponentType,
  ProblemComponent,
  TargetUserComponent,
  ValuePropComponent,
  RevenueComponent,
  DistributionComponent,
  CostsComponent,
  RisksComponent,
  AssumptionsComponent,
  BizMapComponent,
  ValidationError
} from './types.ts';

export interface CrossValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function crossValidateComponents(
  components: Partial<Record<ComponentType, BizMapComponent>>
): CrossValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const problem = components.problem as ProblemComponent | undefined;
  const targetUser = components.target_user as TargetUserComponent | undefined;
  const valueProp = components.value_prop as ValuePropComponent | undefined;
  const revenue = components.revenue as RevenueComponent | undefined;
  const distribution = components.distribution as DistributionComponent | undefined;
  const costs = components.costs as CostsComponent | undefined;
  const risks = components.risks as RisksComponent | undefined;
  const assumptions = components.assumptions as AssumptionsComponent | undefined;

  // Problem ↔ Target User validation
  if (problem && targetUser) {
    const problemPainPoints = problem.affected_users?.toLowerCase() || '';
    const targetUserPainPoints = targetUser.psychographics?.pain_points?.join(' ').toLowerCase() || '';
    const userSegment = targetUser.user_segment_name?.toLowerCase() || '';

    // Check if problem's affected users align with target user segment
    if (problemPainPoints && userSegment && !problemPainPoints.includes(userSegment) && 
        !userSegment.includes(problemPainPoints)) {
      warnings.push({
        component: 'problem',
        message: 'Problem\'s affected users may not align with target user segment',
        severity: 'warning',
        suggestion: 'Ensure the problem description matches the target user segment'
      });
    }

    // Check if target user's pain points align with problem statement
    if (targetUserPainPoints && problem.problem_statement) {
      const problemWords = problem.problem_statement.toLowerCase().split(/\s+/);
      const painPointWords = targetUserPainPoints.split(/\s+/);
      const overlap = problemWords.filter(word => painPointWords.includes(word)).length;
      
      if (overlap < 2 && problem.problem_statement.length > 30) {
        warnings.push({
          component: 'target_user',
          message: 'Target user pain points may not align with problem statement',
          severity: 'warning',
          suggestion: 'Ensure pain points match the problem being solved'
        });
      }
    }
  }

  // Value Prop ↔ Revenue validation
  if (valueProp && revenue) {
    // Check if value prop supports the pricing model
    const uniqueValue = valueProp.unique_value?.toLowerCase() || '';
    const keyBenefits = valueProp.key_benefits?.join(' ').toLowerCase() || '';
    const valuePropText = `${uniqueValue} ${keyBenefits}`;

    // Subscription models typically require ongoing value
    if (revenue.model_type === 'subscription') {
      if (!valuePropText.includes('ongoing') && !valuePropText.includes('recurring') && 
          !valuePropText.includes('continuous') && !valuePropText.includes('monthly') &&
          !valuePropText.includes('weekly')) {
        warnings.push({
          component: 'value_prop',
          message: 'Subscription model typically requires ongoing/recurring value proposition',
          severity: 'warning',
          suggestion: 'Ensure value prop clearly communicates ongoing benefits for subscription model'
        });
      }
    }

    // Check if value prop mentions pricing justification
    if (revenue.price_point && revenue.price_point > 100) {
      const mentionsValue = valuePropText.includes('premium') || 
                           valuePropText.includes('quality') || 
                           valuePropText.includes('exclusive') ||
                           valueProp.differentiation?.toLowerCase().includes('premium');
      
      if (!mentionsValue && revenue.price_point > 500) {
        warnings.push({
          component: 'value_prop',
          message: 'High price point should be justified in value proposition',
          severity: 'warning'
        });
      }
    }
  }

  // Distribution ↔ Target User validation
  if (distribution && targetUser) {
    const channels = distribution.channels || [];
    const techComfort = targetUser.digital_behavior?.tech_comfort_level;
    const primaryPlatforms = targetUser.digital_behavior?.primary_platforms || [];

    // Check if digital channels align with tech comfort level
    const hasDigitalChannels = channels.some(c => 
      c.toLowerCase().includes('digital') || 
      c.toLowerCase().includes('online') || 
      c.toLowerCase().includes('web') ||
      c.toLowerCase().includes('app') ||
      c.toLowerCase().includes('social')
    );

    if (hasDigitalChannels && techComfort === 'low') {
      warnings.push({
        component: 'distribution',
        message: 'Digital channels may not align with low tech comfort level of target users',
        severity: 'warning',
        suggestion: 'Consider adding offline or assisted channels for low-tech users'
      });
    }

    // Check if channels align with user's primary platforms
    if (primaryPlatforms.length > 0 && distribution.channel_strategy) {
      const channelStrategies = Object.keys(distribution.channel_strategy);
      const platformChannels = primaryPlatforms.map(p => p.toLowerCase());
      
      // Check if primary channel aligns with user platforms
      if (distribution.primary_channel && !platformChannels.some(p => 
          distribution.primary_channel.toLowerCase().includes(p))) {
        warnings.push({
          component: 'distribution',
          message: 'Primary channel may not align with target user\'s primary platforms',
          severity: 'warning',
          suggestion: 'Consider channels that match where target users already spend time'
        });
      }
    }
  }

  // Costs ↔ Revenue (Unit Economics) validation
  if (costs && revenue) {
    if (revenue.price_point && revenue.price_point > 0) {
      // Calculate variable cost per customer if available
      const variableCosts = costs.variable_costs || {};
      const perCustomerCost = variableCosts.per_customer || 
                             variableCosts.customer_acquisition || 
                             0;

      // Check unit economics
      if (perCustomerCost > 0 && revenue.price_point <= perCustomerCost) {
        errors.push({
          component: 'revenue',
          message: `Price point (${revenue.price_point}) must be greater than variable cost per customer (${perCustomerCost})`,
          severity: 'error',
          suggestion: 'Increase price point or reduce variable costs per customer'
        });
      }

      // Check if price covers variable costs with reasonable margin
      if (perCustomerCost > 0) {
        const margin = ((revenue.price_point - perCustomerCost) / revenue.price_point) * 100;
        if (margin < 20 && revenue.model_type !== 'marketplace') {
          warnings.push({
            component: 'revenue',
            message: `Low margin (${margin.toFixed(1)}%) - consider increasing price or reducing costs`,
            severity: 'warning'
          });
        }
      }

      // Check monthly recurring costs vs subscription pricing
      if (revenue.model_type === 'subscription' && revenue.payment_frequency === 'monthly') {
        const monthlyRecurring = costs.monthly_recurring || 0;
        if (monthlyRecurring > 0 && revenue.price_point <= monthlyRecurring) {
          errors.push({
            component: 'revenue',
            message: `Monthly subscription price (${revenue.price_point}) must cover monthly recurring costs (${monthlyRecurring})`,
            severity: 'error'
          });
        }
      }
    }
  }

  // Risks ↔ Assumptions validation
  if (risks && assumptions) {
    // Check if critical assumptions have corresponding risk mitigation
    const criticalAssumptions = assumptions.assumptions?.filter(a => a.critical) || [];
    const highSeverityRisks = risks.risks?.filter(r => 
      r.severity === 'critical' || r.severity === 'high'
    ) || [];

    criticalAssumptions.forEach(assumption => {
      // Check if assumption has corresponding risk
      const assumptionText = assumption.statement.toLowerCase();
      const hasCorrespondingRisk = highSeverityRisks.some(risk => {
        const riskDescription = risk.description.toLowerCase();
        return assumptionText.includes(riskDescription) || riskDescription.includes(assumptionText);
      });

      if (!hasCorrespondingRisk) {
        warnings.push({
          component: 'assumptions',
          message: `Critical assumption "${assumption.statement.substring(0, 50)}..." may need corresponding risk assessment`,
          severity: 'warning',
          suggestion: 'Consider adding a risk for this critical assumption'
        });
      }
    });

    // Check if critical risks have mitigation plans
    highSeverityRisks.forEach((risk, index) => {
      if (!risk.mitigation || risk.mitigation.trim().length === 0) {
        warnings.push({
          component: 'risks',
          message: `High severity risk "${risk.description.substring(0, 50)}..." should have mitigation strategy`,
          severity: 'warning'
        });
      }
    });
  }

  // Problem ↔ Value Prop validation
  if (problem && valueProp) {
    const problemStatement = problem.problem_statement?.toLowerCase() || '';
    const uniqueValue = valueProp.unique_value?.toLowerCase() || '';
    
    // Check if value prop addresses the problem
    const problemKeywords = problemStatement.split(/\s+/).filter(w => w.length > 4);
    const valuePropKeywords = uniqueValue.split(/\s+/);
    const overlap = problemKeywords.filter(keyword => valuePropKeywords.includes(keyword)).length;

    if (overlap < 1 && problemStatement.length > 30) {
      warnings.push({
        component: 'value_prop',
        message: 'Value proposition may not directly address the stated problem',
        severity: 'warning',
        suggestion: 'Ensure value prop clearly solves the problem described'
      });
    }
  }

  // Distribution ↔ Revenue validation
  if (distribution && revenue) {
    // Marketplace model typically requires marketplace distribution
    if (revenue.model_type === 'marketplace') {
      const hasMarketplaceChannel = distribution.channels?.some(c => 
        c.toLowerCase().includes('marketplace') || 
        c.toLowerCase().includes('platform') ||
        c.toLowerCase().includes('two-sided')
      );

      if (!hasMarketplaceChannel) {
        warnings.push({
          component: 'distribution',
          message: 'Marketplace revenue model typically requires marketplace/platform distribution channels',
          severity: 'warning'
        });
      }
    }

    // Check if CAC estimate aligns with price point
    if (distribution.acquisition_cost_estimate && revenue.price_point) {
      const cacToPriceRatio = distribution.acquisition_cost_estimate / revenue.price_point;
      
      if (cacToPriceRatio > 1) {
        errors.push({
          component: 'distribution',
          message: `Customer acquisition cost (${distribution.acquisition_cost_estimate}) exceeds price point (${revenue.price_point})`,
          severity: 'error',
          suggestion: 'Reduce acquisition costs or increase price point'
        });
      } else if (cacToPriceRatio > 0.5 && revenue.model_type === 'one-time') {
        warnings.push({
          component: 'distribution',
          message: 'CAC is high relative to one-time price - consider subscription model',
          severity: 'warning'
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

