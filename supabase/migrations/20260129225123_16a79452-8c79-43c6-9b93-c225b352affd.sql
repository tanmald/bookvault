-- Create profiles table for additional user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create genres/categories table
CREATE TABLE public.genres (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on genres
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Genres are readable by all authenticated users
CREATE POLICY "Genres are viewable by authenticated users"
ON public.genres FOR SELECT TO authenticated USING (true);

-- Insert default genres
INSERT INTO public.genres (name, slug) VALUES
    ('Ficção', 'ficcao'),
    ('Não-Ficção', 'nao-ficcao'),
    ('Romance', 'romance'),
    ('Fantasia', 'fantasia'),
    ('Ficção Científica', 'ficcao-cientifica'),
    ('Mistério', 'misterio'),
    ('Thriller', 'thriller'),
    ('Horror', 'horror'),
    ('Biografia', 'biografia'),
    ('História', 'historia'),
    ('Ciência', 'ciencia'),
    ('Tecnologia', 'tecnologia'),
    ('Autoajuda', 'autoajuda'),
    ('Poesia', 'poesia'),
    ('Drama', 'drama');

-- Create books table
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    genre_id UUID REFERENCES public.genres(id) ON DELETE SET NULL,
    year INTEGER,
    cover_url TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    isbn TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create book_tags table
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(name, owner_id)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create book_tags junction table
CREATE TABLE public.book_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(book_id, tag_id)
);

-- Enable RLS on book_tags
ALTER TABLE public.book_tags ENABLE ROW LEVEL SECURITY;

-- Create invite links table
CREATE TABLE public.invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invite_links
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- Create friendships table (for accepted invites)
CREATE TABLE public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_link_id UUID REFERENCES public.invite_links(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- Enable RLS on friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Create reading status enum
CREATE TYPE public.reading_status AS ENUM ('to_read', 'reading', 'read');

-- Create reading progress table
CREATE TABLE public.reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    status reading_status NOT NULL DEFAULT 'to_read',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, book_id)
);

-- Enable RLS on reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, book_id)
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Helper function to check if users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1 UUID, user2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.friendships
        WHERE (user_id = user1 AND friend_id = user2)
           OR (user_id = user2 AND friend_id = user1)
    )
$$;

-- Books RLS policies
CREATE POLICY "Users can view their own books"
ON public.books FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can view friends' books"
ON public.books FOR SELECT
TO authenticated
USING (public.are_friends(auth.uid(), owner_id));

CREATE POLICY "Users can insert their own books"
ON public.books FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own books"
ON public.books FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own books"
ON public.books FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Tags RLS policies
CREATE POLICY "Users can view their own tags"
ON public.tags FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own tags"
ON public.tags FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own tags"
ON public.tags FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Book_tags RLS policies
CREATE POLICY "Users can view their book tags"
ON public.book_tags FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.books WHERE id = book_id AND owner_id = auth.uid()
));

CREATE POLICY "Users can manage their book tags"
ON public.book_tags FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.books WHERE id = book_id AND owner_id = auth.uid()
));

CREATE POLICY "Users can delete their book tags"
ON public.book_tags FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.books WHERE id = book_id AND owner_id = auth.uid()
));

-- Invite links RLS policies
CREATE POLICY "Users can view their own invite links"
ON public.invite_links FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can create invite links"
ON public.invite_links FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own invite links"
ON public.invite_links FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own invite links"
ON public.invite_links FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Friendships RLS policies
CREATE POLICY "Users can view their friendships"
ON public.friendships FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friendships"
ON public.friendships FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their friendships"
ON public.friendships FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Reading progress RLS policies
CREATE POLICY "Users can view their own reading progress"
ON public.reading_progress FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' reading progress"
ON public.reading_progress FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = book_id
        AND public.are_friends(auth.uid(), b.owner_id)
    )
);

CREATE POLICY "Users can manage their reading progress"
ON public.reading_progress FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their reading progress"
ON public.reading_progress FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their reading progress"
ON public.reading_progress FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Reviews RLS policies
CREATE POLICY "Users can view their own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view friends' reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (
    public.are_friends(auth.uid(), user_id)
);

CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at
    BEFORE UPDATE ON public.reading_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for books and covers
INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for books bucket
CREATE POLICY "Users can upload their own books"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own books"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Friends can download books"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'books' 
    AND public.are_friends(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can delete their own books"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for covers bucket (public)
CREATE POLICY "Covers are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "Users can upload their own covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket (public)
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);