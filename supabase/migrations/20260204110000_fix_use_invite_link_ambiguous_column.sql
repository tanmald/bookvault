-- ============================================================================
-- Fix use_invite_link - Ambiguous Column Reference
-- ============================================================================
--
-- Context: Error 42702 "column reference library_id is ambiguous"
-- The function uses 'library_id' without table qualification, causing
-- ambiguity between the return column and table columns.
--

DROP FUNCTION IF EXISTS public.use_invite_link(text, uuid);

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
BEGIN
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

  -- Check if already a member
  -- FIX: Qualificar explicitamente library_members.library_id
  IF EXISTS (
    SELECT 1 FROM public.library_members lm
    WHERE lm.library_id = v_library_id AND lm.user_id = joining_user_id
  ) THEN
    RETURN QUERY SELECT v_invite_id, v_library_id, false, 'You are already a member of this library'::text;
    RETURN;
  END IF;

  -- Increment uses
  UPDATE public.invite_links SET uses_count = uses_count + 1 WHERE id = v_invite_id;

  -- Add as library member
  INSERT INTO public.library_members (library_id, user_id, role, invited_by)
  VALUES (v_library_id, joining_user_id, 'member', v_owner_id);

  -- Also create friendship for social features
  INSERT INTO public.friendships (user_id, friend_id, invite_link_id)
  VALUES (v_owner_id, joining_user_id, v_invite_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_invite_id, v_library_id, true, NULL::text;
END;
$function$;
