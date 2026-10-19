// Founder ID: the public profile of a founder or builder account. Mentors,
// service providers and investors keep a plain profile.
//
// Every Founder ID has a short link, creatives-takeover.com/@username, that
// vercel.json redirects to /profile/:username. The /profile URL stays the
// canonical one for search engines; the short link is the one people share.

export function isFounderIdAccount(userType: string | null | undefined): boolean {
  return !userType || userType === 'founder' || userType === 'builder';
}

export function founderIdPath(username: string): string {
  return `/@${encodeURIComponent(username)}`;
}

/** The link to share, on whatever origin the page is served from. */
export function founderIdUrl(username: string, origin: string = window.location.origin): string {
  return `${origin}${founderIdPath(username)}`;
}

/** The link as people read it: no protocol, so it fits on a slide or a bio. */
export function founderIdDisplay(username: string, host: string = window.location.host): string {
  return `${host}/@${username}`;
}
