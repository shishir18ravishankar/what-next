/*
  # Fix conversations (and related tables) RLS + privileges

  Problem: API Route Handlers may call PostgREST without a user JWT in context, or tables
  may lack GRANTs for the `authenticated` role. This migration:

  1. Ensures `authenticated` can SELECT/INSERT/UPDATE/DELETE own rows (via RLS).
  2. Replaces policies with Supabase-recommended `(select auth.uid())` form.
  3. Adds explicit GRANTs (safe when missing in some SQL-editor-created projects).

  Run in Supabase SQL Editor if you do not use CLI migrations.
*/

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO service_role;

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;

CREATE POLICY "conversations_select_own"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "conversations_insert_own"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "conversations_update_own"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "conversations_delete_own"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------------
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendations TO service_role;

DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can insert own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can update own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Users can delete own recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "recommendations_select_own" ON public.recommendations;
DROP POLICY IF EXISTS "recommendations_insert_own" ON public.recommendations;
DROP POLICY IF EXISTS "recommendations_update_own" ON public.recommendations;
DROP POLICY IF EXISTS "recommendations_delete_own" ON public.recommendations;

CREATE POLICY "recommendations_select_own"
  ON public.recommendations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "recommendations_insert_own"
  ON public.recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "recommendations_update_own"
  ON public.recommendations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "recommendations_delete_own"
  ON public.recommendations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- mentor_requests
-- ---------------------------------------------------------------------------
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_requests TO service_role;

DROP POLICY IF EXISTS "Users can view own mentor requests" ON public.mentor_requests;
DROP POLICY IF EXISTS "Users can insert own mentor requests" ON public.mentor_requests;
DROP POLICY IF EXISTS "Users can delete own mentor requests" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_select_own" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_insert_own" ON public.mentor_requests;
DROP POLICY IF EXISTS "mentor_requests_delete_own" ON public.mentor_requests;

CREATE POLICY "mentor_requests_select_own"
  ON public.mentor_requests
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "mentor_requests_insert_own"
  ON public.mentor_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "mentor_requests_delete_own"
  ON public.mentor_requests
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
