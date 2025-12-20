// Rule-based validation engine for components
// NO LLM - pure code-based validation logic

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
  ValidationError,
  ValidationResult
} from './types.ts';

export function validateProblem(component: ProblemComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!component.problem_statement || component.problem_statement.trim().length === 0) {
    errors.push({
      component: 'problem',
      field: 'problem_statement',
      message: 'Problem statement is required',
      severity: 'error'
    });
  } else if (component.problem_statement.length < 10) {
    errors.push({
      component: 'problem',
      field: 'problem_statement',
      message: 'Problem statement must be at least 10 characters',
      severity: 'error',
      suggestion: 'Provide more specific details about the problem'
    });
  } else if (component.problem_statement.length > 200) {
    errors.push({
      component: 'problem',
      field: 'problem_statement',
      message: 'Problem statement must be 200 characters or less',
      severity: 'error'
    });
  } else if (component.problem_statement.toLowerCase().includes('better') || 
             component.problem_statement.toLowerCase().includes('improved') ||
             component.problem_statement.length < 30) {
    warnings.push({
      component: 'problem',
      field: 'problem_statement',
      message: 'Problem statement may be too generic',
      severity: 'warning',
      suggestion: 'Be more specific about the exact problem and who experiences it'
    });
  }

  if (!component.severity) {
    errors.push({
      component: 'problem',
      field: 'severity',
      message: 'Severity is required',
      severity: 'error'
    });
  }

  if (!component.frequency) {
    errors.push({
      component: 'problem',
      field: 'frequency',
      message: 'Frequency is required',
      severity: 'error'
    });
  }

  if (component.pain_intensity === undefined || component.pain_intensity === null) {
    errors.push({
      component: 'problem',
      field: 'pain_intensity',
      message: 'Pain intensity is required',
      severity: 'error'
    });
  } else if (component.pain_intensity < 1 || component.pain_intensity > 10) {
    errors.push({
      component: 'problem',
      field: 'pain_intensity',
      message: 'Pain intensity must be between 1 and 10',
      severity: 'error'
    });
  }

  // Business logic validations
  if (component.severity === 'low' && component.frequency === 'occasional') {
    warnings.push({
      component: 'problem',
      message: 'Low severity + occasional frequency may indicate weak problem-solution fit',
      severity: 'warning',
      suggestion: 'Consider if this problem is painful enough to justify building a solution'
    });
  }

  if (component.pain_intensity !== undefined && component.pain_intensity < 4) {
    warnings.push({
      component: 'problem',
      field: 'pain_intensity',
      message: 'Low pain intensity may indicate weak market demand',
      severity: 'warning'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateTargetUser(component: TargetUserComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Demographics validation
  if (!component.demographics) {
    errors.push({
      component: 'target_user',
      field: 'demographics',
      message: 'Demographics are required',
      severity: 'error'
    });
  } else {
    if (!component.demographics.age_range) {
      errors.push({
        component: 'target_user',
        field: 'demographics.age_range',
        message: 'Age range is required',
        severity: 'error'
      });
    }

    if (!component.demographics.location) {
      errors.push({
        component: 'target_user',
        field: 'demographics.location',
        message: 'Location is required',
        severity: 'error'
      });
    }
  }

  // Psychographics validation
  if (!component.psychographics) {
    errors.push({
      component: 'target_user',
      field: 'psychographics',
      message: 'Psychographics are required',
      severity: 'error'
    });
  } else {
    if (!component.psychographics.values || component.psychographics.values.length === 0) {
      errors.push({
        component: 'target_user',
        field: 'psychographics.values',
        message: 'At least one value is required',
        severity: 'error'
      });
    } else if (component.psychographics.values.length > 5) {
      errors.push({
        component: 'target_user',
        field: 'psychographics.values',
        message: 'Maximum 5 values allowed',
        severity: 'error'
      });
    }

    if (!component.psychographics.motivations || component.psychographics.motivations.length === 0) {
      errors.push({
        component: 'target_user',
        field: 'psychographics.motivations',
        message: 'At least one motivation is required',
        severity: 'error'
      });
    }
  }

  // Digital behavior validation
  if (!component.digital_behavior) {
    errors.push({
      component: 'target_user',
      field: 'digital_behavior',
      message: 'Digital behavior is required',
      severity: 'error'
    });
  } else {
    if (!component.digital_behavior.tech_comfort_level) {
      errors.push({
        component: 'target_user',
        field: 'digital_behavior.tech_comfort_level',
        message: 'Tech comfort level is required',
        severity: 'error'
      });
    }

    if (component.digital_behavior.primary_platforms && component.digital_behavior.primary_platforms.length > 5) {
      errors.push({
        component: 'target_user',
        field: 'digital_behavior.primary_platforms',
        message: 'Maximum 5 platforms allowed',
        severity: 'error'
      });
    }
  }

  // User segment name
  if (!component.user_segment_name || component.user_segment_name.trim().length === 0) {
    errors.push({
      component: 'target_user',
      field: 'user_segment_name',
      message: 'User segment name is required',
      severity: 'error'
    });
  } else if (component.user_segment_name.length > 100) {
    errors.push({
      component: 'target_user',
      field: 'user_segment_name',
      message: 'User segment name must be 100 characters or less',
      severity: 'error'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateValueProp(component: ValuePropComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!component.unique_value || component.unique_value.trim().length === 0) {
    errors.push({
      component: 'value_prop',
      field: 'unique_value',
      message: 'Unique value is required',
      severity: 'error'
    });
  } else {
    if (component.unique_value.length < 10) {
      errors.push({
        component: 'value_prop',
        field: 'unique_value',
        message: 'Unique value must be at least 10 characters',
        severity: 'error'
      });
    } else if (component.unique_value.length > 200) {
      errors.push({
        component: 'value_prop',
        field: 'unique_value',
        message: 'Unique value must be 200 characters or less',
        severity: 'error'
      });
    } else if (component.unique_value.toLowerCase().includes('better') || 
               component.unique_value.toLowerCase().includes('improved')) {
      warnings.push({
        component: 'value_prop',
        field: 'unique_value',
        message: 'Unique value may be too generic - explain HOW it\'s better',
        severity: 'warning'
      });
    }
  }

  if (!component.differentiation || component.differentiation.trim().length === 0) {
    errors.push({
      component: 'value_prop',
      field: 'differentiation',
      message: 'Differentiation is required',
      severity: 'error'
    });
  } else if (component.differentiation.length > 200) {
    errors.push({
      component: 'value_prop',
      field: 'differentiation',
      message: 'Differentiation must be 200 characters or less',
      severity: 'error'
    });
  }

  if (!component.target_outcome || component.target_outcome.trim().length === 0) {
    errors.push({
      component: 'value_prop',
      field: 'target_outcome',
      message: 'Target outcome is required',
      severity: 'error'
    });
  } else if (component.target_outcome.length > 150) {
    errors.push({
      component: 'value_prop',
      field: 'target_outcome',
      message: 'Target outcome must be 150 characters or less',
      severity: 'error'
    });
  }

  if (!component.key_benefits || component.key_benefits.length === 0) {
    errors.push({
      component: 'value_prop',
      field: 'key_benefits',
      message: 'At least one key benefit is required',
      severity: 'error'
    });
  } else if (component.key_benefits.length > 5) {
    errors.push({
      component: 'value_prop',
      field: 'key_benefits',
      message: 'Maximum 5 key benefits allowed',
      severity: 'error'
    });
  }

  if (component.proof_points && component.proof_points.length > 5) {
    errors.push({
      component: 'value_prop',
      field: 'proof_points',
      message: 'Maximum 5 proof points allowed',
      severity: 'error'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateRevenue(component: RevenueComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const validModelTypes = ['subscription', 'one-time', 'marketplace', 'ads', 'freemium', 'tiered', 'usage-based'];
  if (!component.model_type || !validModelTypes.includes(component.model_type)) {
    errors.push({
      component: 'revenue',
      field: 'model_type',
      message: `Model type must be one of: ${validModelTypes.join(', ')}`,
      severity: 'error'
    });
  }

  if (component.price_point === undefined || component.price_point === null) {
    errors.push({
      component: 'revenue',
      field: 'price_point',
      message: 'Price point is required',
      severity: 'error'
    });
  } else if (component.price_point <= 0) {
    errors.push({
      component: 'revenue',
      field: 'price_point',
      message: 'Price point must be greater than 0',
      severity: 'error'
    });
  } else if (component.price_point > 1000000) {
    warnings.push({
      component: 'revenue',
      field: 'price_point',
      message: 'Price point seems unusually high',
      severity: 'warning'
    });
  }

  if (!component.currency || component.currency.length !== 3) {
    errors.push({
      component: 'revenue',
      field: 'currency',
      message: 'Valid 3-letter currency code is required (e.g., USD, EUR)',
      severity: 'error'
    });
  }

  const validPaymentFrequencies = ['one-time', 'monthly', 'annual', 'usage-based'];
  if (!component.payment_frequency || !validPaymentFrequencies.includes(component.payment_frequency)) {
    errors.push({
      component: 'revenue',
      field: 'payment_frequency',
      message: `Payment frequency must be one of: ${validPaymentFrequencies.join(', ')}`,
      severity: 'error'
    });
  }

  // Business logic validations
  if (component.model_type === 'subscription' && component.payment_frequency === 'one-time') {
    errors.push({
      component: 'revenue',
      message: 'Subscription model cannot have one-time payment frequency',
      severity: 'error'
    });
  }

  if (component.model_type === 'one-time' && component.payment_frequency !== 'one-time') {
    warnings.push({
      component: 'revenue',
      message: 'One-time model typically has one-time payment frequency',
      severity: 'warning'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateDistribution(component: DistributionComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!component.channels || component.channels.length === 0) {
    errors.push({
      component: 'distribution',
      field: 'channels',
      message: 'At least one distribution channel is required',
      severity: 'error'
    });
  }

  if (!component.primary_channel) {
    errors.push({
      component: 'distribution',
      field: 'primary_channel',
      message: 'Primary channel is required',
      severity: 'error'
    });
  } else if (component.channels && !component.channels.includes(component.primary_channel)) {
    errors.push({
      component: 'distribution',
      field: 'primary_channel',
      message: 'Primary channel must be one of the channels',
      severity: 'error'
    });
  }

  if (component.acquisition_cost_estimate !== undefined && component.acquisition_cost_estimate < 0) {
    errors.push({
      component: 'distribution',
      field: 'acquisition_cost_estimate',
      message: 'Acquisition cost estimate cannot be negative',
      severity: 'error'
    });
  }

  if (component.channel_strategy) {
    const strategyChannels = Object.keys(component.channel_strategy);
    const missingStrategies = component.channels?.filter(c => !strategyChannels.includes(c)) || [];
    
    if (missingStrategies.length > 0) {
      warnings.push({
        component: 'distribution',
        message: `Missing strategy for channels: ${missingStrategies.join(', ')}`,
        severity: 'warning'
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateCosts(component: CostsComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!component.cost_breakdown || component.cost_breakdown.trim().length === 0) {
    errors.push({
      component: 'costs',
      field: 'cost_breakdown',
      message: 'Cost breakdown description is required',
      severity: 'error'
    });
  } else if (component.cost_breakdown.length > 200) {
    errors.push({
      component: 'costs',
      field: 'cost_breakdown',
      message: 'Cost breakdown must be 200 characters or less',
      severity: 'error'
    });
  }

  // Validate fixed costs
  if (component.fixed_costs) {
    const invalidValues = Object.entries(component.fixed_costs)
      .filter(([_, value]) => typeof value !== 'number' || value < 0);
    
    if (invalidValues.length > 0) {
      errors.push({
        component: 'costs',
        field: 'fixed_costs',
        message: 'All fixed cost values must be non-negative numbers',
        severity: 'error'
      });
    }
  }

  // Validate variable costs
  if (component.variable_costs) {
    const invalidValues = Object.entries(component.variable_costs)
      .filter(([_, value]) => typeof value !== 'number' || value < 0);
    
    if (invalidValues.length > 0) {
      errors.push({
        component: 'costs',
        field: 'variable_costs',
        message: 'All variable cost values must be non-negative numbers',
        severity: 'error'
      });
    }
  }

  if (component.initial_investment !== undefined && component.initial_investment < 0) {
    errors.push({
      component: 'costs',
      field: 'initial_investment',
      message: 'Initial investment cannot be negative',
      severity: 'error'
    });
  }

  if (component.monthly_recurring !== undefined && component.monthly_recurring < 0) {
    errors.push({
      component: 'costs',
      field: 'monthly_recurring',
      message: 'Monthly recurring costs cannot be negative',
      severity: 'error'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateRisks(component: RisksComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!component.risks || component.risks.length === 0) {
    errors.push({
      component: 'risks',
      field: 'risks',
      message: 'At least one risk is required',
      severity: 'error'
    });
  } else {
    if (component.risks.length > 10) {
      errors.push({
        component: 'risks',
        field: 'risks',
        message: 'Maximum 10 risks allowed',
        severity: 'error'
      });
    }

    const validRiskTypes = ['market', 'execution', 'financial', 'competitive', 'regulatory', 'timing', 'team'];
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    const validProbabilities = ['high', 'medium', 'low'];

    component.risks.forEach((risk, index) => {
      if (!risk.risk_type || !validRiskTypes.includes(risk.risk_type)) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].risk_type`,
          message: `Risk type must be one of: ${validRiskTypes.join(', ')}`,
          severity: 'error'
        });
      }

      if (!risk.description || risk.description.trim().length === 0) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].description`,
          message: 'Risk description is required',
          severity: 'error'
        });
      } else if (risk.description.length > 150) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].description`,
          message: 'Risk description must be 150 characters or less',
          severity: 'error'
        });
      }

      if (!risk.severity || !validSeverities.includes(risk.severity)) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].severity`,
          message: `Severity must be one of: ${validSeverities.join(', ')}`,
          severity: 'error'
        });
      }

      if (!risk.probability || !validProbabilities.includes(risk.probability)) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].probability`,
          message: `Probability must be one of: ${validProbabilities.join(', ')}`,
          severity: 'error'
        });
      }

      if (risk.mitigation && risk.mitigation.length > 200) {
        errors.push({
          component: 'risks',
          field: `risks[${index}].mitigation`,
          message: 'Mitigation must be 200 characters or less',
          severity: 'error'
        });
      }
    });
  }

  const validOverallRiskLevels = ['critical', 'high', 'medium', 'low'];
  if (!component.overall_risk_level || !validOverallRiskLevels.includes(component.overall_risk_level)) {
    errors.push({
      component: 'risks',
      field: 'overall_risk_level',
      message: `Overall risk level must be one of: ${validOverallRiskLevels.join(', ')}`,
      severity: 'error'
    });
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateAssumptions(component: AssumptionsComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!component.assumptions || component.assumptions.length < 3) {
    errors.push({
      component: 'assumptions',
      field: 'assumptions',
      message: 'At least 3 assumptions are required',
      severity: 'error'
    });
  } else {
    if (component.assumptions.length > 15) {
      errors.push({
        component: 'assumptions',
        field: 'assumptions',
        message: 'Maximum 15 assumptions allowed',
        severity: 'error'
      });
    }

    const validAssumptionTypes = ['market', 'product', 'customer', 'financial', 'timing', 'competition'];
    const validConfidences = ['high', 'medium', 'low'];

    component.assumptions.forEach((assumption, index) => {
      if (!assumption.assumption_type || !validAssumptionTypes.includes(assumption.assumption_type)) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].assumption_type`,
          message: `Assumption type must be one of: ${validAssumptionTypes.join(', ')}`,
          severity: 'error'
        });
      }

      if (!assumption.statement || assumption.statement.trim().length === 0) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].statement`,
          message: 'Assumption statement is required',
          severity: 'error'
        });
      } else if (assumption.statement.length > 200) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].statement`,
          message: 'Assumption statement must be 200 characters or less',
          severity: 'error'
        });
      }

      if (!assumption.validation_method || assumption.validation_method.trim().length === 0) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].validation_method`,
          message: 'Validation method is required',
          severity: 'error'
        });
      } else if (assumption.validation_method.length > 150) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].validation_method`,
          message: 'Validation method must be 150 characters or less',
          severity: 'error'
        });
      }

      if (assumption.confidence === undefined || !validConfidences.includes(assumption.confidence)) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].confidence`,
          message: `Confidence must be one of: ${validConfidences.join(', ')}`,
          severity: 'error'
        });
      }

      if (assumption.critical === undefined) {
        errors.push({
          component: 'assumptions',
          field: `assumptions[${index}].critical`,
          message: 'Critical flag is required',
          severity: 'error'
        });
      }
    });

    const criticalAssumptions = component.assumptions.filter(a => a.critical);
    if (criticalAssumptions.length === 0) {
      warnings.push({
        component: 'assumptions',
        message: 'No critical assumptions identified - at least one should be marked as critical',
        severity: 'warning'
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// Main validation function that routes to appropriate validator
export function validateComponent(
  componentType: ComponentType,
  component: BizMapComponent
): ValidationResult {
  switch (componentType) {
    case 'problem':
      return validateProblem(component as ProblemComponent);
    case 'target_user':
      return validateTargetUser(component as TargetUserComponent);
    case 'value_prop':
      return validateValueProp(component as ValuePropComponent);
    case 'revenue':
      return validateRevenue(component as RevenueComponent);
    case 'distribution':
      return validateDistribution(component as DistributionComponent);
    case 'costs':
      return validateCosts(component as CostsComponent);
    case 'risks':
      return validateRisks(component as RisksComponent);
    case 'assumptions':
      return validateAssumptions(component as AssumptionsComponent);
    default:
      return {
        valid: false,
        errors: [{
          component: componentType,
          message: `Unknown component type: ${componentType}`,
          severity: 'error'
        }],
        warnings: []
      };
  }
}

