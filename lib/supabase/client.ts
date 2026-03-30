import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Supabase is transitioning from legacy `anon` keys to `publishable` keys.
  // Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` but fall back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  );
}
