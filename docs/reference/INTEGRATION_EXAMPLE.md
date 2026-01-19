# Phase 1 Integration Example

This guide shows how to integrate Phase 1 enhanced context into your existing BizMap AI chatbot.

## Quick Start Integration

### 1. Enhanced Chatbot Component

Here's how to enhance your existing chatbot component with Phase 1 features:

```typescript
// src/components/EnhancedBizMapChat.tsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { useAggregatedContext, useContextForAI } from '@/hooks/useEnhancedContext';
import { useProgressInsights } from '@/hooks/useProgressTracker';
import { useFounderProfile } from '@/hooks/useFounderProfile';

export function EnhancedBizMapChat() {
  const user = useUser();
  const [messages, setMessages] = useState([]);

  // Get enhanced context
  const { context, isLoading: contextLoading } = useAggregatedContext();
  const { formattedContext } = useContextForAI();
  const insights = useProgressInsights(user?.id);
  const { profile, hasProfile } = useFounderProfile();

  // Build enhanced system prompt
  const systemPrompt = `
You are an AI Co-Founder helping this founder build their business.

## CONTEXT (Use this to provide personalized guidance)

${formattedContext}

## YOUR ROLE

- Be proactive: Suggest next steps before being asked
- Be contextual: Reference their progress, blockers, and profile
- Be adaptive: Match their communication preferences and decision-making style
- Be supportive: Acknowledge progress and help overcome blockers

## RESPONSE FORMAT

For each response, include:
1. **Acknowledgment**: Recognize current situation/question
2. **Insight**: Why this matters based on their context
3. **Guidance**: Specific, actionable advice
4. **Next Steps**: Clear actions to take

${
  insights.criticalBlockers.length > 0
    ? `\n⚠️ CRITICAL: There are ${insights.criticalBlockers.length} critical blockers that need immediate attention.`
    : ''
}

${
  !insights.isOnTrack
    ? '\n⚠️ ALERT: The founder is behind schedule. Help them prioritize and adjust.'
    : ''
}
  `.trim();

  const handleSendMessage = async (message: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    // Call your existing chatbot API with enhanced system prompt
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        systemPrompt,
        context: context,
        userId: user?.id,
      }),
    });

    const data = await response.json();

    // Add assistant message
    setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Proactive Suggestions Banner */}
      {insights.recommendations.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <h3 className="font-semibold text-sm mb-2">💡 Recommendations</h3>
          <ul className="text-sm space-y-1">
            {insights.recommendations.slice(0, 3).map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profile Completeness Alert */}
      {hasProfile && profile && profile.profile_completeness < 50 && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <p className="text-sm">
            📝 Your profile is {profile.profile_completeness}% complete.
            <button className="ml-2 underline text-blue-600">
              Complete now for better guidance
            </button>
          </p>
        </div>
      )}

      {/* Progress Summary */}
      {context && (
        <div className="bg-gray-50 border-b p-3 text-sm">
          <div className="flex gap-4">
            <span>
              📅 Day {context.progressMetrics.currentDay}/30
            </span>
            <span>
              ✅ {context.progressMetrics.completedMilestones.length} milestones
            </span>
            <span>
              🚧 {context.progressMetrics.activeBlockers} blockers
            </span>
            <span className={insights.isOnTrack ? 'text-green-600' : 'text-red-600'}>
              {insights.isOnTrack ? '✓ On Track' : '⚠ Behind Schedule'}
            </span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}
```

### 2. Update Chatbot Backend (Edge Function)

Update your `chatbot-streaming` function to use enhanced context:

```typescript
// supabase/functions/chatbot-streaming/index.ts

import { BusinessContextService } from './businessContextService.ts'; // Copy service to edge function

serve(async (req) => {
  const { message, userId, sessionId } = await req.json();

  // Get aggregated context
  const contextResult = await BusinessContextService.getAggregatedContext(userId);

  if (!contextResult.success) {
    return new Response(
      JSON.stringify({ error: 'Failed to load context' }),
      { status: 500 }
    );
  }

  const context = contextResult.data;

  // Format context for AI
  const formattedContext = BusinessContextService.formatContextForAI(context);

  // Enhanced system prompt
  const systemPrompt = `
You are an AI Co-Founder. Use this context to provide personalized guidance:

${formattedContext}

Be proactive, contextual, and adaptive. Reference their progress and help overcome blockers.
  `;

  // Call AI with enhanced prompt
  const aiResponse = await callAI(message, systemPrompt, context);

  // Auto-detect and create blockers from conversation
  if (aiResponse.contains('blocker') || aiResponse.contains('stuck')) {
    await autoCreateBlocker(userId, message, aiResponse);
  }

  // Auto-update progress metrics
  await updateProgressMetrics(userId, context);

  return new Response(aiResponse);
});
```

### 3. Add Founder Profile Onboarding

Create a profile onboarding flow:

```typescript
// src/components/FounderProfileOnboarding.tsx
import React from 'react';
import { useFounderProfile, useProfileCompleteness } from '@/hooks/useFounderProfile';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export function FounderProfileOnboarding({ onComplete }) {
  const { createProfile, updateProfile, profile } = useFounderProfile();
  const { completeness, missingFields } = useProfileCompleteness();

  const [formData, setFormData] = useState({
    risk_tolerance: profile?.risk_tolerance || 'moderate',
    decision_making_style: profile?.decision_making_style || 'data-driven',
    entrepreneurial_experience: profile?.entrepreneurial_experience || 'first-time',
    skill_gaps: profile?.skill_gaps || [],
    primary_goals: profile?.primary_goals || [],
  });

  const handleSubmit = async () => {
    if (profile) {
      await updateProfile(formData);
    } else {
      await createProfile(formData);
    }
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">
        Let's set up your founder profile
      </h2>
      <p className="text-gray-600 mb-6">
        This helps me provide personalized guidance. You're {completeness}% complete.
      </p>

      <div className="space-y-6">
        {/* Entrepreneurial Experience */}
        <div>
          <label className="block font-medium mb-2">
            Entrepreneurial Experience
          </label>
          <Select
            value={formData.entrepreneurial_experience}
            onChange={(value) =>
              setFormData({ ...formData, entrepreneurial_experience: value })
            }
          >
            <option value="first-time">First-time entrepreneur</option>
            <option value="experienced">Experienced (launched before)</option>
            <option value="serial-entrepreneur">Serial entrepreneur</option>
          </Select>
        </div>

        {/* Risk Tolerance */}
        <div>
          <label className="block font-medium mb-2">Risk Tolerance</label>
          <Select
            value={formData.risk_tolerance}
            onChange={(value) =>
              setFormData({ ...formData, risk_tolerance: value })
            }
          >
            <option value="conservative">Conservative - Prefer lower risk</option>
            <option value="moderate">Moderate - Balanced approach</option>
            <option value="aggressive">Aggressive - Comfortable with high risk</option>
          </Select>
        </div>

        {/* Decision Making Style */}
        <div>
          <label className="block font-medium mb-2">
            How do you make decisions?
          </label>
          <Select
            value={formData.decision_making_style}
            onChange={(value) =>
              setFormData({ ...formData, decision_making_style: value })
            }
          >
            <option value="data-driven">Data-driven - Need data/research</option>
            <option value="intuitive">Intuitive - Trust gut feeling</option>
            <option value="consensus-seeking">
              Consensus-seeking - Seek input from others
            </option>
            <option value="mixed">Mixed approach</option>
          </Select>
        </div>

        {/* Primary Goals */}
        <div>
          <label className="block font-medium mb-2">Primary Goals</label>
          <Input
            placeholder="E.g., Launch in 3 months, Reach $10k MRR, Build a team"
            value={formData.primary_goals.join(', ')}
            onChange={(e) =>
              setFormData({
                ...formData,
                primary_goals: e.target.value.split(',').map((s) => s.trim()),
              })
            }
          />
        </div>

        <Button onClick={handleSubmit} className="w-full">
          {profile ? 'Update Profile' : 'Create Profile'}
        </Button>
      </div>
    </div>
  );
}
```

### 4. Add Progress Dashboard

```typescript
// src/components/ProgressDashboard.tsx
import React from 'react';
import { useProgressMilestones, useProgressBlockers, useProgressInsights } from '@/hooks/useProgressTracker';
import { useUser } from '@supabase/auth-helpers-react';

export function ProgressDashboard() {
  const user = useUser();
  const { milestones, completeMilestone, startMilestone } = useProgressMilestones(user?.id);
  const { blockers, resolveBlocker } = useProgressBlockers(user?.id);
  const insights = useProgressInsights(user?.id);

  return (
    <div className="p-6 space-y-6">
      {/* Header with Progress */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
        <div className="flex gap-6">
          <div>
            <div className="text-3xl font-bold">{insights.progressPercentage}%</div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{insights.daysRemaining}</div>
            <div className="text-sm text-gray-600">Days Remaining</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{insights.completedMilestones.length}</div>
            <div className="text-sm text-gray-600">Milestones Done</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">💡 Recommendations</h3>
          <ul className="space-y-2">
            {insights.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600">→</span>
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical Blockers */}
      {insights.criticalBlockers.length > 0 && (
        <div className="bg-red-50 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-3">
            🚨 Critical Blockers
          </h3>
          {insights.criticalBlockers.map((blocker) => (
            <div key={blocker.id} className="mb-4">
              <h4 className="font-medium">{blocker.blocker_title}</h4>
              <p className="text-sm text-gray-600 mb-2">
                {blocker.blocker_description}
              </p>
              <button
                onClick={() =>
                  resolveBlocker({
                    blockerId: blocker.id,
                    resolution: {
                      status: 'resolved',
                      resolution_notes: 'Resolved via dashboard',
                    },
                  })
                }
                className="text-sm text-blue-600 underline"
              >
                Mark as Resolved
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Milestones List */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="font-semibold mb-4">Milestones</h3>
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div>
                <h4 className="font-medium">{milestone.milestone_name}</h4>
                <p className="text-sm text-gray-600">
                  Status: {milestone.status} | Day {milestone.target_day}
                </p>
              </div>
              <div className="flex gap-2">
                {milestone.status === 'not_started' && (
                  <button
                    onClick={() => startMilestone(milestone.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    Start
                  </button>
                )}
                {milestone.status === 'in_progress' && (
                  <button
                    onClick={() => completeMilestone(milestone.id, 80)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Integration Checklist

- [ ] Run database migration
- [ ] Copy type definitions to your project
- [ ] Copy BusinessContextService to your backend/edge function
- [ ] Add hooks to your hooks folder
- [ ] Update chatbot component to use enhanced context
- [ ] Add founder profile onboarding flow
- [ ] Add progress dashboard
- [ ] Test context aggregation
- [ ] Test proactive suggestions
- [ ] Test profile completeness calculation
- [ ] Test milestone and blocker tracking

## Next Steps

1. **Test Phase 1** - Verify all features work correctly
2. **Gather User Feedback** - See how founders respond to enhanced features
3. **Plan Phase 2** - Implement Proactive Guidance Orchestrator

## Need Help?

Refer to:
- [PHASE_1_IMPLEMENTATION.md](./PHASE_1_IMPLEMENTATION.md) for detailed documentation
- [src/types/aiCofounder.ts](src/types/aiCofounder.ts) for type definitions
- [src/hooks/](src/hooks/) for hook implementations
