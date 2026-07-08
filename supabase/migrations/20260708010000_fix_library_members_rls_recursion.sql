-- ============================================================================
-- Fix "infinite recursion detected in policy for relation library_members"
-- ============================================================================
--
-- Root cause (confirmed by isolated repro against a local Postgres 16, see
-- session notes): 20260207000000_fix_rls_recursion.sql created a SELECT
-- policy "Users can view library members" whose third branch directly
-- self-joins library_members from within its own policy body:
--
--   OR library_id IN (
--     SELECT lm.library_id FROM public.library_members lm WHERE lm.user_id = auth.uid()
--   )
--
-- That's a textbook Postgres RLS self-reference: evaluating the policy
-- requires querying library_members again, which requires evaluating the
-- same policy again (Postgres error 42P17). It was harmless while
-- 20260207185124_remote_schema.sql later disabled RLS on library_members
-- entirely (the security regression fixed in
-- 20260705000000_fix_rls_security_regressions.sql) — with RLS off, no
-- policy ever ran, so the bug was dormant. That migration re-enabled RLS and
-- added new, correct policies, but did NOT drop this specific stale policy
-- (its name wasn't in the DROP POLICY list), so it came back to life
-- alongside the new ones and broke virtually every query that touches
-- library_members (directly or via a join from books/reading_progress/etc).
--
-- (An earlier version of this migration incorrectly attributed the bug to
-- LANGUAGE sql function inlining stripping SECURITY DEFINER. That was
-- disproven by an isolated repro: the original LANGUAGE sql
-- is_library_member() works correctly once this stale policy is gone. The
-- plpgsql rewrites below are kept anyway as harmless defense-in-depth —
-- plpgsql functions are never inlined by the planner — but they are not
-- what fixes this incident; dropping the stale policy is.)
-- ============================================================================

-- The confirmed root cause.
DROP POLICY IF EXISTS "Users can view library members" ON public.library_members;

-- Defensive: these older-named admin policies (from the very first
-- library_members migration, 20260130001727) were likely already removed by
-- CASCADE when is_library_admin(UUID, UUID) was dropped and recreated in
-- 20260201171515_multi_library_support.sql, but drop them explicitly too in
-- case that cascade didn't reach a given environment.
DROP POLICY IF EXISTS "Admins can insert members" ON public.library_members;
DROP POLICY IF EXISTS "Admins can update member roles" ON public.library_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.library_members;

-- Defense-in-depth (not the fix for this incident, see note above): rewrite
-- the SECURITY DEFINER helpers that query library_members as plpgsql so they
-- can never be inlined by the planner, which would strip their SECURITY
-- DEFINER context and reintroduce a similar hazard.
CREATE OR REPLACE FUNCTION public.is_library_member(
  _library_id uuid,
  _user_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = _library_id
      AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.libraries
    WHERE id = _library_id AND created_by = _user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_library_admin(
  _library_id UUID,
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = _library_id
      AND user_id = _user_id
      AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.libraries
    WHERE id = _library_id AND created_by = _user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_library_members_with_profiles(p_library_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, role library_role, created_at timestamp with time zone)
 LANGUAGE plpgsql STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    lm.user_id,
    p.display_name,
    p.avatar_url,
    lm.role,
    lm.created_at
  FROM public.library_members lm
  LEFT JOIN public.profiles p ON lm.user_id = p.user_id
  WHERE lm.library_id = p_library_id
  ORDER BY
    CASE WHEN lm.role = 'admin' THEN 0 ELSE 1 END,
    lm.created_at;
END;
$function$;
