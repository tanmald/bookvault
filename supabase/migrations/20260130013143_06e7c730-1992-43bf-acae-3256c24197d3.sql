-- Fix: Remove overly permissive "Require authentication" RESTRICTIVE policies
-- These policies allow ANY authenticated user to query ALL records, bypassing friend-based restrictions
-- The existing owner/friend-based PERMISSIVE policies are sufficient and already require authentication

-- Drop the problematic RESTRICTIVE policies that expose data
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Require authentication for invite_links" ON public.invite_links;
DROP POLICY IF EXISTS "Require authentication for books" ON public.books;
DROP POLICY IF EXISTS "Require authentication for friendships" ON public.friendships;
DROP POLICY IF EXISTS "Require authentication for library_members" ON public.library_members;
DROP POLICY IF EXISTS "Require authentication for book_files" ON public.book_files;
DROP POLICY IF EXISTS "Require authentication for reading_progress" ON public.reading_progress;