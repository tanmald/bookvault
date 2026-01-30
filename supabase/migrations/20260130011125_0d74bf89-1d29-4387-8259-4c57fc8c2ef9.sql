-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own books" ON public.books;

-- Create new policy: only library admins can delete books
CREATE POLICY "Library admins can delete books" 
ON public.books 
FOR DELETE 
USING (is_library_admin(owner_id, auth.uid()));