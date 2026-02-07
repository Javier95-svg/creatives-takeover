# Credit Allocation Strategy for New Features

## Overview

This document explains how credit allocation is handled across all 5 main sections (Dashboard, BizMap AI, Insighta, Community, Resources) with the newly added features.

## Credit Allocation System

### How Credits Work

1. **Monthly Quota System**: Each tier receives a monthly credit allocation:
   - **Rookie (Free)**: 25 credits/month
   - **Rising (Creator)**: 50 credits/month
   - **Pro (Professional)**: 150 credits/month

2. **Deduction Priority**: Credits are deducted in this order:
   - First from monthly quota
   - Then from purchased balance (if any)

3. **Monthly Reset**: Credits reset automatically at the start of each billing cycle

## Feature Access Matrix

### Dashboard Section

| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| Focus Funnel | Read-only | Full | Full | FREE |
| Decision Sprint | ❌ | Full | Full | 2 credits |
| Core Metrics | Read-only | Full | Full | FREE |
| Weekly Mission | Read-only | Full | Full | FREE |
| Your Tasks | ❌ | Full | Full | FREE |
| Roadmap Generation | ❌ | Full | Full | 5 credits |
| Market Research | ❌ | Full | Full | 5 credits |
| Financial Analysis | ❌ | Full | Full | 8 credits |
| Business Insights | ❌ | Full | Full | 5 credits |

**Key Points:**
- Free tier gets read-only access to Focus Funnel, Core Metrics, and Weekly Mission
- Decision Sprint and Your Tasks require Rising+ tier
- All credit-based features require Rising+ tier

### BizMap AI Section

#### Learn Phase
| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| ICP Builder | Read-only | Full | Full | 8 credits |
| PMF Lab | Read-only | Full | Full | 8 credits |

#### Build Phase
| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| Business Planner (AI Chat) | 25 msgs | 50 msgs | 150 msgs | 1 credit/msg |
| MVP Builder | ❌ | Full | Full | 5 credits |
| Tech Stack Builder | 1/month | Unlimited | Unlimited | 3 credits |

#### Measure Phase
| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| GTM Strategist | ❌ | ❌ | Full | 5 credits |

**Key Points:**
- ICP Builder and PMF Lab are read-only for Rookie tier
- MVP Builder requires Rising+ tier
- GTM Strategist is Pro-only
- Business Planner (AI Chat) is available to all tiers with message limits

### Insighta Section

| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| VC Search | 5 views/month | 25 views/month | Unlimited | FREE |
| Accelerator Hunt | ❌ | ❌ | Full | FREE |
| Pitch Deck Analyzer | ❌ | Full | Full | 8 credits |
| Email Templates | ❌ | Full | Full | 3 credits |
| Insights Test | 1/month | Unlimited | Unlimited | 8 credits |
| Investor Matching | ❌ | ❌ | Full | 5 credits |

**Key Points:**
- VC Search uses view limits, not credits (FREE feature)
- Accelerator Hunt is Pro-only (FREE, no credits)
- Pitch Deck Analyzer and Email Templates require Rising+ tier
- Insights Test available to all tiers with usage limits

### Community Section

| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| Find a Mentor | ❌ | Full | Full | FREE |
| Find a Co-Founder | ❌ | Full | Full | FREE |
| Find your Angel | ❌ | ❌ | Full | FREE |

**Key Points:**
- All Community features are FREE (no credits)
- Find a Mentor and Find a Co-Founder require Rising+ tier
- Find your Angel is Pro-only

### Resources Section

| Feature | Rookie | Rising | Pro | Credit Cost |
|---------|--------|--------|-----|-------------|
| Stories | Read-only | Full | Full | FREE |
| Prompt Library | View only | Full | Full + Custom | 2 credits (generation) |

**Key Points:**
- Stories is FREE for all tiers (read-only for Rookie)
- Prompt Library browsing is FREE
- Prompt generation costs 2 credits (Rising+ only)

## Credit Usage Examples

### Rookie Tier (25 credits/month)
**Typical Usage:**
- 25 AI chat messages (25 credits) OR
- 1 Market Research (5) + 1 Launch Report (5) + 15 chat messages (15) = 25 credits

**Available Features:**
- Dashboard: Read-only access to Focus Funnel, Core Metrics, Weekly Mission
- BizMap AI: 25 messages, PMF Lab (read-only), Tech Stack Builder (1/month)
- Insighta: VC Search (5 views), Insights Test (1/month)
- Resources: Stories (read-only), Prompt Library (view only)

### Rising Tier (50 credits/month)
**Typical Usage:**
- 30 AI chat messages (30) + 1 ICP Builder (8) + 1 PMF analysis (8) + 2 tech stacks (6) + 1 pitch deck analyzer (8) + 2 email templates (6) = 66 credits (would need to purchase 16 extra)

**Better Usage:**
- 30 AI chat messages (30) + 1 ICP Builder (8) + 1 PMF analysis (8) + 1 tech stack (3) + 1 email template (3) = 52 credits (slightly over, but close)

**Available Features:**
- Dashboard: Full access to all features
- BizMap AI: Learn (ICP Builder, PMF Lab), Build (MVP Builder, Business Planner, Tech Stack Builder)
- Insighta: VC Search (25 views), Email Templates, Pitch Deck Analyzer, Insights Test
- Community: Find a Mentor, Find a Co-Founder
- Resources: Stories & Prompt Library (full access)

### Pro Tier (150 credits/month)
**Typical Usage:**
- 100 AI messages (100) + 1 GTM Strategist (5) + 3 PMF analyses (24) + 5 pitch deck analyses (40) + 5 email templates (15) + 1 market research (5) + 1 MVP Builder (5) = 194 credits (would need to purchase 44 extra)

**Better Usage:**
- 80 AI messages (80) + 1 GTM Strategist (5) + 2 PMF analyses (16) + 3 pitch deck analyses (24) + 3 email templates (9) + 1 MVP Builder (5) + 1 market research (5) = 144 credits

**Available Features:**
- Dashboard: Full access to all features
- BizMap AI: Learn, Build, and Measure (GTM Strategist)
- Insighta: Unlimited VC Search, Accelerator Hunt, Email Templates, Advanced Pitch Deck Analyzer, Insights Test
- Community: Find a Mentor, Find a Co-Founder, Find your Angel
- Resources: Stories & Prompt Library (full + custom templates)

## Implementation Details

### Feature Gating Logic

All features are gated through `useFeatureGating()` hook which checks:
1. User authentication
2. Subscription tier
3. Credit availability (for credit-based features)
4. Usage limits (for limited features)

### Credit Deduction Flow

1. User attempts to use a feature
2. System checks tier access via `checkFeatureAccess()`
3. If credit-based, system checks credit availability via `hasCredits()`
4. If sufficient credits, system deducts via `deductCredits()`
5. Transaction is logged in `credit_transactions` table
6. User balance is updated atomically

### Free Features Behavior

- FREE features remain accessible even when credits are exhausted
- Read-only access means viewing without generation/modification
- View limits (like VC Search) reset monthly based on tier

## Migration Notes

- Existing users maintain their current credit balances
- Monthly quota resets happen automatically
- New features are immediately available based on tier
- Credit costs are defined in `src/config/constants.ts` (CREDIT_COSTS)
- Feature access is controlled in `src/hooks/useFeatureGating.ts`
