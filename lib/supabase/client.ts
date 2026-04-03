import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Prefer publishable key (current Supabase convention), fall back to legacy anon key.
  // During build-time SSR, env vars may be absent — use placeholders so the build doesn't throw.
  // At runtime on Vercel/production the real values are always present.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
