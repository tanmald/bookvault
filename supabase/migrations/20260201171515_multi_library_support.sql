-- Multi-Library Support Migration
-- This migration adds support for users to create and manage multiple libraries

-- ============================================================================
-- 1. CREATE LIBRARIES TABLE
-- ============================================================================

CREATE TABLE public.libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  allow_member_uploads BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_libraries_created_by ON public.libraries(created_by);
CREATE INDEX idx_libraries_default ON public.libraries(created_by, is_default) WHERE is_default = true;

-- Ensure only one default library per user
CREATE UNIQUE INDEX idx_one_default_per_user
  ON public.libraries(created_by)
  WHERE is_default = true;

-- ============================================================================
-- 2. UPDATE LIBRARY_MEMBERS TABLE
-- ============================================================================

-- Rename column for clarity
ALTER TABLE public.library_members
  RENAME COLUMN library_owner_id TO library_id;

-- Update indexes
DROP INDEX IF EXISTS idx_library_members_owner;
CREATE INDEX idx_library_members_library ON public.library_members(library_id);
CREATE INDEX idx_library_members_user ON public.library_members(user_id);

-- ============================================================================
-- 3. ADD LIBRARY_ID TO BOOKS TABLE
-- ============================================================================

-- Add library_id column (nullable for migration)
ALTER TABLE public.books
  ADD COLUMN library_id UUID;

-- Index
CREATE INDEX idx_books_library ON public.books(library_id);

-- ============================================================================
-- 4. DATA MIGRATION
-- ============================================================================

-- Step 1: Create default library for each existing user
-- Use their user_id as the library id for backward compatibility
INSERT INTO public.libraries (id, name, description, created_by, is_default)
SELECT
  id as id,  -- Use user's ID as their default library ID
  'My Library' as name,
  'Your personal library' as description,
  id as created_by,
  true as is_default
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Step 2: Migrate all existing books to user's default library
UPDATE public.books
SET library_id = owner_id
WHERE library_id IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE public.books
  ALTER COLUMN library_id SET NOT NULL;

-- Step 4: Add foreign key constraints
ALTER TABLE public.books
  ADD CONSTRAINT fk_books_library
  FOREIGN KEY (library_id)
  REFERENCES public.libraries(id)
  ON DELETE SET NULL;

ALTER TABLE public.library_members
  ADD CONSTRAINT fk_library_members_library
  FOREIGN KEY (library_id)
  REFERENCES public.libraries(id)
  ON DELETE CASCADE;

-- Step 5: Ensure library owners are admins
INSERT INTO public.library_members (library_id, user_id, role)
SELECT id, created_by, 'admin'::library_role
FROM public.libraries
ON CONFLICT (library_id, user_id) DO UPDATE SET role = 'admin';

-- ============================================================================
-- 5. UPDATE RLS POLICIES FOR LIBRARIES TABLE
-- ============================================================================

-- Users can view libraries they're members of
CREATE POLICY "Users can view their libraries"
  ON public.libraries FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_id = libraries.id AND user_id = auth.uid()
    )
  );

-- Users can create their own libraries
CREATE POLICY "Users can create libraries"
  ON public.libraries FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Only library owners can update their libraries
CREATE POLICY "Owners can update their libraries"
  ON public.libraries FOR UPDATE
  USING (created_by = auth.uid());

-- Only library owners can delete their libraries (but not default)
CREATE POLICY "Owners can delete their libraries"
  ON public.libraries FOR DELETE
  USING (created_by = auth.uid() AND is_default = false);

-- ============================================================================
-- 6. UPDATE RLS POLICIES FOR BOOKS TABLE
-- ============================================================================

-- Drop existing friend-based policies
DROP POLICY IF EXISTS "Users can view friends' books" ON public.books;
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;
DROP POLICY IF EXISTS "Library admins can delete books" ON public.books;
DROP POLICY IF EXISTS "Users can view library books" ON public.books;
DROP POLICY IF EXISTS "Users can add books to libraries" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Admins can delete library books" ON public.books;

-- Users can view books in libraries they're members of
CREATE POLICY "Users can view library books"
  ON public.books FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_id = books.library_id AND user_id = auth.uid()
    )
  );

-- Users can add books to libraries where they're allowed
CREATE POLICY "Users can add books to libraries"
  ON public.books FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- Owner of the library
      EXISTS (
        SELECT 1 FROM public.libraries
        WHERE id = library_id AND created_by = auth.uid()
      )
      -- Or library allows member uploads and user is a member
      OR EXISTS (
        SELECT 1 FROM public.libraries l
        JOIN public.library_members lm ON l.id = lm.library_id
        WHERE l.id = library_id
          AND l.allow_member_uploads = true
          AND lm.user_id = auth.uid()
      )
    )
  );

-- Users can update their own books
CREATE POLICY "Users can update their own books"
  ON public.books FOR UPDATE
  USING (owner_id = auth.uid());

-- Users can delete their own books OR admins can delete books in their library
CREATE POLICY "Admins can delete library books"
  ON public.books FOR DELETE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_id = books.library_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. UPDATE HELPER FUNCTIONS
-- ============================================================================

-- Drop existing function to avoid parameter name conflicts (CASCADE to drop dependent policies)
DROP FUNCTION IF EXISTS public.is_library_admin(UUID, UUID) CASCADE;

-- Update is_library_admin to work with library IDs
CREATE OR REPLACE FUNCTION public.is_library_admin(
  _library_id UUID,
  _user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = _library_id
      AND user_id = _user_id
      AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.libraries
    WHERE id = _library_id AND created_by = _user_id
  )
$$;

-- Prevent deleting default library
CREATE OR REPLACE FUNCTION prevent_default_library_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_default = true THEN
    RAISE EXCEPTION 'Cannot delete default library';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_default_library_deletion
  BEFORE DELETE ON public.libraries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_library_deletion();

-- ============================================================================
-- 8. UPDATE INVITE_LINKS TABLE
-- ============================================================================

-- Add library_id to invites
ALTER TABLE public.invite_links
  ADD COLUMN library_id UUID;

-- Migrate existing invites to default libraries
UPDATE public.invite_links
SET library_id = owner_id
WHERE library_id IS NULL;

-- Make it required
ALTER TABLE public.invite_links
  ALTER COLUMN library_id SET NOT NULL;

-- Add foreign key
ALTER TABLE public.invite_links
  ADD CONSTRAINT fk_invite_links_library
  FOREIGN KEY (library_id)
  REFERENCES public.libraries(id)
  ON DELETE CASCADE;

-- Index
CREATE INDEX idx_invite_links_library ON public.invite_links(library_id);

-- ============================================================================
-- 9. UPDATE use_invite_link FUNCTION
-- ============================================================================

-- Drop existing function to recreate with updated logic
DROP FUNCTION IF EXISTS public.use_invite_link(TEXT, UUID);

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
  IF EXISTS (
    SELECT 1 FROM public.library_members
    WHERE library_id = v_library_id AND user_id = joining_user_id
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

-- ============================================================================
-- 10. UPDATE get_library_members_with_profiles FUNCTION
-- ============================================================================

-- Drop existing function to recreate with new parameter name
DROP FUNCTION IF EXISTS public.get_library_members_with_profiles(UUID);

CREATE OR REPLACE FUNCTION public.get_library_members_with_profiles(p_library_id uuid)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, role library_role, created_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;
