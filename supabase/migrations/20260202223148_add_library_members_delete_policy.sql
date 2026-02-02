-- Add DELETE policy for library_members table
-- This allows users to remove themselves from libraries (leave library functionality)

CREATE POLICY "Users can remove themselves from libraries"
  ON public.library_members FOR DELETE
  USING (user_id = auth.uid());

-- Also add INSERT and UPDATE policies for library member management

CREATE POLICY "Library owners and admins can add members"
  ON public.library_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.libraries
      WHERE id = library_id
      AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.library_members
      WHERE library_id = library_members.library_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Library owners and admins can update member roles"
  ON public.library_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.libraries
      WHERE id = library_id
      AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.library_members lm
      WHERE lm.library_id = library_members.library_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  );

CREATE POLICY "Library owners and admins can remove members"
  ON public.library_members FOR DELETE
  USING (
    -- Owner can remove anyone
    EXISTS (
      SELECT 1 FROM public.libraries
      WHERE id = library_id
      AND created_by = auth.uid()
    )
    OR
    -- Admin can remove members (but not other admins)
    EXISTS (
      SELECT 1 FROM public.library_members lm
      WHERE lm.library_id = library_members.library_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
      AND library_members.role = 'member'
    )
  );
