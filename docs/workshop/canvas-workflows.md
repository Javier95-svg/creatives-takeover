# Ideate → Plan → Execute Workflows (Draft)

This document maps the founder journey across BizMap AI, Prompt Library, and Insighta so workshop participants can react to concrete flow visuals. Each stage includes a quick narrative, a service blueprint table, and lightweight diagrams for review.

## Workflow 1: Ideate & Clarify

**Narrative**: A creator opens BizMap AI, outlines a rough concept, and receives a structured Idea Brief seeded from conversation snippets and prompt assists.

| Layer | Steps | Owners | Tool Touchpoints |
|-------|-------|--------|------------------|
| Frontstage | Founder answers discovery questions → Agent mirrors back Idea Snapshot → Founder edits highlights | Founder, BizMap AI | Chat interface, Idea Brief panel |
| Backstage | Agent parses intent, pulls industry template, writes structured summary | AI Orchestrator, Prompt Library | `creativeIndustryTemplates`, conversation state |
| Support | Persona defaults, benchmark lookup tables | Product Ops, Data | Supabase config, template CSVs |

**Sequence Diagram (ASCII)**

```
Founder -> BizMap AI: Start conversation (idea, goals)
BizMap AI -> Prompt Library: Request industry prompt pack
Prompt Library --> BizMap AI: Prompt steps + benchmarks
BizMap AI -> Canvas Service: Create IdeaBrief draft
Canvas Service -> Founder: Surface editable Idea Snapshot
```

## Workflow 2: Plan & Prioritize

**Narrative**: Using prompts and agent guidance, the founder shapes a 30-day roadmap inside the canvas. Sprints and tasks populate automatically, with optional manual refinement.

| Layer | Steps | Owners | Tool Touchpoints |
|-------|-------|--------|------------------|
| Frontstage | Founder picks “Launch in 30 Days” prompt → Reviews sprint proposals → Adjusts priorities | Founder, BizMap AI | Prompt picker, Sprint board |
| Backstage | Agent runs selected prompt sequence → Maps deliverables into `PlanSprint` & `Task` entities → Aligns with founder stage | AI Orchestrator, Strategy | `multiStepPrompts`, canvas API |
| Support | Capacity heuristics, task templates | Strategy Ops | Playbook repository |

**Kanban View Draft**

```
[Sprint 1: Validate Demand]   [Sprint 2: Build Offer]     [Sprint 3: Launch]
 - Customer interviews (Agent) - Prototype landing page     - Launch email series
 - Insighta trend digest      - Pricing experiment tasks    - Funding shortlist review
```

## Workflow 3: Execute & Learn

**Narrative**: As tasks progress, Insighta feeds in new signals (funding deadlines, trend spikes). The agent suggests adjustments, and outcomes loop back into the canvas.

| Layer | Steps | Owners | Tool Touchpoints |
|-------|-------|--------|------------------|
| Frontstage | Founder marks task progress → Receives Insighta alert → Accepts auto-generated follow-up task | Founder, Insighta, BizMap AI | Sprint board, Insight inbox |
| Backstage | Insighta webhook sends event → Canvas service stores `InsightEvent` → Agent evaluates impact and drafts response | Intelligence Ops, AI Orchestrator | Supabase, agent runtime |
| Support | KPI tracking, feedback capture | Analytics | Supabase feedback table, dashboards |

**Swimlane (ASCII)**

```
Lane: Insighta       | Pulls new funding data ──▶ Sends InsightEvent to canvas
Lane: Canvas Service | Logs event ──▶ Links to relevant sprint/task
Lane: BizMap AI      | Evaluates impact ──▶ Suggests plan adjustment
Lane: Founder        | Reviews suggestion ──▶ Accepts/edits ──▶ Marks progress
Lane: Analytics      | Records outcome ──▶ Updates FeedbackSignal
```

## Cross-Workflow Considerations

- **State Continuity**: Ensure each workflow reads/write to the same `WorkspaceCanvas` record so teams see shared context.
- **Visual Artifacts**: For workshop, translate each ASCII sketch into slide-ready diagrams (FigJam/Miro) highlighting data entries, UI states, and decision points.
- **Metrics Hooks**: Track conversion (ideas → canvases), velocity (time to first sprint drafted), and responsiveness (insight to action time) to gauge success post-implementation.


