/**
 * Generates a comprehensive GTM (Go-To-Market) Strategy Document
 * based on user's answers to the 9-step framework
 */

export interface GTMAnswers {
  customer_segmentation?: string;
  buyer_personas?: string;
  positioning?: string;
  pricing_strategy?: string;
  distribution_channels?: string;
  marketing_tactics?: string;
  sales_process?: string;
  launch_plan?: string;
  kpis_metrics?: string;
}

export const generateGTMStrategyDocument = (answers: GTMAnswers): string => {
  const date = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `# 🚀 Go-To-Market Strategy Document

Generated on: ${date}

---

## Executive Summary

This document outlines your comprehensive Go-To-Market (GTM) strategy, covering customer segmentation, positioning, pricing, distribution, marketing, sales, launch planning, and success metrics. Use this as your roadmap to successfully enter and grow in your target market.

---

## 1. Customer Segmentation

${answers.customer_segmentation || 'Not provided'}

**Key Segments Identified:**
- ${extractSegments(answers.customer_segmentation || '')}

**Next Steps:**
- Validate segments through customer interviews
- Prioritize segments by size, accessibility, and willingness to pay
- Develop segment-specific messaging

---

## 2. Buyer Personas

${answers.buyer_personas || 'Not provided'}

**Persona Summary:**
${formatPersona(answers.buyer_personas || '')}

**Key Insights:**
- Demographics: ${extractDemographics(answers.buyer_personas || '')}
- Pain Points: ${extractPainPoints(answers.buyer_personas || '')}
- Goals: ${extractGoals(answers.buyer_personas || '')}

---

## 3. Market Positioning

${answers.positioning || 'Not provided'}

**Positioning Statement:**
${createPositioningStatement(answers.positioning || '')}

**Competitive Differentiation:**
${extractDifferentiators(answers.positioning || '')}

**Value Proposition:**
${createValueProposition(answers.positioning || '')}

---

## 4. Pricing Strategy

${answers.pricing_strategy || 'Not provided'}

**Pricing Model:**
${extractPricingModel(answers.pricing_strategy || '')}

**Price Point Rationale:**
${extractPricingRationale(answers.pricing_strategy || '')}

**Pricing Considerations:**
- Market positioning alignment
- Customer willingness to pay
- Competitive landscape
- Cost structure and margins

---

## 5. Distribution Channels

${answers.distribution_channels || 'Not provided'}

**Primary Channels:**
${extractChannels(answers.distribution_channels || '')}

**Channel Strategy:**
- Direct channels: ${identifyDirectChannels(answers.distribution_channels || '')}
- Indirect channels: ${identifyIndirectChannels(answers.distribution_channels || '')}
- Channel prioritization: Focus on highest-converting channels first

---

## 6. Marketing Tactics

${answers.marketing_tactics || 'Not provided'}

**Marketing Mix:**
${extractTactics(answers.marketing_tactics || '')}

**Tactical Plan:**
${createTacticalPlan(answers.marketing_tactics || '')}

**Content Strategy:**
- Educational content for awareness
- Case studies for consideration
- Product demos for conversion

---

## 7. Sales Process

${answers.sales_process || 'Not provided'}

**Sales Funnel:**
${createSalesFunnel(answers.sales_process || '')}

**Conversion Stages:**
${extractConversionStages(answers.sales_process || '')}

**Sales Enablement:**
- Sales materials and collateral
- Training and onboarding
- CRM and tracking systems

---

## 8. Launch Plan

${answers.launch_plan || 'Not provided'}

**Launch Timeline:**
${extractTimeline(answers.launch_plan || '')}

**Launch Phases:**
${createLaunchPhases(answers.launch_plan || '')}

**Pre-Launch Checklist:**
- [ ] Product/service ready
- [ ] Marketing materials prepared
- [ ] Sales team trained
- [ ] Customer support ready
- [ ] Analytics and tracking set up

---

## 9. KPIs & Success Metrics

${answers.kpis_metrics || 'Not provided'}

**Key Performance Indicators:**
${extractKPIs(answers.kpis_metrics || '')}

**Success Metrics Dashboard:**
- **Acquisition Metrics:**
  - Customer Acquisition Cost (CAC)
  - Conversion rates by channel
  - Lead generation volume

- **Engagement Metrics:**
  - Active users/customers
  - Usage frequency
  - Feature adoption

- **Revenue Metrics:**
  - Monthly Recurring Revenue (MRR)
  - Customer Lifetime Value (LTV)
  - LTV:CAC ratio

- **Retention Metrics:**
  - Churn rate
  - Retention rate
  - Net Promoter Score (NPS)

**Target Benchmarks:**
${createTargetBenchmarks(answers.kpis_metrics || '')}

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Finalize customer segments and personas
- Complete positioning and messaging
- Set pricing strategy
- Prepare marketing materials

### Phase 2: Pre-Launch (Weeks 3-4)
- Set up distribution channels
- Launch marketing campaigns
- Train sales team
- Build initial pipeline

### Phase 3: Launch (Weeks 5-6)
- Execute launch plan
- Monitor metrics closely
- Gather customer feedback
- Iterate and optimize

### Phase 4: Growth (Weeks 7+)
- Scale successful channels
- Optimize conversion funnels
- Expand to new segments
- Build partnerships

---

## Risk Assessment

**Potential Risks:**
- Market timing and readiness
- Competitive response
- Channel effectiveness
- Pricing sensitivity
- Resource constraints

**Mitigation Strategies:**
- Continuous market validation
- Competitive monitoring
- Channel diversification
- Pricing flexibility
- Resource planning and allocation

---

## Next Steps

1. **Validate Assumptions**: Test key assumptions with real customers
2. **Build MVP**: Create minimum viable version of your GTM strategy
3. **Measure & Iterate**: Track metrics and adjust strategy based on data
4. **Scale Success**: Double down on what works, eliminate what doesn't

---

## Appendix

### Customer Interview Questions
- What problem are you trying to solve?
- How do you currently solve this problem?
- What would make you switch to a new solution?
- What's your budget for this type of solution?

### Competitive Analysis Framework
- Direct competitors
- Indirect competitors
- Competitive advantages
- Market gaps and opportunities

---

**Remember**: This GTM strategy is a living document. Review and update it monthly based on market feedback, performance data, and changing conditions.

**Good luck with your launch! 🚀**
`;
};

// Helper functions to extract and format information

function extractSegments(text: string): string {
  const segments = text.match(/(?:segments?|groups?|types?|categories?)[:]\s*([^\.]+)/i);
  return segments ? segments[1].trim() : 'To be defined';
}

function formatPersona(text: string): string {
  if (!text) return 'To be developed';
  // Extract key persona details
  const demographics = text.match(/(?:age|demographics?)[:]\s*([^\.]+)/i);
  const painPoints = text.match(/(?:pain points?|problems?|challenges?)[:]\s*([^\.]+)/i);
  
  let formatted = '';
  if (demographics) formatted += `- Demographics: ${demographics[1].trim()}\n`;
  if (painPoints) formatted += `- Pain Points: ${painPoints[1].trim()}\n`;
  
  return formatted || text.substring(0, 200) + '...';
}

function extractDemographics(text: string): string {
  const match = text.match(/(?:age|demographics?|age range)[:]\s*([^\.]+)/i);
  return match ? match[1].trim() : 'To be specified';
}

function extractPainPoints(text: string): string {
  const match = text.match(/(?:pain points?|problems?|challenges?|frustrations?)[:]\s*([^\.]+)/i);
  return match ? match[1].trim() : 'To be identified';
}

function extractGoals(text: string): string {
  const match = text.match(/(?:goals?|objectives?|aspirations?)[:]\s*([^\.]+)/i);
  return match ? match[1].trim() : 'To be defined';
}

function createPositioningStatement(text: string): string {
  if (!text) return 'To be developed';
  return text.substring(0, 150) + (text.length > 150 ? '...' : '');
}

function extractDifferentiators(text: string): string {
  const match = text.match(/(?:different|unique|distinct|advantage)[^\.]*[:]\s*([^\.]+)/i);
  return match ? match[1].trim() : 'To be identified';
}

function createValueProposition(text: string): string {
  if (!text) return 'To be developed';
  return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

function extractPricingModel(text: string): string {
  const models = ['subscription', 'one-time', 'freemium', 'usage-based', 'tiered', 'commission'];
  const found = models.find(model => text.toLowerCase().includes(model));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : 'To be determined';
}

function extractPricingRationale(text: string): string {
  if (!text) return 'To be developed';
  return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

function extractChannels(text: string): string {
  const channels = text.split(/[,\n]/).filter(c => c.trim()).slice(0, 5);
  return channels.length > 0 
    ? channels.map(c => `- ${c.trim()}`).join('\n')
    : 'To be defined';
}

function identifyDirectChannels(text: string): string {
  const direct = ['website', 'direct', 'own', 'in-house'];
  const found = direct.some(d => text.toLowerCase().includes(d));
  return found ? 'Yes' : 'To be evaluated';
}

function identifyIndirectChannels(text: string): string {
  const indirect = ['partner', 'reseller', 'affiliate', 'marketplace', 'distributor'];
  const found = indirect.some(i => text.toLowerCase().includes(i));
  return found ? 'Yes' : 'To be evaluated';
}

function extractTactics(text: string): string {
  const tactics = text.split(/[,\n]/).filter(t => t.trim()).slice(0, 5);
  return tactics.length > 0
    ? tactics.map(t => `- ${t.trim()}`).join('\n')
    : 'To be defined';
}

function createTacticalPlan(text: string): string {
  if (!text) return 'To be developed';
  return text.substring(0, 300) + (text.length > 300 ? '...' : '');
}

function createSalesFunnel(text: string): string {
  if (!text) return 'To be designed';
  const stages = ['awareness', 'interest', 'consideration', 'purchase', 'retention'];
  return stages.map((stage, i) => `${i + 1}. ${stage.charAt(0).toUpperCase() + stage.slice(1)}`).join('\n');
}

function extractConversionStages(text: string): string {
  if (!text) return 'To be defined';
  return text.substring(0, 200) + (text.length > 200 ? '...' : '');
}

function extractTimeline(text: string): string {
  const timeline = text.match(/(?:timeline|schedule|launch|when|by)[:]\s*([^\.]+)/i);
  return timeline ? timeline[1].trim() : 'To be determined';
}

function createLaunchPhases(text: string): string {
  if (!text) return 'To be planned';
  return text.substring(0, 300) + (text.length > 300 ? '...' : '');
}

function extractKPIs(text: string): string {
  const kpis = text.split(/[,\n]/).filter(k => k.trim()).slice(0, 10);
  return kpis.length > 0
    ? kpis.map(k => `- ${k.trim()}`).join('\n')
    : 'To be defined';
}

function createTargetBenchmarks(text: string): string {
  if (!text) return 'To be established';
  // Extract numbers that might be targets
  const numbers = text.match(/\d+%|\$\d+|\d+\s*(?:users|customers|leads|conversions)/gi);
  return numbers ? numbers.slice(0, 5).join(', ') : 'To be determined';
}

