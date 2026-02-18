
-- Drop the dependent view first
DROP VIEW IF EXISTS public.user_profiles;

-- Drop deprecated columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS daily_streak;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS missions_today;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS missions_this_week;

-- Add new columns for weekly XP goal system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_xp_earned integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weekly_xp_goal integer DEFAULT 500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vacation_passes integer DEFAULT 2;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_term_replenish_date date;

-- Recreate the user_profiles view without deprecated columns, with new columns
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  id,
  user_id,
  first_name,
  grade_level,
  subscription_tier,
  total_xp,
  current_streak,
  weekly_xp_earned,
  weekly_xp_goal,
  vacation_passes,
  last_term_replenish_date,
  last_active_date,
  last_mission_date,
  week_start_date,
  onboarding_completed,
  created_at,
  updated_at,
  username
FROM public.profiles;
