/**
 * Small env helper for Vite import.meta.env access with runtime validation.
 * Keep logic minimal so generated files can call into it.
 */
export function getEnv(name: string, required = false): string {
  const env = (import.meta.env as Record<string, unknown>)[name];
  const value = env == null ? '' : String(env);

  if (required && !value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export default { getEnv };
