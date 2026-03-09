CREATE OR REPLACE FUNCTION public.search_users_by_username(search_query text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND p.username ILIKE '%' || search_query || '%'
    AND p.id != get_my_profile_id()
  LIMIT 10
$$;