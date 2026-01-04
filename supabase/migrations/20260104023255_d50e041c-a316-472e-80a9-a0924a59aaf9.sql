-- Add subscription tier and onboarding fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'explorer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add Geography subject
INSERT INTO public.subjects (name, slug, emoji, color) VALUES 
  ('Geography', 'geography', '🌏', 'eucalyptus'),
  ('Science & Technology', 'science-technology', '🔬', 'sky'),
  ('History', 'history', '🏛️', 'ochre');

-- Add Geography topics (NSW Stage 3 curriculum)
INSERT INTO public.topics (name, slug, emoji, description, order_index, subject_id) VALUES
  ('Australia''s Place in the World', 'australia-place-world', '🗺️', 'Explore Australia''s location and connections globally', 1, (SELECT id FROM subjects WHERE slug = 'geography')),
  ('Climate and Weather', 'climate-weather', '☀️', 'Understand weather patterns and climate zones', 2, (SELECT id FROM subjects WHERE slug = 'geography')),
  ('Natural Resources', 'natural-resources', '💎', 'Learn about Earth''s precious resources', 3, (SELECT id FROM subjects WHERE slug = 'geography')),
  ('Human Impact on Environment', 'human-impact-environment', '🌱', 'Explore how humans affect the environment', 4, (SELECT id FROM subjects WHERE slug = 'geography')),
  ('Indigenous Australian Geography', 'indigenous-geography', '🦘', 'Learn about Aboriginal connections to land', 5, (SELECT id FROM subjects WHERE slug = 'geography'));

-- Add Science & Technology topics (NSW Stage 3 curriculum)
INSERT INTO public.topics (name, slug, emoji, description, order_index, subject_id) VALUES
  ('Living Things', 'living-things', '🦋', 'Explore life cycles and ecosystems', 1, (SELECT id FROM subjects WHERE slug = 'science-technology')),
  ('Physical World', 'physical-world', '⚡', 'Discover forces, energy and motion', 2, (SELECT id FROM subjects WHERE slug = 'science-technology')),
  ('Earth and Space', 'earth-space', '🚀', 'Journey through our solar system', 3, (SELECT id FROM subjects WHERE slug = 'science-technology')),
  ('Material World', 'material-world', '🧪', 'Investigate matter and chemical changes', 4, (SELECT id FROM subjects WHERE slug = 'science-technology')),
  ('Digital Systems', 'digital-systems', '💻', 'Understand computers and coding basics', 5, (SELECT id FROM subjects WHERE slug = 'science-technology'));

-- Add History topics (NSW Stage 3 curriculum)
INSERT INTO public.topics (name, slug, emoji, description, order_index, subject_id) VALUES
  ('First Australians', 'first-australians', '🎨', 'Discover Australia''s First Nations history', 1, (SELECT id FROM subjects WHERE slug = 'history')),
  ('European Exploration', 'european-exploration', '⛵', 'Learn about early European voyages', 2, (SELECT id FROM subjects WHERE slug = 'history')),
  ('Colonial Australia', 'colonial-australia', '🏘️', 'Explore Australia''s colonial period', 3, (SELECT id FROM subjects WHERE slug = 'history')),
  ('Federation and Nation', 'federation-nation', '🏛️', 'Understand how Australia became a nation', 4, (SELECT id FROM subjects WHERE slug = 'history')),
  ('Australia in World History', 'australia-world-history', '🌍', 'Australia''s role in global events', 5, (SELECT id FROM subjects WHERE slug = 'history'));