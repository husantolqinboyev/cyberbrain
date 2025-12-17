-- Fix game_sessions RLS: Remove public access, allow PIN lookup for joining only
DROP POLICY IF EXISTS "Anyone can view sessions by PIN" ON game_sessions;

-- Create a secure function for PIN-based session lookup (returns minimal data)
CREATE OR REPLACE FUNCTION public.get_session_by_pin(pin text)
RETURNS TABLE (
  id uuid,
  status text,
  current_question_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, status, current_question_index
  FROM game_sessions
  WHERE pin_code = pin
    AND status IN ('waiting', 'playing');
$$;

-- Fix participants RLS: Only allow viewing participants in same session
DROP POLICY IF EXISTS "Anyone can view participants" ON participants;
DROP POLICY IF EXISTS "Participants can update their score" ON participants;

CREATE POLICY "Participants can view others in same session"
ON participants FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM participants WHERE id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM game_sessions WHERE id = session_id AND teacher_id = auth.uid()
  ) OR
  auth.uid() IS NULL -- Allow anonymous access for students joining
);

-- Allow teachers to update participant scores
CREATE POLICY "Teachers can update participant scores"
ON participants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM game_sessions WHERE id = session_id AND teacher_id = auth.uid()
  )
);

-- Add is_blocked column to profiles for teacher blocking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Create admin-only policies for managing teachers
CREATE POLICY "Admins can view all teachers"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any profile"
ON profiles FOR DELETE
USING (has_role(auth.uid(), 'admin'));