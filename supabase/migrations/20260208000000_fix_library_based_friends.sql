-- Fix get_library_friends_book_progress RPC function:
-- 1. Include current user in results (remove exclusion)
-- 2. Only show members with status to_read, reading, or read
--    (exclude not_planned and members with no reading progress)

DROP FUNCTION IF EXISTS public.get_library_friends_book_progress(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_library_friends_book_progress(
  p_user_id uuid,
  p_book_id uuid
)
RETURNS TABLE(
  friend_id uuid,
  display_name text,
  avatar_url text,
  status reading_status,
  progress integer,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  review_id uuid,
  review_rating integer,
  review_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_library_id uuid;
BEGIN
  SELECT library_id INTO v_library_id
  FROM public.books
  WHERE id = p_book_id;

  RETURN QUERY
  SELECT
    lm.user_id as friend_id,
    p.display_name,
    p.avatar_url,
    rp.status,
    rp.progress,
    rp.started_at,
    rp.finished_at,
    r.id as review_id,
    r.rating as review_rating,
    r.content as review_text
  FROM public.library_members lm
  LEFT JOIN public.profiles p ON p.user_id = lm.user_id
  LEFT JOIN public.reading_progress rp
    ON rp.user_id = lm.user_id
    AND rp.book_id = p_book_id
  LEFT JOIN public.reviews r
    ON r.user_id = lm.user_id
    AND r.book_id = p_book_id
  WHERE lm.library_id = v_library_id
    AND rp.status IN ('to_read', 'reading', 'read');
END;
$$;
