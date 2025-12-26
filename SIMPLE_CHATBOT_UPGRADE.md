# Simple BizMap AI Chatbot Upgrade

## 3 Easy Enhancements (No Overcomplications)

### What We're Adding

1. **Context-Aware Banner** - Shows personalized status at top of chat
2. **Quick Action Buttons** - AI-suggested prompts the user can click
3. **Auto Profile Creation** - Silently creates profile on first use

---

## How to Integrate (Copy & Paste)

### Step 1: Update BizMapChat.tsx

Add these imports at the top:

```typescript
import { ContextAwareBanner } from './chatbot/ContextAwareBanner';
import { QuickActions } from './chatbot/QuickActions';
import { useAutoProfile } from '@/hooks/useAutoProfile';
```

Inside the `BizMapChat` component function, add this hook call (near the top):

```typescript
// Auto-create profile for new users
useAutoProfile();
```

In the JSX, add the banner right after the chat header (before messages):

```typescript
{/* Context-aware welcome banner */}
{user && <ContextAwareBanner />}
```

Add quick actions right before the input field (above the message input):

```typescript
{/* Quick action suggestions */}
{user && !isLoading && (
  <QuickActions
    onActionClick={(prompt) => {
      setMessage(prompt);
      // Optionally auto-send:
      // handleSendMessage(new Event('submit') as any, prompt);
    }}
  />
)}
```

---

## Complete Integration Example

Here's exactly where to add each piece in BizMapChat.tsx:

```typescript
// At the top with other imports
import { ContextAwareBanner } from './chatbot/ContextAwareBanner';
import { QuickActions } from './chatbot/QuickActions';
import { useAutoProfile } from '@/hooks/useAutoProfile';

export function BizMapChat({ /* props */ }: BizMapChatProps) {
  // Near the top of the component
  useAutoProfile();  // ← Add this line

  // ... rest of existing code ...

  return (
    <div className="flex flex-col h-full">
      {/* Existing header code */}

      {/* ADD BANNER HERE - After header, before messages */}
      {user && <ContextAwareBanner />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {/* Existing message rendering code */}
      </div>

      {/* ADD QUICK ACTIONS HERE - Before input field */}
      {user && !isLoading && (
        <QuickActions
          onActionClick={(prompt) => {
            setMessage(prompt);
          }}
        />
      )}

      {/* Existing input field */}
      <div className="p-4">
        {/* Input code */}
      </div>
    </div>
  );
}
```

---

## That's It!

### What Users Will See

**Before any chat:**
- Profile auto-creates silently in background

**At top of chat:**
```
🎯 Great! You're on Day 5/30 and on track with 2 milestones completed.
```
OR
```
⚠️ You have 1 critical blocker that needs attention.
```

**Above input field:**
```
💡 Suggested:  [Help me start target customer] [Complete my profile]
```

### What Happens

1. **User opens chat** → Profile auto-creates (if new user)
2. **User sees banner** → Knows their current status
3. **User sees suggestions** → Can click to auto-fill prompt
4. **User chats normally** → Everything else stays the same

---

## Optional: Add Context to AI Prompts

To make the AI actually use the context, update your chatbot hook to include formatted context:

```typescript
// In your chatbot API call
import { BusinessContextService } from '@/services/businessContextService';

// Before sending to AI
const context = await BusinessContextService.getAggregatedContext(userId);
const formattedContext = BusinessContextService.formatContextForAI(context);

// Include in system prompt
const systemPrompt = `
You are an AI Co-Founder helping this founder build their business.

${formattedContext}

Provide personalized, proactive guidance based on their context.
`;
```

---

## Testing

1. **Start dev server:** `npm run dev`
2. **Sign in** to your account
3. **Open BizMap AI chat**
4. **Look for:**
   - Banner at top showing your status
   - Suggested action buttons above input
   - Console log: "Profile created" (first time only)

---

## What NOT to Do

❌ Don't add complex UI overlays
❌ Don't change existing chat flow
❌ Don't force users through onboarding
❌ Don't add popups or modals

✅ Keep it simple and non-intrusive
✅ Let context work in background
✅ Show only relevant, helpful info
✅ Make suggestions, don't force actions

---

## Files Created

1. `src/components/chatbot/ContextAwareBanner.tsx` - Status banner
2. `src/components/chatbot/QuickActions.tsx` - Action buttons
3. `src/hooks/useAutoProfile.ts` - Auto profile creation

## Files to Modify

1. `src/components/BizMapChat.tsx` - Add 3 simple integrations

---

**That's the entire upgrade!** Simple, clean, and effective. 🚀
