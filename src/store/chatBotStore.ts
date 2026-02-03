import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getSafeLocalStorage } from '@/lib/safeStorage';

interface StepResponse {
  step: number;
  responses: Record<string, any>;
  completedAt: string;
}

interface ChatBotStore {
  stepsProgress: StepResponse[];
  finalReport: string;
  addStepResponse: (step: number, responses: Record<string, any>) => void;
  generateReport: () => string;
  resetProgress: () => void;
}

export const useChatBotStore = create<ChatBotStore>()(
  persist(
    (set, get) => ({
      stepsProgress: [],
      finalReport: '',

      addStepResponse: (step: number, responses: Record<string, any>) => {
        set((state) => {
          const existingIndex = state.stepsProgress.findIndex(s => s.step === step);
          const newResponse: StepResponse = {
            step,
            responses,
            completedAt: new Date().toISOString()
          };

          if (existingIndex >= 0) {
            const updated = [...state.stepsProgress];
            updated[existingIndex] = newResponse;
            return { stepsProgress: updated };
          }

          return {
            stepsProgress: [...state.stepsProgress, newResponse].sort((a, b) => a.step - b.step)
          };
        });
      },

      generateReport: () => {
        const { stepsProgress } = get();
        
        if (stepsProgress.length === 0) {
          return 'No data collected yet. Please complete the BizMap chatbot steps.';
        }

        // Extract data from each step
        const step1 = stepsProgress.find(s => s.step === 1)?.responses || {};
        const step2 = stepsProgress.find(s => s.step === 2)?.responses || {};
        const step3 = stepsProgress.find(s => s.step === 3)?.responses || {};
        const step4 = stepsProgress.find(s => s.step === 4)?.responses || {};
        const step5 = stepsProgress.find(s => s.step === 5)?.responses || {};
        const step6 = stepsProgress.find(s => s.step === 6)?.responses || {};
        const step7 = stepsProgress.find(s => s.step === 7)?.responses || {};

        // Generate comprehensive business report
        const report = `
# 🚀 Business Launch Report

## Executive Summary
Generated on: ${new Date().toLocaleDateString()}

---

## 1. Business Concept & Problem Statement
${step1.businessIdea || step1.problem || 'Not provided'}

**Pain Point Addressed:**
${step1.painPoint || step1.problemDescription || 'Not specified'}

**Innovation Angle:**
${step1.uniqueValue || step1.innovation || 'To be determined'}

---

## 2. Target Market Analysis
**Primary Audience:**
${step2.targetAudience || step2.market || 'Not defined'}

**Market Size:**
${step2.marketSize || 'To be researched'}

**Demographics:**
- Age Range: ${step2.ageRange || 'Not specified'}
- Location: ${step2.location || 'Global/Not specified'}
- Income Level: ${step2.incomeLevel || 'Not specified'}

**Psychographics:**
${step2.psychographics || step2.interests || 'To be determined'}

---

## 3. Solution & Product/Service Details
**Core Offering:**
${step3.solution || step3.product || 'Not defined'}

**Key Features:**
${step3.features ? (Array.isArray(step3.features) ? step3.features.join(', ') : step3.features) : 'Not specified'}

**Competitive Advantages:**
${step3.advantages || step3.differentiators || 'To be identified'}

**MVP Scope:**
${step3.mvpScope || step3.minimumViableProduct || 'To be defined'}

---

## 4. Marketing & Distribution Strategy
**Primary Channels:**
${step4.channels ? (Array.isArray(step4.channels) ? step4.channels.join(', ') : step4.channels) : 'Not specified'}

**Marketing Tactics:**
${step4.tactics || step4.marketingPlan || 'To be developed'}

**Content Strategy:**
${step4.contentStrategy || 'To be planned'}

**Customer Acquisition Plan:**
${step4.acquisitionPlan || step4.customerAcquisition || 'To be outlined'}

---

## 5. Pricing & Revenue Model
**Pricing Strategy:**
${step5.pricingModel || step5.pricing || 'Not set'}

**Price Point:**
${step5.pricePoint || step5.amount || 'To be determined'}

**Revenue Streams:**
${step5.revenueStreams ? (Array.isArray(step5.revenueStreams) ? step5.revenueStreams.join(', ') : step5.revenueStreams) : 'Primary product/service sales'}

**Monetization Approach:**
${step5.monetization || 'Standard sales model'}

---

## 6. Goals & Success Metrics
**Short-term Goals (0-6 months):**
${step6.shortTermGoals || step6.goals || 'To be set'}

**Long-term Vision (6-24 months):**
${step6.longTermGoals || step6.vision || 'To be defined'}

**Key Performance Indicators:**
${step6.kpis ? (Array.isArray(step6.kpis) ? step6.kpis.map((kpi: string) => `- ${kpi}`).join('\n') : step6.kpis) : '- Revenue targets\n- Customer acquisition\n- User engagement'}

**Success Milestones:**
${step6.milestones || 'To be determined'}

---

## 7. Additional Context & Resources
**Team & Expertise:**
${step7.team || step7.expertise || 'Solo founder/To be built'}

**Budget & Resources:**
${step7.budget || step7.resources || 'To be allocated'}

**Timeline:**
${step7.timeline || step7.launchDate || 'To be planned'}

**Risks & Challenges:**
${step7.risks || step7.challenges || 'To be identified'}

**Support Needed:**
${step7.supportNeeded || step7.help || 'General guidance'}

---

## 📋 Next Steps & Recommended Workflow

### Phase 1: Validation (Week 1-2)
1. Conduct 10-15 customer interviews to validate ${step2.targetAudience || 'target market'} needs
2. Create landing page to test demand for ${step3.solution || 'your solution'}
3. Set up analytics to track interest and engagement

### Phase 2: MVP Development (Week 3-6)
1. Build core features: ${step3.features ? (Array.isArray(step3.features) ? step3.features.slice(0, 3).join(', ') : step3.features) : 'essential functionality'}
2. Set up ${step5.pricingModel || 'payment'} infrastructure
3. Prepare marketing materials for ${step4.channels || 'primary channels'}

### Phase 3: Launch & Iterate (Week 7-12)
1. Soft launch to ${step2.targetAudience || 'early adopters'}
2. Implement feedback loop using ${step6.kpis || 'key metrics'}
3. Scale through ${step4.channels || 'chosen marketing channels'}

### Phase 4: Growth & Scale (Month 4+)
1. Optimize ${step5.revenueStreams || 'revenue model'} based on data
2. Expand team/resources as outlined in ${step7.team || 'team plan'}
3. Achieve milestones: ${step6.milestones || 'defined goals'}

---

## 🎯 Critical Success Factors
1. **Market Fit**: Ensure ${step3.solution || 'solution'} solves real pain for ${step2.targetAudience || 'target customers'}
2. **Execution Speed**: Launch MVP within ${step7.timeline || '6-8 weeks'} to gather real feedback
3. **Customer Focus**: Build feedback loops into ${step4.channels || 'all channels'}
4. **Financial Discipline**: Stay within ${step7.budget || 'allocated budget'} while testing assumptions
5. **Iterative Improvement**: Use ${step6.kpis || 'KPIs'} to guide weekly decisions

---

**Report Status:** ${stepsProgress.length}/7 steps completed
**Completion Date:** ${stepsProgress[stepsProgress.length - 1]?.completedAt ? new Date(stepsProgress[stepsProgress.length - 1].completedAt).toLocaleDateString() : 'In progress'}

*This report is a living document. Update it as you validate assumptions and gather real-world data.*
        `.trim();

        set({ finalReport: report });
        return report;
      },

      resetProgress: () => {
        set({ stepsProgress: [], finalReport: '' });
      }
    }),
    {
      name: 'bizmap-chatbot-storage',
      storage: createJSONStorage(getSafeLocalStorage),
      partialize: (state) => ({ 
        stepsProgress: state.stepsProgress,
        finalReport: state.finalReport 
      })
    }
  )
);
