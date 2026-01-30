-- Create a function to get friends with their profiles in a single query
-- This replaces the need for 2 separate queries in useFriends hook

CREATE OR REPLACE FUNCTION public.get_friends_with_profiles(p_user_id UUID)
RETURNS TABLE (
  friendship_id UUID,
  friend_user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  friendship_created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS friendship_id,
    CASE WHEN f.user_id = p_user_id THEN f.friend_id ELSE f.user_id END AS friend_user_id,
    p.display_name,
    p.avatar_url,
    f.created_at AS friendship_created_at
  FROM friendships f
  LEFT JOIN profiles p ON p.user_id = CASE WHEN f.user_id = p_user_id THEN f.friend_id ELSE f.user_id END
  WHERE f.user_id = p_user_id OR f.friend_id = p_user_id;
$$;

-- Create a function to get library members with their profiles in a single query
-- This replaces the need for 2 separate queries in useLibraryMembers hook

CREATE OR REPLACE FUNCTION public.get_library_members_with_profiles(p_library_owner_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lm.id AS member_id,
    lm.user_id,
    lm.role::TEXT,
    lm.created_at AS joined_at,
    p.display_name,
    p.avatar_url
  FROM library_members lm
  LEFT JOIN profiles p ON p.user_id = lm.user_id
  WHERE lm.library_owner_id = p_library_owner_id;
$$;
