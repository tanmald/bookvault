-- ============================================================================
-- Fix invite_links.owner_id FK Constraint
-- ============================================================================
--
-- Context: The migration 20260204000000 updated RLS policies to expect
-- owner_id to reference profiles.id, but never actually altered the FK
-- constraint. This migration completes that change.
--

-- Step 1: Populate any NULL library_id values (convites antigos)
UPDATE public.invite_links
SET library_id = (
  SELECT id
  FROM public.libraries
  WHERE created_by = owner_id
  AND is_default = true
  LIMIT 1
)
WHERE library_id IS NULL;

-- Step 2: Delete convites with invalid owner_id (se houver)
-- Apenas se owner_id não existe em auth.users
DELETE FROM public.invite_links
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = owner_id
);

-- Step 3: Criar mapeamento temporário se owner_id for de auth.users
-- e precisar mapear para profiles.id
DO $$
BEGIN
  -- Verificar se FK ainda referencia auth.users
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.invite_links'::regclass
      AND conname = 'invite_links_owner_id_fkey'
      AND confrelid = 'auth.users'::regclass
  ) THEN
    -- FK ainda referencia auth.users, precisamos mapear para profiles.id

    -- Adicionar coluna temporária
    ALTER TABLE public.invite_links ADD COLUMN owner_profile_id UUID;

    -- Mapear auth.users.id -> profiles.id
    UPDATE public.invite_links il
    SET owner_profile_id = p.id
    FROM public.profiles p
    WHERE p.user_id = il.owner_id;

    -- Remover FK antigo
    ALTER TABLE public.invite_links
      DROP CONSTRAINT IF EXISTS invite_links_owner_id_fkey;

    -- Copiar valores de owner_profile_id para owner_id
    UPDATE public.invite_links
    SET owner_id = owner_profile_id;

    -- Remover coluna temporária
    ALTER TABLE public.invite_links DROP COLUMN owner_profile_id;

    -- Criar novo FK para profiles
    ALTER TABLE public.invite_links
      ADD CONSTRAINT invite_links_owner_id_fkey
      FOREIGN KEY (owner_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'FK de invite_links.owner_id alterado de auth.users para profiles';
  ELSE
    RAISE NOTICE 'FK já referencia profiles ou não existe';
  END IF;
END $$;
