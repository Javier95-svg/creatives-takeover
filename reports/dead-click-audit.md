# Dead Click Audit

Scope audited on 2026-04-08:
- `src/pages/Index.tsx` and the components it renders for `/`
- `src/pages/IcpBuilderPage.tsx` and the components it renders for `/icp-builder`
- Shared navigation, footer, sticky CTA, and modal surfaces used on those routes

## Findings

| Path | Line | Visible text | Issue type | Recommendation | Disposition |
| --- | --- | --- | --- | --- | --- |
| `src/components/activation/ActivationJourneyStrip.tsx` | 70 | `Complete this step first` | Disabled CTA looked actionable but had no target | Replace the disabled button with non-interactive status text so it no longer advertises a click that cannot happen | Fixed |

## Notes

- Existing disabled states tied to in-flight submission/loading, such as ICP form submission and quickstart loading, were reviewed and left unchanged because they are temporary feedback states rather than dead-click affordances.
- Existing `/icp-builder` blocked-step handling in `src/components/icp/ICPInputForm.tsx` was already fixed before this pass and now routes users toward the missing input instead of leaving them on a dead CTA.

## Needs Decision

- None.
