-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  grade_level TEXT DEFAULT 'Year 5',
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT DEFAULT '📚',
  color TEXT DEFAULT 'ochre',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create topics table
CREATE TABLE public.topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📖',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_modules table
CREATE TABLE public.generated_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  content_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_progress table
CREATE TABLE public.student_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, topic_id)
);

-- Create chat_messages table for AI tutor conversations
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subjects RLS policies (public read)
CREATE POLICY "Anyone can view subjects" ON public.subjects
  FOR SELECT USING (true);

-- Topics RLS policies (public read)
CREATE POLICY "Anyone can view topics" ON public.topics
  FOR SELECT USING (true);

-- Generated modules RLS policies (public read)
CREATE POLICY "Anyone can view generated modules" ON public.generated_modules
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert modules" ON public.generated_modules
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Student progress RLS policies
CREATE POLICY "Students can view their own progress" ON public.student_progress
  FOR SELECT USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can insert their own progress" ON public.student_progress
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can update their own progress" ON public.student_progress
  FOR UPDATE USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Chat messages RLS policies
CREATE POLICY "Students can view their own messages" ON public.chat_messages
  FOR SELECT USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can insert their own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'first_name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subjects
INSERT INTO public.subjects (name, slug, emoji, color) VALUES
  ('English', 'english', '📝', 'eucalyptus'),
  ('Maths', 'maths', '🔢', 'sky');

-- Insert Stage 3 English topics
INSERT INTO public.topics (subject_id, name, slug, description, emoji, order_index) VALUES
  ((SELECT id FROM public.subjects WHERE slug = 'english'), 'Reading Comprehension', 'reading-comprehension', 'Master the art of understanding texts', '📖', 1),
  ((SELECT id FROM public.subjects WHERE slug = 'english'), 'Spelling', 'spelling', 'Become a spelling champion', '🔤', 2),
  ((SELECT id FROM public.subjects WHERE slug = 'english'), 'Creative Writing', 'creative-writing', 'Unleash your imagination', '✍️', 3),
  ((SELECT id FROM public.subjects WHERE slug = 'english'), 'Grammar & Punctuation', 'grammar-punctuation', 'Build strong writing foundations', '📌', 4),
  ((SELECT id FROM public.subjects WHERE slug = 'english'), 'Vocabulary Building', 'vocabulary', 'Expand your word power', '💬', 5);

-- Insert Stage 3 Maths topics
INSERT INTO public.topics (subject_id, name, slug, description, emoji, order_index) VALUES
  ((SELECT id FROM public.subjects WHERE slug = 'maths'), 'Fractions', 'fractions', 'Master parts of a whole', '🥧', 1),
  ((SELECT id FROM public.subjects WHERE slug = 'maths'), 'Decimals', 'decimals', 'Work with decimal numbers', '🔢', 2),
  ((SELECT id FROM public.subjects WHERE slug = 'maths'), 'Multiplication & Division', 'multiplication-division', 'Build calculation skills', '✖️', 3),
  ((SELECT id FROM public.subjects WHERE slug = 'maths'), 'Geometry', 'geometry', 'Explore shapes and angles', '📐', 4),
  ((SELECT id FROM public.subjects WHERE slug = 'maths'), 'Data & Graphs', 'data-graphs', 'Interpret information visually', '📊', 5);