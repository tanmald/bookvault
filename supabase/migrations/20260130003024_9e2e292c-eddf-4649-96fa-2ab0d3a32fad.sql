-- Add authentication requirement to profiles table
CREATE POLICY "Require authentication for profiles"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

-- Add authentication requirement to books table
CREATE POLICY "Require authentication for books"
ON public.books FOR SELECT
USING (auth.role() = 'authenticated');

-- Add authentication requirement to friendships table
CREATE POLICY "Require authentication for friendships"
ON public.friendships FOR SELECT
USING (auth.role() = 'authenticated');

-- Add authentication requirement to library_members table
CREATE POLICY "Require authentication for library_members"
ON public.library_members FOR SELECT
USING (auth.role() = 'authenticated');

-- Add authentication requirement to book_files table
CREATE POLICY "Require authentication for book_files"
ON public.book_files FOR SELECT
USING (auth.role() = 'authenticated');

-- Add authentication requirement to invite_links table
CREATE POLICY "Require authentication for invite_links"
ON public.invite_links FOR SELECT
USING (auth.role() = 'authenticated');