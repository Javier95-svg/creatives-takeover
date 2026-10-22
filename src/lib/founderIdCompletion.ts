// What a Founder ID needs before it is worth sharing, and what the founder's
// own work elsewhere can fill in. Pure, so node tests can read it.

export type FounderIdItem = 'name' | 'tagline' | 'description' | 'links' | 'support' | 'update';

export interface FounderIdFields {
  startup_name: string | null;
  startup_tagline: string | null;
  startup_description: string | null;
  startup_links: Record<string, string | undefined> | null;
  website_url: string | null;
}

export interface FounderIdSuggestions {
  name: string | null;
  tagline: string | null;
  description: string | null;
}

export const FOUNDER_ID_ITEMS: ReadonlyArray<{ key: FounderIdItem; label: string; hint: string }> = [
  { key: 'name', label: 'Project name', hint: 'The first thing visitors read beside your name.' },
  { key: 'tagline', label: 'One-line pitch', hint: 'What it is, in a sentence. It also shows on your share card.' },
  { key: 'description', label: 'What it does', hint: 'A short paragraph on the problem and who it is for.' },
  { key: 'links', label: 'Project links', hint: 'Website, demo, Loom video, pitch deck or waitlist.' },
  { key: 'support', label: 'Funding link', hint: 'Patreon, PayPal, Buy Me a Coffee and others, so people can back you.' },
  { key: 'update', label: 'First project update', hint: 'One post shows visitors you are moving.' },
];

// Placeholder titles the workspace gives a project before the founder names it.
const GENERIC_PROJECT_NAMES = /^(my project|untitled( project)?|new project|project|my startup|my idea)$/i;

/** A project or Demo Studio name worth offering, or null for a placeholder. */
export function usableProjectName(value: string | null | undefined): string | null {
  const name = value?.trim() ?? '';
  if (name.length < 2 || name.length > 120 || GENERIC_PROJECT_NAMES.test(name)) return null;
  return name;
}

const filled = (value: string | null | undefined) => Boolean(value && value.trim());

export function founderIdCompletion(
  fields: FounderIdFields,
  extras: { hasSupportLink: boolean; hasUpdate: boolean },
) {
  const items: Record<FounderIdItem, boolean> = {
    name: filled(fields.startup_name),
    tagline: filled(fields.startup_tagline),
    description: filled(fields.startup_description),
    links: filled(fields.website_url) || Object.values(fields.startup_links ?? {}).some((link) => filled(link)),
    support: extras.hasSupportLink,
    update: extras.hasUpdate,
  };
  const total = FOUNDER_ID_ITEMS.length;
  const done = Object.values(items).filter(Boolean).length;
  return { items, done, total, remaining: total - done };
}
