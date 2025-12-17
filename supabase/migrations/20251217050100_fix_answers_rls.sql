-- Enable RLS on answers table
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous read access to answers" ON answers;

-- Allow anonymous users to read answers table for checking existing answers
CREATE POLICY "Allow anonymous read access to answers" ON answers
  FOR SELECT USING (true);

-- Allow anonymous users to insert answers (for submitting answers)
CREATE POLICY "Allow anonymous insert access to answers" ON answers
  FOR INSERT WITH CHECK (true);
