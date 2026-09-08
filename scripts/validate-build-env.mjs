import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
const errors = [];

if (!env.VITE_SUPABASE_URL) {
  errors.push('VITE_SUPABASE_URL is required');
} else {
  try {
    new URL(env.VITE_SUPABASE_URL);
  } catch {
    errors.push('VITE_SUPABASE_URL must be a valid URL');
  }
}

if (!env.VITE_SUPABASE_KEY && !env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  errors.push('VITE_SUPABASE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY is required');
}

if (errors.length > 0) {
  console.error(`Build environment validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log('Build environment validation passed.');
