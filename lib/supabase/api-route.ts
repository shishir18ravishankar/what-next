import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { createClient as createServerCookieClient } from '@/lib/supabase/server';

/**
 * Reads JWT from Authorization: Bearer <access_token> (preferred for Route Handlers).
 * Falls back to Supabase cookies via createServerCookieClient when the header is missing.
 *
 * Cookie-only server clients often lack a refreshable session on /api/* requests; passing
 * the access token from the browser ensures RLS sees auth.uid() = user_id for writes.
 */
export function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  return token || null;
}

export async function createSupabaseForApiRoute(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const token = extractBearerToken(req);

  if (token) {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  return createServerCookieClient();
}

export async function getUserForApiRoute(req: NextRequest) {
  const token = extractBearerToken(req);
  const supabase = await createSupabaseForApiRoute(req);

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    return { supabase, user: data.user, error };
  }

  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: data.user, error };
}
