-- Fix participants RLS - allow joining only waiting sessions
DROP POLICY IF EXISTS "Participants can view others in same session" ON participants;
DROP POLICY IF EXISTS "Anyone can join a session" ON participants;

-- Create RPC function for joining game (validates PIN)
CREATE OR REPLACE FUNCTION public.join_game_session(
  p_pin_code text,
  p_nickname text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
BEGIN
  -- Find active waiting session with this PIN
  SELECT id INTO v_session_id
  FROM game_sessions
  WHERE pin_code = p_pin_code
    AND status = 'waiting';
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or not accepting players';
  END IF;
  
  -- Check if nickname already taken in this session
  IF EXISTS (
    SELECT 1 FROM participants 
    WHERE session_id = v_session_id AND nickname = p_nickname
  ) THEN
    RAISE EXCEPTION 'Nickname already taken in this session';
  END IF;
  
  -- Create participant
  INSERT INTO participants (session_id, nickname)
  VALUES (v_session_id, p_nickname)
  RETURNING id INTO v_participant_id;
  
  RETURN v_participant_id;
END;
$$;

-- Create RPC function for submitting answers (validates participant)
CREATE OR REPLACE FUNCTION public.submit_answer(
  p_participant_id uuid,
  p_question_id uuid,
  p_selected_option integer,
  p_response_time_ms integer
)
RETURNS TABLE (
  is_correct boolean,
  points_earned integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_option integer;
  v_max_points integer;
  v_time_limit integer;
  v_is_correct boolean;
  v_points integer;
  v_session_status text;
BEGIN
  -- Verify participant exists and session is playing
  SELECT gs.status INTO v_session_status
  FROM participants p
  JOIN game_sessions gs ON gs.id = p.session_id
  WHERE p.id = p_participant_id;
  
  IF v_session_status IS NULL THEN
    RAISE EXCEPTION 'Invalid participant';
  END IF;
  
  IF v_session_status != 'playing' THEN
    RAISE EXCEPTION 'Game is not active';
  END IF;
  
  -- Get question details
  SELECT correct_option, max_points, time_seconds
  INTO v_correct_option, v_max_points, v_time_limit
  FROM questions
  WHERE id = p_question_id;
  
  IF v_correct_option IS NULL THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  
  -- Check if already answered
  IF EXISTS (
    SELECT 1 FROM answers 
    WHERE participant_id = p_participant_id AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'Already answered this question';
  END IF;
  
  -- Calculate score
  v_is_correct := (p_selected_option = v_correct_option);
  IF v_is_correct THEN
    -- Points based on speed: faster = more points
    v_points := GREATEST(
      v_max_points - (p_response_time_ms / (v_time_limit * 10)),
      v_max_points / 4  -- minimum 25% points for correct answer
    );
  ELSE
    v_points := 0;
  END IF;
  
  -- Insert answer
  INSERT INTO answers (participant_id, question_id, selected_option, response_time_ms, is_correct, points_earned)
  VALUES (p_participant_id, p_question_id, p_selected_option, p_response_time_ms, v_is_correct, v_points);
  
  -- Update participant score
  UPDATE participants
  SET total_score = total_score + v_points
  WHERE id = p_participant_id;
  
  RETURN QUERY SELECT v_is_correct, v_points;
END;
$$;

-- Fix answers RLS - only allow viewing own answers or teacher's session
DROP POLICY IF EXISTS "Anyone can submit answers" ON answers;
DROP POLICY IF EXISTS "Anyone can view answers" ON answers;

CREATE POLICY "Participants can view own answers"
ON answers FOR SELECT
USING (
  participant_id IN (
    SELECT id FROM participants WHERE session_id IN (
      SELECT session_id FROM participants WHERE id = participant_id
    )
  )
);

CREATE POLICY "Teachers can view session answers"
ON answers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM participants p
    JOIN game_sessions gs ON gs.id = p.session_id
    WHERE p.id = answers.participant_id AND gs.teacher_id = auth.uid()
  )
);

-- No direct INSERT on answers - use submit_answer RPC
CREATE POLICY "No direct answer insert"
ON answers FOR INSERT
WITH CHECK (false);

-- Fix participants view - teachers and same-session participants only  
CREATE POLICY "Teachers can view session participants"
ON participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_sessions WHERE id = session_id AND teacher_id = auth.uid()
  )
);

-- Disable direct participant insert - use join_game_session RPC
CREATE POLICY "No direct participant insert"
ON participants FOR INSERT
WITH CHECK (false);