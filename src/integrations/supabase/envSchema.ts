// Plain checks rather than zod: this runs on every page load, and it was the
// only thing that put zod (about 50KB raw) in the entry chunk.

export interface SupabaseBrowserConfig {
  url: string;
  publishableKey: string;
}

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/** A trimmed string, '' for an empty one, undefined when absent, null when not a string. */
const readString = (value: unknown) => {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value.trim() : null;
};

export function parseSupabaseBrowserEnv(env: Record<string, unknown>): SupabaseBrowserConfig {
  const url = readString(env.VITE_SUPABASE_URL);
  const key = readString(env.VITE_SUPABASE_KEY);
  const publishableKey = readString(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const issues: string[] = [];

  if (url === undefined || url === null) issues.push('VITE_SUPABASE_URL is required');
  else if (!isValidUrl(url)) issues.push('VITE_SUPABASE_URL must be a valid URL');
  for (const [name, value] of [['VITE_SUPABASE_KEY', key], ['VITE_SUPABASE_PUBLISHABLE_KEY', publishableKey]] as const) {
    if (value === null) issues.push(`${name} must be a string`);
    else if (value === '') issues.push(`${name} must not be empty`);
  }
  if (!key && !publishableKey) {
    issues.push('VITE_SUPABASE_KEY VITE_SUPABASE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is required');
  }

  if (issues.length > 0) {
    throw new Error(`Invalid Supabase browser configuration: ${issues.join('; ')}`);
  }

  return {
    url: url as string,
    publishableKey: (key || publishableKey) as string,
  };
}
