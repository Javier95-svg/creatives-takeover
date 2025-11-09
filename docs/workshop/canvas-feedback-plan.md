# Workshop Feedback & Follow-Up Plan

This guide explains how we will capture insights during the shared canvas workshop and convert decisions into actionable next steps.

## 1. Feedback Streams (During Session)

| Stream | Purpose | Capture Method | Owner |
|--------|---------|----------------|-------|
| Live Reactions | Gauge participant sentiment in real time | FigJam/Miro reaction stickers (✅, ❓, ⚠️) placed on context wall and diagrams | Design |
| Voice Notes | Record nuanced discussion points | Dedicated Zoom/Meet recording + timestamped note doc | Facilitator |
| Decision Log | Track agreements & open questions | Shared Notion table with fields (Topic, Decision, Owner, Dependencies, Confidence) | Strategy |
| Parking Lot | Document topics out of scope | Sticky cluster on board + column in Notion “Parking Lot” view | Product Ops |
| Action Items | Assign follow-up tasks | Live update in project tracker (Linear/Jira) using template below | Engineering Lead |

### Real-Time Template (Notion Table)

| Topic | Decision | Owner | Due Date | Confidence (1-5) | Notes |
|-------|----------|-------|----------|-------------------|-------|

## 2. Post-Session Synthesis

1. **Raw Exports (within 24h)**  
   - Download FigJam/Miro frames as PDF/PNG.  
   - Export chat transcript and meeting recording highlights.  
   - Archive all assets in `docs/workshop/output/YYYY-MM-DD/`.
2. **Insights Digest (48h)**  
   - Summarize top 5 decisions, top 5 open questions, top 3 risks.  
   - Map insights back to entities/workflows in `canvas-schema.md` and `canvas-workflows.md`.  
   - Share digest in #product-strategy channel with link to assets.
3. **Action Tracker Update (72h)**  
   - Convert all action items into project tickets with context and attachments.  
   - Tag by phase (Foundation, Agent Integration, Execution Flywheel, Collaboration).  
   - Set owners and due dates aligned with implementation roadmap.

## 3. Follow-Up Rituals

- **Weekly Stand-up**: 15-minute async update (Slack form) covering status, blockers, decisions needed.  
- **Bi-Weekly Review**: Live 30-minute sync to review progress against roadmap, measure key metrics, and revisit open questions.  
- **Feedback Pulse Survey**: Short Typeform immediately after workshop + after 30 days to gauge clarity and momentum.

### Pulse Survey Sample Questions

1. How confident are you in the shared canvas direction? (1-5)  
2. What part of the workflow needs the most clarification? (open text)  
3. Which artifact (schema, workflows, kit) was most helpful? (multiple choice)  
4. What risks do you foresee in implementing the workspace? (open text)  
5. How satisfied are you with next steps and ownership? (1-5)

## 4. Decision Governance

- **Decision Types**:
  - *Type A (Strategic)*: Impacts product vision or cross-team alignment. Require sign-off from Product & Strategy leads; document rationale.
  - *Type B (Executional)*: Impacts implementation details. Owner decides; capture for transparency.
- **Documentation**: Use Notion decision database with fields `Decision`, `Type`, `Owner`, `Date`, `Impacted Teams`, `Links`, `Status (Proposed/In Review/Decided/Deprecated)`.
- **Change Control**: Any change to schema/workflows post-workshop must reference decision ID to maintain traceability.

## 5. Success Metrics to Monitor

- % of workshop action items completed on time.  
- Time from workshop to published integrated roadmap.  
- Participation rate in follow-up survey (>80% target).  
- Number of schema/workflow changes requested post-workshop (indicator of clarity).  
- Qualitative sentiment (average >4/5).

By following this plan, we ensure every insight moves from conversation to execution while keeping a clear, auditable trail of decisions.


