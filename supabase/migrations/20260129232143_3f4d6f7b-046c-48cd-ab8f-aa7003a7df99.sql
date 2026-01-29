-- Create book_files table for multi-language support
CREATE TABLE public.book_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'pt',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.book_files ENABLE ROW LEVEL SECURITY;

-- Users can view their book files
CREATE POLICY "Users can view their book files"
  ON public.book_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = book_files.book_id 
    AND books.owner_id = auth.uid()
  ));

-- Users can view friends' book files
CREATE POLICY "Users can view friends book files"
  ON public.book_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = book_files.book_id 
    AND are_friends(auth.uid(), books.owner_id)
  ));

-- Users can insert files for their books
CREATE POLICY "Users can insert their book files"
  ON public.book_files FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = book_files.book_id 
    AND books.owner_id = auth.uid()
  ));

-- Users can delete their book files
CREATE POLICY "Users can delete their book files"
  ON public.book_files FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = book_files.book_id 
    AND books.owner_id = auth.uid()
  ));

-- Migrate existing book files to the new table
INSERT INTO public.book_files (book_id, language, file_url, file_type, file_size)
SELECT id, 'pt', file_url, file_type, file_size 
FROM public.books 
WHERE file_url IS NOT NULL;