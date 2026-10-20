# Founder ID share card proposal

Status: approved luxury layout, implemented with a permanent public account number.

## Visual direction

Use a 1200 × 630 card inspired by a luxury metal credit card: charcoal surfaces,
champagne metallic details, a fine inset border and embossed-looking typography.
Remove the project logo and project title. Make the founder's name the main
element, with a discreet handle, public stage, portrait and readable profile link.
Replace the decorative chip with an engraved six-digit Founder ID, grouped as
`024 681`. The preview uses a sample; the database assigns the real number.

## Account numbers

The migration `20261022220000_permanent_founder_numbers.sql` assigns each existing
and new account a unique number. Numbers cannot be selected, changed or recycled.
The public profile projection exposes only this additional public field while
preserving existing privacy rules. Cards omit the number until the migration is applied.

## Personalisation

- A restrained metal finish chosen by the founder (champagne, silver or graphite).
- A short tagline with a useful default when it is empty.
- Existing portrait, display name, handle and public stage.

Keep personalisation controlled: one finish and a short tagline. Validate image
URLs and colours and retain a complete fallback card when fields are missing.

## Release

1. Apply the permanent-number migration to assign real account numbers.
2. Use the luxury layout for Founder ID share images, without a logo or project title.
3. Version the image URL to request the updated design and render a feed-size preview.

User-selectable metal finishes remain an optional future enhancement.

## Proposed screenshot

The proposal uses Javier's existing portrait, name, handle, tagline and public
Traction stage. It excludes the project logo and project title.
The screenshot is rendered from the production card component with sample data.

Files: `previews/founder-id-card-proposal.png` and
`previews/founder-id-x-preview.png`. Regenerate with
`node scripts/render-founder-id-preview.mjs`.
