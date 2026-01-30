-- Add restrictive policies to prevent authenticated users from modifying genres
-- Genres should be read-only for all authenticated users (managed by admins via migrations only)

-- Explicitly deny INSERT for regular users
CREATE POLICY "No user can insert genres"
ON public.genres
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Explicitly deny UPDATE for regular users  
CREATE POLICY "No user can update genres"
ON public.genres
FOR UPDATE
TO authenticated
USING (false);

-- Explicitly deny DELETE for regular users
CREATE POLICY "No user can delete genres"
ON public.genres
FOR DELETE
TO authenticated
USING (false);