-- Add onboarding tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_book_created BOOLEAN NOT NULL DEFAULT false;

-- Create demo books table
CREATE TABLE IF NOT EXISTS public.demo_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  genre_slug TEXT REFERENCES public.genres(slug),
  year INTEGER,
  cover_url TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on demo_books
ALTER TABLE public.demo_books ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read demo books
CREATE POLICY "Demo books are viewable by everyone" 
ON public.demo_books FOR SELECT 
USING (true);

-- Insert The Time Machine demo book
INSERT INTO public.demo_books (
  title, author, description, genre_slug, year, 
  cover_url, file_url, file_type, language
) VALUES (
  'The Time Machine',
  'H.G. Wells',
  'A Victorian Englishman travels to the year 802,701 AD and discovers two distinct races: the peaceful Eloi and the subterranean Morlocks. A classic science fiction novel that explores social class and evolution.',
  'ficcao-cientifica',
  1895,
  'https://covers.openlibrary.org/b/id/8380863-M.jpg',
  'https://www.gutenberg.org/files/35/35-0.epub',
  'application/epub+zip',
  'en'
) ON CONFLICT DO NOTHING;
