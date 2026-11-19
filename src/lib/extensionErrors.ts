// Errors thrown by browser extensions (password managers, shopping and SEO
// add-ons...) reach our global error listeners because extensions inject
// scripts into the page. They are not our bugs and we cannot fix them, but they
// were logged as "App error" and saved to the activity log, sometimes ten times
// a second (2026-11-19: chrome-extension://eppiocem... "reading 'M_ID'").
// Pure: no "@/" imports, so node tests load it directly.

const EXTENSION_URL = /\b(?:chrome|moz|safari(?:-web)?|ms-browser|edge)-extension:\/\//i;
const ANY_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s)]+/gi;

const stackOf = (error: unknown): string => {
  if (error instanceof Error) return error.stack ?? "";
  if (error && typeof error === "object" && "stack" in error) return String((error as { stack?: unknown }).stack ?? "");
  return "";
};

/**
 * True when the error came from a browser extension: the script that threw is
 * an extension file, or every URL in the stack trace belongs to an extension.
 * An error whose stack touches any of our own code is never treated as one.
 */
export function isBrowserExtensionError(error: unknown, filename?: string | null): boolean {
  if (filename && EXTENSION_URL.test(filename)) return true;
  const urls = stackOf(error).match(ANY_URL) ?? [];
  return urls.length > 0 && urls.every((url) => EXTENSION_URL.test(url));
}
