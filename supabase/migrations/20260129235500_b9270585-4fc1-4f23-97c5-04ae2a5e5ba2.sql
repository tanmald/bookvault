-- Create a function to atomically use an invite link
-- This prevents race conditions by doing the validation and increment in a single atomic operation
CREATE OR REPLACE FUNCTION public.use_invite_link(invite_code text, joining_user_id uuid)
RETURNS TABLE(invite_id uuid, invite_owner_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id uuid;
  v_owner_id uuid;
  v_expires_at timestamptz;
  v_max_uses integer;
  v_uses_count integer;
  v_is_active boolean;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT id, owner_id, expires_at, max_uses, uses_count, is_active
  INTO v_invite_id, v_owner_id, v_expires_at, v_max_uses, v_uses_count, v_is_active
  FROM public.invite_links
  WHERE code = invite_code
  FOR UPDATE;
  
  -- Check if invite exists
  IF v_invite_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, false, 'Convite não encontrado'::text;
    RETURN;
  END IF;
  
  -- Check if active
  IF NOT v_is_active THEN
    RETURN QUERY SELECT v_invite_id, v_owner_id, false, 'Este convite está inativo'::text;
    RETURN;
  END IF;
  
  -- Check if expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT v_invite_id, v_owner_id, false, 'Este convite já expirou'::text;
    RETURN;
  END IF;
  
  -- Check max uses
  IF v_max_uses IS NOT NULL AND v_uses_count >= v_max_uses THEN
    RETURN QUERY SELECT v_invite_id, v_owner_id, false, 'Este convite já atingiu o número máximo de utilizações'::text;
    RETURN;
  END IF;
  
  -- Check if user is trying to use their own invite
  IF v_owner_id = joining_user_id THEN
    RETURN QUERY SELECT v_invite_id, v_owner_id, false, 'Não podes usar o teu próprio convite'::text;
    RETURN;
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id = joining_user_id AND friend_id = v_owner_id)
       OR (user_id = v_owner_id AND friend_id = joining_user_id)
  ) THEN
    RETURN QUERY SELECT v_invite_id, v_owner_id, false, 'Já és amigo deste utilizador'::text;
    RETURN;
  END IF;
  
  -- All checks passed - atomically increment uses_count
  UPDATE public.invite_links
  SET uses_count = uses_count + 1
  WHERE id = v_invite_id;
  
  -- Create friendship
  INSERT INTO public.friendships (user_id, friend_id, invite_link_id)
  VALUES (v_owner_id, joining_user_id, v_invite_id);
  
  RETURN QUERY SELECT v_invite_id, v_owner_id, true, NULL::text;
END;
$$;