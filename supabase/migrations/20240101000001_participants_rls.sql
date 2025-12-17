-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read access to participants" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read access to game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow anonymous read access to answers" ON answers;

-- Allow anonymous users to read participants table for session checking
CREATE POLICY "Allow anonymous read access to participants" ON participants
  FOR SELECT USING (true);

-- Allow anonymous users to read game_sessions table for session checking
CREATE POLICY "Allow anonymous read access to game_sessions" ON game_sessions
  FOR SELECT USING (true);

-- Allow anonymous users to read answers table for checking existing answers
CREATE POLICY "Allow anonymous read access to answers" ON answers
  FOR SELECT USING (true);
