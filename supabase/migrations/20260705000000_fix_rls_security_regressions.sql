-- ============================================================================
-- Fix RLS / access-control security regressions
-- ============================================================================
--
-- Context: The 20260207185124_remote_schema.sql migration regressed several
-- access controls that earlier migrations had gotten right:
--
--   C1) It DISABLED row level security on public.library_members and shipped
--       "library_members_insert WITH CHECK (true)" + "library_members_select
--       USING (true)". Any authenticated user could insert themselves into any
--       library as role='admin' and then delete every book in it.
--   C2) It added a PUBLIC (anon-readable) SELECT policy on public.invite_links
--       ("Enable read access for all users" USING (is_active = true)),
--       letting anyone enumerate every active invite code.
--   H1) get_library_friends_book_progress is SECURITY DEFINER but never checks
--       that the caller belongs to the book's library (IDOR data leak).
--   H2) use_invite_link trusts a client-supplied joining_user_id instead of
--       deriving the joining user from auth.uid().
--
-- This migration re-establishes the correct, membership-scoped controls.
-- It is written to be idempotent (DROP ... IF EXISTS / CREATE OR REPLACE) and
-- reuses the existing SECURITY DEFINER helper is_library_admin(uuid, uuid) to
-- avoid the RLS self-reference recursion that an earlier migration already had
-- to fix.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Helper: is_library_member(_library_id, _user_id)
-- SECURITY DEFINER so RLS policies on library_members can call it without
-- recursively evaluating library_members policies.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_library_member(
  _library_id uuid,
  _user_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = _library_id
      AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.libraries
    WHERE id = _library_id AND created_by = _user_id
  )
$$;


-- ----------------------------------------------------------------------------
-- C1) library_members: re-enable RLS and replace the wide-open policies.
-- ----------------------------------------------------------------------------
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

-- Drop the permissive/duplicate policies (from remote_schema and earlier).
DROP POLICY IF EXISTS "library_members_insert" ON public.library_members;
DROP POLICY IF EXISTS "library_members_select" ON public.library_members;
DROP POLICY IF EXISTS "Library owners and admins can add members" ON public.library_members;
DROP POLICY IF EXISTS "Library owners and admins can update member roles" ON public.library_members;
DROP POLICY IF EXISTS "Library owners and admins can remove members" ON public.library_members;
DROP POLICY IF EXISTS "Users can remove themselves from libraries" ON public.library_members;
DROP POLICY IF EXISTS "Require authentication for library_members" ON public.library_members;

-- SELECT: you can only see members of libraries you belong to.
CREATE POLICY "library_members_select_own_libraries"
  ON public.library_members
  AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (public.is_library_member(library_id, auth.uid()));

-- INSERT: only owners/admins may add members directly. Normal invite joins go
-- through the SECURITY DEFINER use_invite_link() RPC, which bypasses RLS, so
-- ordinary joiners are unaffected by this restriction.
CREATE POLICY "library_members_insert_admin"
  ON public.library_members
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.is_library_admin(library_id, auth.uid()));

-- UPDATE: only owners/admins may change roles.
CREATE POLICY "library_members_update_admin"
  ON public.library_members
  AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (public.is_library_admin(library_id, auth.uid()))
  WITH CHECK (public.is_library_admin(library_id, auth.uid()));

-- DELETE: owners/admins may remove members; anyone may remove themselves (leave).
CREATE POLICY "library_members_delete_admin_or_self"
  ON public.library_members
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_library_admin(library_id, auth.uid())
  );


-- ----------------------------------------------------------------------------
-- C2) invite_links: remove the public/anon read policy and expose a minimal,
-- SECURITY DEFINER validation RPC for the public /join/:code page instead.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.invite_links;

-- Minimal, non-enumerable invite validation for signed-out visitors.
-- Returns only what the join page needs; never exposes the code list,
-- owner_id, library_id, or use counts.
CREATE OR REPLACE FUNCTION public.get_invite_link_info(p_code text)
RETURNS TABLE(
  valid boolean,
  owner_display_name text,
  expired boolean,
  max_uses_reached boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamptz;
  v_max_uses integer;
  v_uses_count integer;
  v_owner_name text;
  v_found boolean := false;
BEGIN
  SELECT il.expires_at, il.max_uses, il.uses_count, p.display_name
  INTO v_expires_at, v_max_uses, v_uses_count, v_owner_name
  FROM public.invite_links il
  JOIN public.libraries l ON l.id = il.library_id
  LEFT JOIN public.profiles p ON p.user_id = l.created_by
  WHERE il.code = p_code
    AND il.is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, false, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    v_owner_name,
    (v_expires_at IS NOT NULL AND v_expires_at < now()),
    (v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_link_info(text) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- H1) get_library_friends_book_progress: enforce that the caller is a member
-- of the book's library before returning any member data.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_library_friends_book_progress(
  p_user_id uuid,
  p_book_id uuid
)
RETURNS TABLE(
  friend_id uuid,
  display_name text,
  avatar_url text,
  status reading_status,
  progress integer,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  review_id uuid,
  review_rating integer,
  review_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_library_id uuid;
BEGIN
  SELECT library_id INTO v_library_id
  FROM public.books
  WHERE id = p_book_id;

  -- Authorization: only members of the book's library may read the scoreboard.
  -- The caller is always auth.uid(); the p_user_id parameter is not trusted.
  IF v_library_id IS NULL OR NOT public.is_library_member(v_library_id, auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    lm.user_id as friend_id,
    p.display_name,
    p.avatar_url,
    rp.status,
    rp.progress,
    rp.started_at,
    rp.finished_at,
    r.id as review_id,
    r.rating as review_rating,
    r.content as review_text
  FROM public.library_members lm
  LEFT JOIN public.profiles p ON p.user_id = lm.user_id
  LEFT JOIN public.reading_progress rp
    ON rp.user_id = lm.user_id
    AND rp.book_id = p_book_id
  LEFT JOIN public.reviews r
    ON r.user_id = lm.user_id
    AND r.book_id = p_book_id
  WHERE lm.library_id = v_library_id
    AND rp.status IN ('to_read', 'reading', 'read');
END;
$$;


-- ----------------------------------------------------------------------------
-- H2) use_invite_link: derive the joining user from auth.uid() instead of
-- trusting the client-supplied joining_user_id. Signature is kept for client
-- compatibility, but the parameter is ignored.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.use_invite_link(invite_code text, joining_user_id uuid)
 RETURNS TABLE(invite_id uuid, library_id uuid, success boolean, error_message text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_invite_id uuid;
  v_library_id uuid;
  v_owner_id uuid;
  v_expires_at timestamptz;
  v_max_uses integer;
  v_uses_count integer;
  v_is_active boolean;
  v_joining_user_id uuid;
BEGIN
  -- Never trust the client-supplied id; always act as the authenticated caller.
  v_joining_user_id := auth.uid();
  IF v_joining_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Authentication required'::text;
    RETURN;
  END IF;

  -- Fetch invite with library info
  SELECT
    il.id, il.library_id, l.created_by,
    il.expires_at, il.max_uses, il.uses_count, il.is_active
  INTO v_invite_id, v_library_id, v_owner_id,
       v_expires_at, v_max_uses, v_uses_count, v_is_active
  FROM public.invite_links il
  JOIN public.libraries l ON il.library_id = l.id
  WHERE il.code = invite_code
  FOR UPDATE;

  -- Validation checks
  IF v_invite_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Invalid invite code'::text;
    RETURN;
  END IF;

  IF NOT v_is_active THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'This invite is no longer active'::text;
    RETURN;
  END IF;

  IF v_expires_at < now() THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'This invite has expired'::text;
    RETURN;
  END IF;

  IF v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'This invite has reached its maximum uses'::text;
    RETURN;
  END IF;

  -- Prevent using your own invite.
  IF v_owner_id = v_joining_user_id THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'You cannot use your own invite'::text;
    RETURN;
  END IF;

  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.library_members lm
    WHERE lm.library_id = v_library_id AND lm.user_id = v_joining_user_id
  ) THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'You are already a member of this library'::text;
    RETURN;
  END IF;

  -- Increment uses
  UPDATE public.invite_links SET uses_count = uses_count + 1 WHERE id = v_invite_id;

  -- Add as library member
  INSERT INTO public.library_members (library_id, user_id, role, invited_by)
  VALUES (v_library_id, v_joining_user_id, 'member', v_owner_id);

  -- Also create friendship for social features
  INSERT INTO public.friendships (user_id, friend_id, invite_link_id)
  VALUES (v_owner_id, v_joining_user_id, v_invite_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_invite_id, v_library_id, true, NULL::text;
END;
$function$;
