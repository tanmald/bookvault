-- 1. Criar enum de roles para bibliotecas
CREATE TYPE public.library_role AS ENUM ('admin', 'member');

-- 2. Criar tabela de membros da biblioteca
CREATE TABLE public.library_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_owner_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role library_role NOT NULL DEFAULT 'member',
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(library_owner_id, user_id)
);

-- 3. Ativar RLS
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;

-- 4. Função SECURITY DEFINER para verificar se é admin (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.is_library_admin(
  _library_owner_id UUID, 
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_owner_id = _library_owner_id
      AND user_id = _user_id
      AND role = 'admin'
  ) OR _library_owner_id = _user_id
$$;

-- 5. Função para verificar role específico
CREATE OR REPLACE FUNCTION public.has_library_role(
  _library_owner_id UUID, 
  _user_id UUID,
  _role library_role
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_owner_id = _library_owner_id
      AND user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Políticas RLS para library_members

-- SELECT: Membros podem ver outros membros da mesma biblioteca
CREATE POLICY "Members can view library members"
  ON public.library_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR library_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library_members lm
      WHERE lm.library_owner_id = library_members.library_owner_id
        AND lm.user_id = auth.uid()
    )
  );

-- INSERT: Apenas admins ou o dono podem adicionar membros
CREATE POLICY "Admins can insert members"
  ON public.library_members FOR INSERT
  WITH CHECK (is_library_admin(library_owner_id, auth.uid()));

-- UPDATE: Apenas admins podem alterar roles (mas não do dono original)
CREATE POLICY "Admins can update member roles"
  ON public.library_members FOR UPDATE
  USING (
    is_library_admin(library_owner_id, auth.uid())
    AND user_id != library_owner_id -- Não pode alterar o dono
  );

-- DELETE: Apenas admins podem remover membros (mas não o dono original)
CREATE POLICY "Admins can remove members"
  ON public.library_members FOR DELETE
  USING (
    is_library_admin(library_owner_id, auth.uid())
    AND user_id != library_owner_id -- Não pode remover o dono
  );

-- 7. Atualizar a função use_invite_link para também criar library_member
CREATE OR REPLACE FUNCTION public.use_invite_link(invite_code text, joining_user_id uuid)
 RETURNS TABLE(invite_id uuid, invite_owner_id uuid, success boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  
  -- Ensure owner is admin in their library (if not already)
  INSERT INTO public.library_members (library_owner_id, user_id, role)
  VALUES (v_owner_id, v_owner_id, 'admin')
  ON CONFLICT (library_owner_id, user_id) DO NOTHING;
  
  -- Add joining user as member of owner's library
  INSERT INTO public.library_members (library_owner_id, user_id, role, invited_by)
  VALUES (v_owner_id, joining_user_id, 'member', v_owner_id)
  ON CONFLICT (library_owner_id, user_id) DO NOTHING;
  
  RETURN QUERY SELECT v_invite_id, v_owner_id, true, NULL::text;
END;
$function$;

-- 8. Migrar amizades existentes para library_members
-- O dono de cada amizade torna-se admin da sua biblioteca
INSERT INTO public.library_members (library_owner_id, user_id, role)
SELECT DISTINCT user_id, user_id, 'admin'::library_role 
FROM public.friendships
ON CONFLICT (library_owner_id, user_id) DO NOTHING;

-- Os amigos tornam-se membros
INSERT INTO public.library_members (library_owner_id, user_id, role, invited_by)
SELECT user_id, friend_id, 'member'::library_role, user_id
FROM public.friendships
ON CONFLICT (library_owner_id, user_id) DO NOTHING;