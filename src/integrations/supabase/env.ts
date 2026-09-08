import { parseSupabaseBrowserEnv } from './envSchema';

export const supabaseBrowserConfig = parseSupabaseBrowserEnv(import.meta.env);
