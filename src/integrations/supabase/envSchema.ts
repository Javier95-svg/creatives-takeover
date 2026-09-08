import { z } from 'zod';

const supabaseBrowserEnvSchema = z
  .object({
    VITE_SUPABASE_URL: z.string().trim().url('must be a valid URL'),
    VITE_SUPABASE_KEY: z.string().trim().min(1).optional(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  })
  .superRefine((env, context) => {
    if (!env.VITE_SUPABASE_KEY && !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VITE_SUPABASE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is required',
        path: ['VITE_SUPABASE_KEY'],
      });
    }
  });

export interface SupabaseBrowserConfig {
  url: string;
  publishableKey: string;
}

export function parseSupabaseBrowserEnv(env: Record<string, unknown>): SupabaseBrowserConfig {
  const result = supabaseBrowserEnvSchema.safeParse(env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid Supabase browser configuration: ${details}`);
  }

  return {
    url: result.data.VITE_SUPABASE_URL,
    publishableKey:
      result.data.VITE_SUPABASE_KEY ?? result.data.VITE_SUPABASE_PUBLISHABLE_KEY!,
  };
}
