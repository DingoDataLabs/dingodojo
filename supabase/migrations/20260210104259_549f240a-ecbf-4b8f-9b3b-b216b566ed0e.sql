
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Update the user_profiles view to include username
DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles WITH (security_invoker = true) AS
SELECT
  id, user_id, first_name, grade_level, total_xp, current_streak,
  daily_streak, missions_this_week, missions_today, week_start_date,
  last_active_date, last_mission_date, onboarding_completed,
  subscription_tier, created_at, updated_at, username
FROM public.profiles;

-- Create friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Friendships RLS policies
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (requester_id = public.get_my_profile_id() OR addressee_id = public.get_my_profile_id());

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (requester_id = public.get_my_profile_id());

CREATE POLICY "Users can accept friend requests"
  ON public.friendships FOR UPDATE
  USING (addressee_id = public.get_my_profile_id());

CREATE POLICY "Users can remove friendships"
  ON public.friendships FOR DELETE
  USING (requester_id = public.get_my_profile_id() OR addressee_id = public.get_my_profile_id());

-- Create activity_feed table
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('mission_complete', 'badge_earned', 'level_up')),
  subject_name text,
  topic_name text,
  xp_earned integer DEFAULT 0,
  badge_name text,
  badge_emoji text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Activity feed SELECT: self + accepted friends
CREATE POLICY "Users can view own and friends activity"
  ON public.activity_feed FOR SELECT
  USING (
    profile_id = public.get_my_profile_id()
    OR profile_id IN (
      SELECT requester_id FROM public.friendships
      WHERE addressee_id = public.get_my_profile_id() AND status = 'accepted'
    )
    OR profile_id IN (
      SELECT addressee_id FROM public.friendships
      WHERE requester_id = public.get_my_profile_id() AND status = 'accepted'
    )
  );

CREATE POLICY "Users can insert own activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (profile_id = public.get_my_profile_id());
