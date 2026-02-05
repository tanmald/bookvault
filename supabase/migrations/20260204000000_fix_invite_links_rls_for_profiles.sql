-- ============================================================================
-- Fix invite_links RLS Policies to Work with profiles FK
-- ============================================================================
--
-- Context: The FK constraint invite_links_owner_id_fkey was modified to
-- reference profiles.id instead of auth.users.id, but the RLS policies
-- were never updated to match. This causes "violates row-level security"
-- errors when creating invites.
--

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own invite links" ON public.invite_links;
DROP POLICY IF EXISTS "Users can create invite links" ON public.invite_links;
DROP POLICY IF EXISTS "Users can update their own invite links" ON public.invite_links;
DROP POLICY IF EXISTS "Users can delete their own invite links" ON public.invite_links;

-- Create new policies that work with profiles FK
CREATE POLICY "Users can view their own invite links"
ON public.invite_links FOR SELECT
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create invite links"
ON public.invite_links FOR INSERT
TO authenticated
WITH CHECK (
  owner_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own invite links"
ON public.invite_links FOR UPDATE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own invite links"
ON public.invite_links FOR DELETE
TO authenticated
USING (
  owner_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);
