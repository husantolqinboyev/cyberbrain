import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardContent } from "@/components/ui/cyber-card";
import { Clock, CheckCircle, XCircle, Loader2, Trophy } from "lucide-react";
import { useGameSession } from "@/hooks/useGameSession";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  time_seconds: number;
  max_points: number;
  correct_option: number;
}

const GamePlaying = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid") || "";
  const { toast } = useToast();
  const { sessionData, isLoading, submitAnswer, updateSessionState, checkSession, getCurrentRank } = useGameSession();
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; pointsEarned: number } | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [randomMessageIndex, setRandomMessageIndex] = useState(0);
  const [currentRank, setCurrentRank] = useState<number | null>(null);

  // Random funny messages
  const waitingMessages = [
    "Tahmin bilan belgiladingizmi yoki dahomisz?",
    "Bu javob to'g'ri bo'lishi 50%...",
    "Kompyuter hisoblayapti...",
    "Sizning intellektingiz testdan o'tyapti...",
    "Natijani kutamiz...",
    "Algoritmlar ishlamoqda...",
    "Buning uchun Nobel mukofoti berish kerak!",
    "Siz g'ayrioddiy intellektni ko'rsatdingiz!",
    "Javobingiz qiziqarli bo'lishi aniq...",
    "Bu savol uchun maxsus hisoblash kerak..."
  ];

  // Update rank when score changes
  useEffect(() => {
    if (sessionData) {
      getCurrentRank().then(rank => {
        setCurrentRank(rank);
      });
    }
  }, [sessionData?.totalScore, getCurrentRank]);

  // Check session on mount
  useEffect(() => {
    if (!sessionData && !isLoading && participantId) {
      console.log('Checking session for participant:', participantId);
      checkSession(participantId);
    }
  }, [sessionData, isLoading, checkSession, participantId]);

  // Redirect if no session or game ended
  useEffect(() => {
    if (!isLoading && !sessionData) {
      navigate('/play');
      return;
    }
    if (sessionData?.status === 'finished') {
      navigate('/game/results');
    }
    if (sessionData?.status === 'waiting') {
      navigate('/game/waiting');
    }
  }, [isLoading, sessionData, navigate]);

  // Fetch current question based on session state
  const fetchCurrentQuestion = useCallback(async () => {
    if (!sessionData?.sessionId) return;

    // Get session to find block_id
    const { data: session } = await supabase
      .from('game_sessions')
      .select('block_id, current_question_index, question_started_at')
      .eq('id', sessionData.sessionId)
      .single();

    if (!session?.block_id) return;

    // Get current question
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, options, time_seconds, max_points, correct_option')
      .eq('block_id', session.block_id)
      .order('order_index')
      .range(session.current_question_index, session.current_question_index);

    if (questions && questions.length > 0) {
      const q = questions[0];
      setCurrentQuestion({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : []
      });
      
      // Reset state for new question
      setSelectedOption(null);
      setAnswerResult(null);
      setHasAnswered(false);

      // Calculate remaining time based on question_started_at
      if (session.question_started_at) {
        const startTime = new Date(session.question_started_at).getTime();
        setQuestionStartTime(startTime);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, q.time_seconds - elapsed);
        setTimeLeft(remaining);

        // Check if already answered this question
        const { data: existingAnswer } = await supabase
          .from('answers')
          .select('id, is_correct, points_earned')
          .eq('participant_id', sessionData.participantId)
          .eq('question_id', q.id)
          .single();

        if (existingAnswer) {
          setHasAnswered(true);
          setAnswerResult({
            isCorrect: existingAnswer.is_correct,
            pointsEarned: existingAnswer.points_earned
          });
        }
      }
    }
  }, [sessionData?.sessionId, sessionData?.participantId]);

  // Fetch question when session data changes
  useEffect(() => {
    if (sessionData?.status === 'playing') {
      fetchCurrentQuestion();
    }
  }, [sessionData?.status, sessionData?.currentQuestionIndex, fetchCurrentQuestion]);

  // Subscribe to game session changes
  useEffect(() => {
    if (!sessionData?.sessionId) return;

    const channel = supabase
      .channel(`game-playing-${sessionData.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionData.sessionId}`
        },
        (payload) => {
          const newData = payload.new as {
            status: string;
            current_question_index: number;
            question_started_at: string | null;
          };
          
          updateSessionState(
            newData.status,
            newData.current_question_index,
            newData.question_started_at
          );

          // Handle status changes
          if (newData.status === 'finished') {
            navigate('/game/results');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionData?.sessionId, navigate, updateSessionState]);

  // Timer countdown - persists on refresh
  useEffect(() => {
    if (timeLeft <= 0 || hasAnswered) return;

    const interval = setInterval(() => {
      // Recalculate based on server time to handle page refresh
      if (questionStartTime && currentQuestion) {
        const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
        const remaining = Math.max(0, currentQuestion.time_seconds - elapsed);
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, hasAnswered, questionStartTime, currentQuestion]);

  const handleSelectOption = async (optionIndex: number) => {
    if (hasAnswered || !currentQuestion || timeLeft <= 0) return;

    setSelectedOption(optionIndex);
    setHasAnswered(true);
    
    // Set random message when answer is submitted
    setRandomMessageIndex(Math.floor(Math.random() * waitingMessages.length));

    // Calculate response time
    const responseTimeMs = questionStartTime 
      ? Date.now() - questionStartTime 
      : currentQuestion.time_seconds * 1000;

    const result = await submitAnswer(currentQuestion.id, optionIndex, responseTimeMs);

    if (result.success) {
      setAnswerResult({
        isCorrect: result.isCorrect || false,
        pointsEarned: result.pointsEarned || 0
      });
      
      if (result.isCorrect) {
        toast({
          title: "To'g'ri!",
          description: `+${result.pointsEarned} ball`,
        });
      } else {
        toast({
          title: "Noto'g'ri",
          description: "Keyingisida omad!",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Xato",
        description: result.error || "Javob yuborishda xatolik",
        variant: "destructive"
      });
      setHasAnswered(false);
      setSelectedOption(null);
    }
  };

  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const optionColors = ['default', 'secondary', 'accent', 'destructive'] as const;

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrainLogo size="sm" />
            <span className="font-display text-lg font-bold text-primary">
              CYBERBRAIN
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-accent" />
              <span className="font-display text-lg text-accent">
                {sessionData?.totalScore || 0}
              </span>
              {currentRank && (
                <span className="font-mono text-sm text-muted-foreground ml-2">
                  #{currentRank}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="font-mono text-sm text-muted-foreground">
                {sessionData?.nickname}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Timer Bar */}
      <div className="relative z-10 h-2 bg-muted">
        <div 
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-destructive' : 'bg-accent'
          }`}
          style={{ 
            width: `${(timeLeft / (currentQuestion?.time_seconds || 30)) * 100}%` 
          }}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col p-4 max-w-3xl mx-auto w-full">
        {/* Timer and Question Number */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-sm text-muted-foreground">
            Savol {(sessionData?.currentQuestionIndex || 0) + 1}
          </span>
          <div className={`flex items-center gap-2 font-display text-2xl ${
            timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-accent'
          }`}>
            <Clock className="w-6 h-6" />
            {timeLeft}s
          </div>
        </div>

        {/* Question */}
        <CyberCard glow="primary" className="mb-6">
          <CyberCardContent className="py-8">
            <h2 className="font-display text-xl md:text-2xl text-center text-foreground">
              {currentQuestion.question_text}
            </h2>
          </CyberCardContent>
        </CyberCard>

        {/* Answer Result Overlay */}
        {hasAnswered && answerResult && (
          <div className="mb-4 text-center">
            <CyberCard glow={timeLeft <= 0 ? (answerResult.isCorrect ? 'accent' : 'primary') : 'secondary'}>
              <CyberCardContent className="py-4">
                <div className="flex items-center justify-center gap-3">
                  {timeLeft <= 0 ? (
                    answerResult.isCorrect ? (
                      <>
                        <CheckCircle className="w-8 h-8 text-accent" />
                        <span className="font-display text-xl text-accent">
                          To'g'ri! +{answerResult.pointsEarned} ball
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-8 h-8 text-destructive" />
                        <span className="font-display text-xl text-destructive">
                          Noto'g'ri
                        </span>
                      </>
                    )
                  ) : (
                    <>
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      <span className="font-display text-xl text-muted-foreground">
                        {waitingMessages[randomMessageIndex]}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground font-mono text-sm mt-2">
                  {timeLeft > 0 ? 'Vaqt tugashi kutilmoqda...' : 'Keyingi savol kutilmoqda...'}
                </p>
              </CyberCardContent>
            </CyberCard>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isDisabled = hasAnswered || timeLeft <= 0;
            
            return (
              <CyberButton
                key={index}
                variant={isSelected ? optionColors[index % 4] : 'outline'}
                className={`h-auto min-h-20 p-4 text-left whitespace-normal ${
                  isDisabled && !isSelected ? 'opacity-50' : ''
                }`}
                onClick={() => handleSelectOption(index)}
                disabled={isDisabled}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="font-display text-lg shrink-0">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="font-mono text-sm md:text-base">
                    {option}
                  </span>
                </div>
              </CyberButton>
            );
          })}
        </div>

        {/* Time's up message */}
        {timeLeft <= 0 && !hasAnswered && (
          <div className="mt-4 text-center">
            <CyberCard>
              <CyberCardContent className="py-4">
                <p className="font-display text-lg text-destructive">
                  Vaqt tugadi!
                </p>
                <p className="text-muted-foreground font-mono text-sm mt-2">
                  Keyingi savol kutilmoqda...
                </p>
              </CyberCardContent>
            </CyberCard>
          </div>
        )}
      </main>
    </div>
  );
};

export default GamePlaying;
