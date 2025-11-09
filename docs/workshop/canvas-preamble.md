# Canvas Workshop Preamble

This briefing packages existing references so every discipline walks into the workshop with the same context about how BizMap AI, the Prompt Library, and Insighta operate today.

## BizMap AI Snapshot

- **Guiding principles** (`BIZMAP_AI_GUIDELINES.md`): seven pillars (empathy, depth without overwhelm, creative-friendly language) shape tone, pacing, and decision support. Conversation structure follows validate → value → single next step → encouragement.
- **Current flow architecture** (`supabase/functions/chatbot-streaming/index.ts`, `BIZMAP_CHATBOT_IMPLEMENTATION_COMPLETE.md`): stage-aware prompting (discovery, validation, planning, launch, growth) with industry benchmarks, auto-suggestions, and milestone celebrations surfaced in the chat widget.
- **Feedback + progress loops** (`src/hooks/useChatbot.ts`, Supabase `chatbot_feedback` table): automations trigger micro check-ins every 10 messages, section satisfaction ratings, and exit intent prompts, feeding a progress bar UI.
- **Experience gaps to note for the canvas**:
  - Outputs live inside chat transcript; artifacts (roadmaps, canvases) are not persisted in a structured workspace.
  - Feedback data is captured but not yet visualized for users or used to adapt plans across sessions.
  - Collaboration handoffs (tasks, docs, links) require manual export.

## Prompt Library Reference

- **Template inventory** (`src/data/creativeEntrepreneurTemplates.ts`, `src/data/multiStepPrompts.ts`, `src/data/creativeEntrepreneurTemplates.ts`):
  - Industry packs (technology, creative services, food & beverage, coaching, e-commerce, etc.) bundle prompts, benchmarks, marketing channels, and quick wins.
  - Multi-step prompt sequences cover discovery → validation → launch sprints, but live as static data with no tagging for user stage or prior decisions.
- **Access pattern today**: surfaced through chatbot quick actions or static resource lists—no dedicated workspace view for browsing, bookmarking, or chaining prompts.
- **Opportunities for the shared canvas**:
  - Link prompt nodes to canvas sections (e.g., Idea Brief, Launch Sprint, Funding Plan).
  - Track which prompts generate user artifacts to auto-fill the canvas.
  - Provide visual prompt maps (e.g., swimlanes or cards) so teams can co-select playbooks.

## Insighta Intelligence Layer

- **Funding + insights data** (`PHASE1_FUNDING_BOARD_SETUP.md`, `supabase/migrations/*funding*`, `src/types/funding.ts`, `src/hooks/useFundingOpportunities.ts`):
  - Supabase schema delivers public funding opportunities with filters (type, location, keywords) and optional user bookmarks.
  - Hooks expose simple client-side search; Insighta demo components highlight curated articles, trending content, and funding cards (`src/components/demo/InsightaDemo.tsx`).
- **Usage in BizMap AI** (`supabase/functions/chatbot-ai-engine/index.ts`, quick actions): agent references Insighta for market intelligence and funding recommendations but relies on manual navigation.
- **Integration gaps**:
  - No shared data structure ties Insighta insights back to a user’s plan or sprint board.
  - Funding/bookmark actions happen outside the chatbot context; there’s no closed loop into tasks or decision logs.
  - Visualization is limited to list views—no timeline, heatmap, or priority scoring embedded in workspace.

## Implications for the Shared Canvas

- Establish **canvas entities** that mirror current assets: Idea Brief (chatbot outputs), Strategy Blocks (Prompt Library sequences), Opportunity Feed (Insighta data), Feedback Signals (Supabase feedback table).
- Capture **lifecycles and ownership**: which team (product, design, engineering, strategy) stewards each data stream today, and where cross-team decisions are required.
- Prepare to translate these notes into **visual artifacts** next:
  - Data model diagram linking BizMap session → Canvas → Insighta signals.
  - Workflow swimlanes mapping Ideate → Plan → Execute with tool handoffs.
  - UX storyboard showing how a founder navigates prompts, agent guidance, and insight updates inside one workspace.


