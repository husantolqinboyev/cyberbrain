-- Update status constraint to include 'playing' instead of 'active'
ALTER TABLE public.game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_status_check;

ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('waiting', 'playing', 'finished'));
