# Commit Handoff Policy

Last updated: 2026-06-08

The user plans to return to Claude Opus soon. Claude must stay aware of meaningful repo changes made by Codex.

## Standing Rule

Every time Codex commits changes in this repository, Codex must also update Claude-facing context in `.claude`.

This applies to:

- Product changes.
- Backend/API changes.
- Database migrations.
- Feature flags or environment variables.
- Test/build/lint verification status.
- Known caveats or follow-up work.
- Any change that would surprise Claude in a future session.

## Expected Handoff Shape

For small commits, update the relevant existing `.claude` note with:

- Commit SHA.
- What changed.
- Why it changed.
- Important files/routes/functions.
- Verification run.
- Remaining caveats.

For larger workdays or multi-feature sessions, add or update a dated handoff file:

`YYYY-MM-DD_UPGRADE_HANDOFF.md`

## Current Important Context Files

- `.claude/2026-06-08_UPGRADE_HANDOFF.md`
- `.claude/DEMO_STUDIO_UPGRADES.md`

## Product Context To Preserve

- Pulse is now the compact, contextual, brand-safe in-app assistant for Creatives Takeover.
- Demo Studio is now the demo + VSL + launch page workflow, not Waitlist Maker.

