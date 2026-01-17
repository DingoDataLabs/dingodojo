-- Drop the current view and recreate with security_invoker = true
-- This ensures the view respects the querying user's RLS policies
DROP VIEW IF EXISTS public.user_profiles;

CREATE VIEW public.user_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  first_name,
  grade_level,
  total_xp,
  current_streak,
  last_active_date,
  subscription_tier,
  missions_this_week,
  week_start_date,
  onboarding_completed,
  daily_streak,
  missions_today,
  last_mission_date,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;