-- Function to get participant session data
CREATE OR REPLACE FUNCTION get_session_participant(participant_id_param UUID)
RETURNS TABLE (
  participant_id UUID,
  nickname TEXT,
  total_score INTEGER,
  session_id UUID,
  pin_code TEXT,
  status TEXT,
  current_question_index INTEGER,
  question_started_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as participant_id,
    p.nickname,
    p.total_score,
    gs.id as session_id,
    gs.pin_code,
    gs.status,
    gs.current_question_index,
    gs.question_started_at
  FROM participants p
  JOIN game_sessions gs ON p.session_id = gs.id
  WHERE p.id = participant_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
