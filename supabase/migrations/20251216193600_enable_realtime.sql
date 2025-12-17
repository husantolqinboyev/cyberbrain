-- Enable Realtime for game_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;

-- Enable Realtime for participants table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
