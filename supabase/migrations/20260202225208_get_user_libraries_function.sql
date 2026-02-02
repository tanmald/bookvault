-- Create RPC function to get user's libraries (owned or member of)
-- This explicitly filters to avoid any RLS caching issues

CREATE OR REPLACE FUNCTION public.get_user_libraries()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_default BOOLEAN,
  is_public BOOLEAN,
  allow_member_uploads BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    l.id,
    l.name,
    l.description,
    l.created_by,
    l.created_at,
    l.updated_at,
    l.is_default,
    l.is_public,
    l.allow_member_uploads
  FROM public.libraries l
  LEFT JOIN public.library_members lm ON lm.library_id = l.id
  WHERE 
    l.created_by = auth.uid()  -- Libraries I own
    OR lm.user_id = auth.uid()  -- Libraries where I'm a member
  ORDER BY l.is_default DESC, l.name ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_libraries() TO authenticated;
