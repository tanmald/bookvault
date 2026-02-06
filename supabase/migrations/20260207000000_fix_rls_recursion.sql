-- Fix RLS policies after multi-library migration
-- This migration ensures all users can see their own books and library members

-- ============================================================================
-- 1. VERIFY AND FIX LIBRARY_MEMBERS DATA
-- ============================================================================

-- Ensure every library creator is a member of their own library
INSERT INTO public.library_members (library_id, user_id, role)
SELECT id, created_by, 'admin'::library_role
FROM public.libraries
ON CONFLICT (library_id, user_id) DO UPDATE SET role = 'admin';

-- ============================================================================
-- 2. FIX BOOKS RLS POLICIES
-- ============================================================================

-- Drop existing book policies that might be problematic
DROP POLICY IF EXISTS "Users can view library books" ON public.books;
DROP POLICY IF EXISTS "Require authentication for books" ON public.books;

-- Create a more permissive policy for viewing books
-- Users can see books if:
-- 1. They own the book (owner_id = auth.uid())
-- 2. They are members of the library where the book is stored
CREATE POLICY "Users can view library books"
  ON public.books FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_members.library_id = books.library_id
        AND library_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. FIX LIBRARIES RLS POLICIES
-- ============================================================================

-- Fix the SELECT policy for libraries to avoid recursion
DROP POLICY IF EXISTS "Users can view libraries" ON public.libraries;
DROP POLICY IF EXISTS "Users can view own or member libraries" ON public.libraries;

CREATE POLICY "Users can view libraries"
  ON public.libraries FOR SELECT
  USING (
    -- Users can see libraries they created
    created_by = auth.uid()
    -- Users can see libraries where they are members
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_members.library_id = libraries.id
        AND library_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. VERIFY LIBRARY_MEMBERS RLS POLICIES
-- ============================================================================

-- Drop and recreate the SELECT policy for library_members to be more explicit
DROP POLICY IF EXISTS "Members can view library members" ON public.library_members;
DROP POLICY IF EXISTS "Users can view library members" ON public.library_members;

-- Create policy that avoids recursion
CREATE POLICY "Users can view library members"
  ON public.library_members FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    -- Users can see members of libraries they own
    OR EXISTS (
      SELECT 1 FROM public.libraries
      WHERE libraries.id = library_members.library_id
        AND libraries.created_by = auth.uid()
    )
    -- Users can see other members of libraries they belong to
    -- Use a subquery that doesn't reference library_members directly
    OR library_id IN (
      SELECT lm.library_id 
      FROM public.library_members lm 
      WHERE lm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. ADD DIAGNOSTIC FUNCTION
-- ============================================================================

-- Function to help debug RLS issues
CREATE OR REPLACE FUNCTION public.debug_user_access()
RETURNS TABLE(
  user_id uuid,
  library_count bigint,
  membership_count bigint,
  book_count bigint,
  auth_uid uuid
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() as user_id,
    (SELECT count(*) FROM public.libraries WHERE created_by = auth.uid()) as library_count,
    (SELECT count(*) FROM public.library_members WHERE user_id = auth.uid()) as membership_count,
    (SELECT count(*) FROM public.books WHERE owner_id = auth.uid()) as book_count,
    auth.uid() as auth_uid
$$;
