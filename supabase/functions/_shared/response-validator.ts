// Response validation and quality scoring utilities

export interface ResponseQuality {
  score: number; // 0-1
  completeness: number;
  relevance: number;
  actionability: number;
  structure: number;
  issues: string[];
}

export interface StructuredResponse {
  problem?: string;
  insight?: string;
  recommendation?: string;
  nextActions?: string[];
  raw: string;
}

// Extract structured sections from response
export function extractStructuredResponse(response: string): StructuredResponse {
  const structured: StructuredResponse = { raw: response };
  
  // Try to extract Problem section
  const problemMatch = response.match(/\*\*Problem:\*\*[:\s]*(.+?)(?=\*\*|$)/is);
  if (problemMatch) {
    structured.problem = problemMatch[1].trim();
  }
  
  // Try to extract Insight section
  const insightMatch = response.match(/\*\*Insight:\*\*[:\s]*(.+?)(?=\*\*|$)/is);
  if (insightMatch) {
    structured.insight = insightMatch[1].trim();
  }
  
  // Try to extract Recommendation section
  const recommendationMatch = response.match(/\*\*Recommendation:\*\*[:\s]*(.+?)(?=\*\*|$)/is);
  if (recommendationMatch) {
    structured.recommendation = recommendationMatch[1].trim();
  }
  
  // Try to extract Next Actions section
  const nextActionsMatch = response.match(/\*\*Next Actions?:\*\*[:\s]*(.+?)(?=\*\*|$)/is);
  if (nextActionsMatch) {
    const actionsText = nextActionsMatch[1].trim();
    // Extract list items
    structured.nextActions = actionsText
      .split(/\n/)
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  
  return structured;
}

// Validate response structure
export function validateResponseStructure(response: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const structured = extractStructuredResponse(response);
  
  if (!structured.problem) {
    issues.push('Missing Problem section');
  }
  
  if (!structured.insight) {
    issues.push('Missing Insight section');
  }
  
  if (!structured.recommendation) {
    issues.push('Missing Recommendation section');
  }
  
  if (!structured.nextActions || structured.nextActions.length === 0) {
    issues.push('Missing Next Actions section');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

// Score response quality
export function scoreResponseQuality(
  response: string,
  query: string,
  businessContext?: any
): ResponseQuality {
  const structured = extractStructuredResponse(response);
  const validation = validateResponseStructure(response);
  
  // Completeness score (0-1)
  const completeness = 
    (structured.problem ? 0.25 : 0) +
    (structured.insight ? 0.25 : 0) +
    (structured.recommendation ? 0.25 : 0) +
    (structured.nextActions && structured.nextActions.length > 0 ? 0.25 : 0);
  
  // Relevance score (0-1) - check if response addresses the query
  const queryLower = query.toLowerCase();
  const responseLower = response.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
  const matchingWords = queryWords.filter(word => responseLower.includes(word));
  const relevance = queryWords.length > 0 ? matchingWords.length / queryWords.length : 0.5;
  
  // Actionability score (0-1) - check for concrete next steps
  const hasConcreteActions = structured.nextActions && structured.nextActions.length > 0;
  const hasTimeframes = /\b(today|tomorrow|this week|next week|within|by)\b/i.test(response);
  const hasSpecificNumbers = /\b(\d+|one|two|three|first|second|third)\b/i.test(response);
  const actionability = hasConcreteActions ? 0.5 + (hasTimeframes ? 0.25 : 0) + (hasSpecificNumbers ? 0.25 : 0) : 0.3;
  
  // Structure score (0-1)
  const structure = validation.valid ? 1.0 : Math.max(0, 1.0 - validation.issues.length * 0.25);
  
  // Overall score (weighted average)
  const score = (
    completeness * 0.3 +
    relevance * 0.3 +
    actionability * 0.25 +
    structure * 0.15
  );
  
  return {
    score,
    completeness,
    relevance,
    actionability,
    structure,
    issues: validation.issues,
  };
}

// Post-process response to ensure structure
export function postProcessResponse(response: string): string {
  const structured = extractStructuredResponse(response);
  
  // If response already has structure, return as-is
  if (structured.problem && structured.insight && structured.recommendation && structured.nextActions) {
    return response;
  }
  
  // Otherwise, try to format it properly
  let formatted = response;
  
  // Ensure sections are properly formatted
  if (!structured.problem && response.length > 0) {
    // Try to infer problem from context
    const firstParagraph = response.split('\n\n')[0];
    if (firstParagraph && !firstParagraph.includes('**Problem:**')) {
      formatted = `**Problem:** ${firstParagraph}\n\n${formatted}`;
    }
  }
  
  return formatted;
}

