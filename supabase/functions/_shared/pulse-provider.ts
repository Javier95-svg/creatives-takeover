/**
 * Where Pulse's model calls go.
 *
 * The project's own Google key (GEMINI_API_KEY, the one every other function
 * uses) takes precedence, through Gemini's OpenAI-compatible endpoint. The
 * Lovable gateway stays as a fallback for environments that only have its key.
 * Model names stay canonical ("google/gemini-2.5-flash") everywhere else, so
 * stored metadata and the strategy cap are unaffected; only the request body
 * carries the provider's spelling.
 */

export interface PulseProvider {
  name: 'gemini' | 'lovable';
  url: string;
  key: string;
  /** The provider's spelling of a canonical model name. */
  model: (canonical: string) => string;
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const LOVABLE_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export function resolvePulseProvider(env: (name: string) => string | undefined = (name) => Deno.env.get(name)): PulseProvider | null {
  const gemini = env('GEMINI_API_KEY')?.trim();
  if (gemini) return { name: 'gemini', url: GEMINI_URL, key: gemini, model: (canonical) => canonical.replace(/^google\//, '') };
  const lovable = env('LOVABLE_API_KEY')?.trim();
  if (lovable) return { name: 'lovable', url: LOVABLE_URL, key: lovable, model: (canonical) => canonical };
  return null;
}
