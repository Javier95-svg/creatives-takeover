// The founder as an author. api/newspaper-og.ts keeps a copy (the Edge bundler
// cannot import from src/); tests/newspaper-og.test.ts fails if the two differ,
// so the crawler HTML and the React article page always credit the same person.

const SITE = "https://creatives-takeover.com";

export const FOUNDER_AUTHOR = {
  /** profiles.id of the `javier` account, which wrote every Newspaper article (checked 2026-11-19). */
  profileId: "b87c3c91-de0e-404b-b321-6dc918c0eb91",
  name: "Javier Alonso",
  jobTitle: "Founder (CEO & CTO)",
  /** His Founder ID inside the platform (/@javier redirects here). */
  profilePath: "/profile/javier",
  sameAs: ["https://www.linkedin.com/in/javier-digital-marketing/", "https://x.com/JavierForge"],
} as const;

/** schema.org Person for the founder, the same entity as Organization.founder on every page. */
export const founderPersonSchema = () => ({
  "@type": "Person",
  "@id": `${SITE}/about#founder`,
  name: FOUNDER_AUTHOR.name,
  jobTitle: FOUNDER_AUTHOR.jobTitle,
  url: `${SITE}${FOUNDER_AUTHOR.profilePath}`,
  sameAs: [...FOUNDER_AUTHOR.sameAs],
});

/**
 * Who to credit for a Newspaper article. Only articles written from the
 * founder's account carry his name; anything else is credited to the
 * publication, so a byline never names someone who did not write the piece.
 */
export const isFounderArticle = (authorId: string | null | undefined) => authorId === FOUNDER_AUTHOR.profileId;
