-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- Create profiles table for teachers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nickname TEXT NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create quiz_blocks table
CREATE TABLE public.quiz_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES public.quiz_blocks(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_option INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL DEFAULT 30,
  max_points INTEGER NOT NULL DEFAULT 100,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_sessions table
CREATE TABLE public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID REFERENCES public.quiz_blocks(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  current_question_index INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- User roles RLS policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Quiz blocks RLS policies
CREATE POLICY "Teachers can view their own blocks"
ON public.quiz_blocks FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view public blocks"
ON public.quiz_blocks FOR SELECT
USING (is_public = true);

CREATE POLICY "Teachers can create their own blocks"
ON public.quiz_blocks FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own blocks"
ON public.quiz_blocks FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own blocks"
ON public.quiz_blocks FOR DELETE
USING (auth.uid() = teacher_id);

-- Questions RLS policies
CREATE POLICY "Teachers can view questions of their blocks"
ON public.questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_blocks
    WHERE id = questions.block_id
    AND (teacher_id = auth.uid() OR is_public = true)
  )
);

CREATE POLICY "Teachers can manage questions of their blocks"
ON public.questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_blocks
    WHERE id = questions.block_id
    AND teacher_id = auth.uid()
  )
);

-- Game sessions RLS policies
CREATE POLICY "Teachers can view their own sessions"
ON public.game_sessions FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their sessions"
ON public.game_sessions FOR UPDATE
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their sessions"
ON public.game_sessions FOR DELETE
USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view sessions by PIN"
ON public.game_sessions FOR SELECT
USING (true);

-- Participants RLS policies
CREATE POLICY "Anyone can view participants"
ON public.participants FOR SELECT
USING (true);

CREATE POLICY "Anyone can join a session"
ON public.participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Participants can update their score"
ON public.participants FOR UPDATE
USING (true);

-- Answers RLS policies
CREATE POLICY "Anyone can view answers"
ON public.answers FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit answers"
ON public.answers FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_blocks_updated_at
BEFORE UPDATE ON public.quiz_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nickname)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));
  
  -- Assign teacher role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'teacher');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for game sessions and participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;

-- Create indexes for better performance
CREATE INDEX idx_quiz_blocks_teacher_id ON public.quiz_blocks(teacher_id);
CREATE INDEX idx_questions_block_id ON public.questions(block_id);
CREATE INDEX idx_game_sessions_pin_code ON public.game_sessions(pin_code);
CREATE INDEX idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX idx_participants_session_id ON public.participants(session_id);
CREATE INDEX idx_answers_participant_id ON public.answers(participant_id);