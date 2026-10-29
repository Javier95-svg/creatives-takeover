// Real proof for the homepage: quotes from founders, mentors or programs who
// agreed to be named. The section stays hidden while this list is empty.
// Never add an entry without the person's permission, and never invent one.
export type HomeProofEntry = {
  quote: string;
  name: string;
  /** Role and project, e.g. "Founder, Acme". */
  role: string;
  /** Optional link to their Founder ID or project. */
  href?: string;
};

export const HOME_PROOF: HomeProofEntry[] = [];

// Shown only on the dev server with ?proof-preview, so the layout can be
// reviewed before real quotes exist. Clearly marked; never rendered in builds.
export const HOME_PROOF_PLACEHOLDERS: HomeProofEntry[] = [
  { quote: "Placeholder: a real founder quote about what they got done on the platform.", name: "Placeholder name", role: "Founder, project name" },
  { quote: "Placeholder: a real mentor or program quote about working with founders here.", name: "Placeholder name", role: "Mentor or program lead" },
  { quote: "Placeholder: a real founder quote about a tool that changed a decision.", name: "Placeholder name", role: "Builder, project name" },
];
