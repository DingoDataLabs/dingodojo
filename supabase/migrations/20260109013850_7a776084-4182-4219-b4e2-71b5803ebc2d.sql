-- First delete all existing entries
DELETE FROM generated_modules;

-- Add difficulty_level column to generated_modules for XP-based caching
ALTER TABLE generated_modules 
ADD COLUMN difficulty_level text NOT NULL DEFAULT 'Beginning';

-- Create unique constraint to ensure one lesson per topic per difficulty level
CREATE UNIQUE INDEX unique_topic_difficulty 
ON generated_modules(topic_id, difficulty_level);