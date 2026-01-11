-- Add daily streak tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS daily_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS missions_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_mission_date date,
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Create badges table for Champion tier users
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  emoji text NOT NULL,
  badge_type text NOT NULL, -- 'streak' | 'mastery' | 'xp'
  threshold integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_badges junction table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(profile_id, badge_id)
);

-- Enable RLS on badges tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges are public read
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
USING (true);

-- Users can view their own earned badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- System can insert badges (via edge function)
CREATE POLICY "Authenticated users can earn badges"
ON public.user_badges FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Insert default badge definitions
INSERT INTO public.badges (name, description, emoji, badge_type, threshold) VALUES
('First Steps', 'Complete your first mission', '🏃', 'streak', 1),
('Week Warrior', 'Maintain a 7-day streak', '⚡', 'streak', 7),
('Month Master', 'Maintain a 30-day streak', '🔥', 'streak', 30),
('Streak Legend', 'Maintain a 100-day streak', '🌟', 'streak', 100),
('Topic Pro', 'Master your first topic (500+ XP)', '🎯', 'mastery', 1),
('Knowledge Hunter', 'Master 5 topics', '🏹', 'mastery', 5),
('Subject Champion', 'Master 10 topics', '🏆', 'mastery', 10),
('XP Collector', 'Earn 1000 total XP', '💎', 'xp', 1000),
('XP Master', 'Earn 5000 total XP', '👑', 'xp', 5000),
('XP Legend', 'Earn 10000 total XP', '🦸', 'xp', 10000);