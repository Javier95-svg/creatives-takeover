// Small, dependency-free helpers for reading MVP Builder model output.
// Kept apart from mvp-builder-generate/index.ts so tests can import them.

/**
 * Escapes raw control characters (newlines, tabs, ...) that appear inside JSON
 * string literals. Gemini often writes the generated HTML into a JSON string
 * with real line breaks, which JSON.parse rejects ("Bad control character in
 * string literal"). Characters outside strings are left alone.
 */
export function escapeControlCharsInJsonStrings(value: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const char of value) {
    if (!inString) {
      if (char === '"') inString = true;
      out += char;
      continue;
    }
    if (escaped) {
      escaped = false;
      out += char;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      out += char;
      continue;
    }
    if (char === '"') {
      inString = false;
      out += char;
      continue;
    }
    const code = char.charCodeAt(0);
    if (code < 0x20) {
      if (char === "\n") out += "\\n";
      else if (char === "\r") out += "\\r";
      else if (char === "\t") out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }
    out += char;
  }
  return out;
}

/** JSON.parse, retrying once with control characters inside strings escaped. */
export function parseJsonTolerant(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    const escaped = escapeControlCharsInJsonStrings(value);
    if (escaped === value) throw error;
    return JSON.parse(escaped);
  }
}

/**
 * Whether form submissions on this page are tracked. A data-ct-lead form is
 * submitted by the platform script, which fires form_submitted itself (the
 * prompt tells the model not to add its own handler), and a page without a
 * form has nothing to track.
 */
export function htmlTracksFormSubmissions(html: string): boolean {
  if (html.includes("form_submitted")) return true;
  const forms = html.match(/<form\b[^>]*>/gi) ?? [];
  return forms.every((tag) => /\bdata-ct-lead\b/i.test(tag));
}
