-- Fix security: Remove any public SELECT policies on profiles and participants

-- Drop existing public select policies if any exist on profiles
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Drop existing public select policies if any exist on participants  
DROP POLICY IF EXISTS "Public can view participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can view participants" ON public.participants;
DROP POLICY IF EXISTS "Participants can view other participants in same session" ON public.participants;

-- Add question started_at column to track when each question was started (for timer persistence)
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMP WITH TIME ZONE;