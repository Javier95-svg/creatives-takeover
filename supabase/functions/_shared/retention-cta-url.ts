/** An absolute link on the configured app origin, or undefined otherwise. */
export function appLink(url: string | undefined, appUrl: string): string | undefined {
  if (!url) return undefined;
  try {
    const resolved = new URL(url, appUrl);
    return resolved.origin === new URL(appUrl).origin ? resolved.toString() : undefined;
  } catch {
    return undefined;
  }
}
