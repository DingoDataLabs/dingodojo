-- Add weekly tracking columns to student_progress
ALTER TABLE public.student_progress 
ADD COLUMN IF NOT EXISTS weekly_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS week_start_date date,
ADD COLUMN IF NOT EXISTS missions_this_week integer DEFAULT 0;

-- Add weekly tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS missions_this_week integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS week_start_date date;

-- Note: current_streak will now mean "consecutive weeks with 5+ missions" instead of days