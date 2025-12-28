import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard, CyberCardHeader, CyberCardTitle, CyberCardContent } from "@/components/ui/cyber-card";
import { Play, SkipForward, Users, Trophy, Clock, StopCircle, Loader2, AlertCircle, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Participant {
  id: string;
  nickname: string;
  total_score: number;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  time_seconds: number;
  max_points: number;
  order_index: number;
}

interface GameSession {
  id: string;
  pin_code: string;
  status: string;
  current_question_index: number;
  question_started_at: string | null;
  block_id: string;
}

const GameControl = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [canProceed, setCanProceed] = useState(true);
  const [showResultsButton, setShowResultsButton] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Handle exit and terminate session
  const handleExit = async () => {
    setIsExiting(true);
    try {
      // Terminate the session regardless of current status
      if (session) {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            status: 'finished',
            ended_at: new Date().toISOString()
          })
          .eq('id', session.id);

        if (error) {
          console.error('Error terminating session:', error);
          toast({ 
            title: "Xato",
            description: "Sessiyani tugatishda xatolik", 
            variant: "destructive" 
          });
        } else {
          toast({ 
            title: "Sessiya tugatildi", 
            description: "Sessiya tugatildi va barcha o'quvchilar chiqarildi" 
          });
        }
      }
      
      // Navigate back to dashboard
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error('Error exiting:', error);
      toast({ 
        title: "Xato", 
        description: "Chiqishda xatolik", 
        variant: "destructive" 
      });
      // Force navigation even if there's an error
      navigate("/teacher/dashboard");
    } finally {
      setIsExiting(false);
    }
  };

  // Audio notification helper
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio creation failed:', err);
    }
  };

  // Fetch game session and related data
  useEffect(() => {
    if (!sessionId) {
      navigate("/teacher/dashboard");
      return;
    }

    const fetchData = async () => {
      // Get session
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        toast({ title: "Xato", description: "O'yin sessiyasi topilmadi", variant: "destructive" });
        navigate("/teacher/dashboard");
        return;
      }

      setSession(sessionData);

      // Get participants
      const { data: participantsData } = await supabase
        .from('participants')
        .select('id, nickname, total_score')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false });

      setParticipants(participantsData || []);

      // Get questions if block exists
      if (sessionData.block_id) {
        const { data: questionsData } = await supabase
          .from('questions')
          .select('id, question_text, options, time_seconds, max_points, order_index')
          .eq('block_id', sessionData.block_id)
          .order('order_index');

        if (questionsData) {
          setQuestions(questionsData.map(q => ({
            ...q,
            options: Array.isArray(q.options) ? q.options as string[] : []
          })));
        }
      }

      setIsLoading(false);
    };

    fetchData();

    // Subscribe to participants changes
    const participantsChannel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`
        },
        async () => {
          const { data } = await supabase
            .from('participants')
            .select('id, nickname, total_score')
            .eq('session_id', sessionId)
            .order('total_score', { ascending: false });
          setParticipants(data || []);
        }
      )
      .subscribe();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`session-control-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          setSession(payload.new as GameSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, navigate, toast]);

  // Timer countdown for current question
  useEffect(() => {
    if (!session?.question_started_at || session?.status !== 'playing' || timeLeft <= 0) return;

    const currentQuestion = questions[session.current_question_index];
    if (!currentQuestion) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(session.question_started_at).getTime()) / 1000);
      const remaining = Math.max(0, currentQuestion.time_seconds - elapsed);
      setTimeLeft(remaining);

      // Show prompt when time expires
      if (remaining === 0 && canProceed) {
        setShowNextPrompt(true);
        setCanProceed(false);
        setShowResultsButton(true);
        // Play notification sound when time expires
        playNotificationSound();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, questions, timeLeft, canProceed]);

  // Reset timer when question changes
  useEffect(() => {
    if (session?.question_started_at) {
      const currentQuestion = questions[session.current_question_index];
      if (currentQuestion) {
        setTimeLeft(currentQuestion.time_seconds);
        setShowNextPrompt(false);
        setCanProceed(true);
      }
    }
  }, [session?.current_question_index, session?.question_started_at, questions]);

  const startGame = async () => {
    if (!session || questions.length === 0) {
      toast({ title: "Xato", description: "Savollar topilmadi", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        status: 'playing',
        started_at: new Date().toISOString(),
        current_question_index: 0,
        question_started_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (error) {
      toast({ title: "Xato", description: "O'yinni boshlashda xatolik", variant: "destructive" });
      return;
    }

    // Play notification sound when game starts
    playNotificationSound();
    toast({ title: "Muvaffaqiyat", description: "O'yin boshlandi!" });
  };

  const nextQuestion = async () => {
    if (!session) return;

    // If time hasn't expired, show prompt
    if (timeLeft > 0 && canProceed) {
      setShowNextPrompt(true);
      return;
    }

    // If time has expired and results button is shown, end game
    if (showResultsButton) {
      await endGame();
      return;
    }

    proceedToNextQuestion();
  };

  const proceedToNextQuestion = async () => {
    if (!session) return;

    const nextIndex = session.current_question_index + 1;
    
    if (nextIndex >= questions.length) {
      // End game
      await endGame();
      return;
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({
        current_question_index: nextIndex,
        question_started_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (error) {
      toast({ title: "Xato", description: "Keyingi savolga o'tishda xatolik", variant: "destructive" });
    } else {
      setShowNextPrompt(false);
      setCanProceed(true);
    }
  };

  const endGame = async () => {
    if (!session) return;

    const { error } = await supabase
      .from('game_sessions')
      .update({
        status: 'finished',
        ended_at: new Date().toISOString()
      })
      .eq('id', session.id);

    if (error) {
      toast({ title: "Xato", description: "O'yinni tugatishda xatolik", variant: "destructive" });
      return;
    }

    toast({ title: "O'yin tugadi", description: "Natijalarni ko'ring" });
    
    // Navigate to results announcement page
    navigate(`/teacher/results?session=${session.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const currentQuestion = questions[session?.current_question_index || 0];

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-secondary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BrainLogo size="sm" />
            <span className="font-display text-lg font-bold text-primary text-glow-primary hidden sm:block">
              CYBERBRAIN
            </span>
            <span className="font-display text-lg font-bold text-primary text-glow-primary sm:hidden">
              CB
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right">
              <span className="text-muted-foreground font-mono text-xs sm:text-sm">PIN: </span>
              <span className="font-mono text-lg sm:text-xl text-primary tracking-wider">
                {session?.pin_code}
              </span>
            </div>
            
            {/* Exit Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <CyberButton variant="outline" size="sm" disabled={isExiting}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {isExiting ? "Chiqilmoqda..." : "Chiqish"}
                </CyberButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md mx-4">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg">Sessiyani tark etish</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    Siz haqiqatan ham sessiyani tark etmoqchimisiz? Sessiya tugatiladi va barcha o'quvchilar o'yindan chiqariladi. O'yin davom ettirib bo'lmaydi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Bekor qilish</AlertDialogCancel>
                  <AlertDialogAction onClick={handleExit} className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto">
                    Ha, sessiyani tugatish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Status Card */}
            <CyberCard glow={session?.status === 'playing' ? 'accent' : 'primary'}>
              <CyberCardHeader className="pb-2 sm:pb-6">
                <CyberCardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  O'yin Holati
                </CyberCardTitle>
              </CyberCardHeader>
              <CyberCardContent className="pt-2 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                  <div>
                    <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-1">Status</p>
                    <p className="font-display text-lg sm:text-xl uppercase">
                      {session?.status === 'waiting' && <span className="text-secondary">Kutilmoqda</span>}
                      {session?.status === 'playing' && <span className="text-accent">O'ynalmoqda</span>}
                      {session?.status === 'finished' && <span className="text-primary">Tugadi</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-1">Savol</p>
                    <p className="font-display text-lg sm:text-xl text-primary">
                      {(session?.current_question_index || 0) + 1} / {questions.length}
                    </p>
                  </div>
                </div>

                {/* Current Question Display */}
                {session?.status === 'playing' && currentQuestion && (
                  <div className="bg-muted p-3 sm:p-4 border-2 border-border mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-muted-foreground font-mono text-xs">
                        Hozirgi savol:
                      </p>
                      <div className={`flex items-center gap-2 font-display text-base sm:text-lg ${
                        timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-accent'
                      }`}>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                        {timeLeft}s
                      </div>
                    </div>
                    <p className="font-display text-sm sm:text-lg text-foreground mb-3">
                      {currentQuestion.question_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground font-mono">
                      <span><Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />{currentQuestion.time_seconds}s</span>
                      <span><Trophy className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />{currentQuestion.max_points} ball</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
                  {session?.status === 'waiting' && (
                    <CyberButton onClick={startGame} disabled={participants.length === 0 || questions.length === 0} className="w-full sm:w-auto">
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      O'yinni Boshlash
                    </CyberButton>
                  )}
                  
                  {session?.status === 'playing' && (
                    <>
                      {!showResultsButton ? (
                        <CyberButton onClick={nextQuestion} variant="secondary" className="w-full sm:w-auto">
                          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                          {(session.current_question_index + 1) >= questions.length ? "Tugatish" : "Keyingi Savol"}
                        </CyberButton>
                      ) : (
                        <CyberButton onClick={endGame} variant="accent" className="w-full sm:w-auto">
                          <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
                          Natijalarni Elon Qilish
                        </CyberButton>
                      )}
                      <CyberButton onClick={endGame} variant="destructive" className="w-full sm:w-auto">
                        <StopCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        O'yinni To'xtatish
                      </CyberButton>
                    </>
                  )}

                  {session?.status === 'finished' && (
                    <Link to="/teacher/dashboard" className="w-full sm:w-auto">
                      <CyberButton className="w-full">
                        Boshqaruv Paneliga Qaytish
                      </CyberButton>
                    </Link>
                  )}
                </div>
              </CyberCardContent>
            </CyberCard>

            {/* Questions List */}
            <CyberCard>
              <CyberCardHeader className="pb-2 sm:pb-4">
                <CyberCardTitle className="text-base sm:text-lg">Savollar Ro'yxati</CyberCardTitle>
              </CyberCardHeader>
              <CyberCardContent>
                <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
                  {questions.map((q, index) => (
                    <div 
                      key={q.id} 
                      className={`p-2 sm:p-3 border-2 ${
                        index === session?.current_question_index 
                          ? 'border-accent bg-accent/10' 
                          : index < (session?.current_question_index || 0)
                          ? 'border-muted bg-muted/50 opacity-50'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="font-mono text-xs sm:text-sm text-muted-foreground w-4 sm:w-6">
                          {index + 1}.
                        </span>
                        <span className="font-mono text-xs sm:text-sm flex-1 truncate">
                          {q.question_text}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {q.time_seconds}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CyberCardContent>
            </CyberCard>
          </div>

          {/* Participants Scoreboard */}
          <div className="lg:col-span-1">
            <CyberCard glow="secondary">
              <CyberCardHeader className="pb-2 sm:pb-4">
                <CyberCardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Ishtirokchilar ({participants.length})
                </CyberCardTitle>
              </CyberCardHeader>
              <CyberCardContent>
                <div className="space-y-2 max-h-64 sm:max-h-[500px] overflow-y-auto">
                  {participants.length === 0 ? (
                    <p className="text-muted-foreground font-mono text-xs sm:text-sm text-center py-6 sm:py-8">
                      Ishtirokchilar kutilmoqda...
                    </p>
                  ) : (
                    participants.map((p, index) => (
                      <div 
                        key={p.id} 
                        className={`flex items-center justify-between p-2 sm:p-3 border-2 ${
                          index < 3 ? 'border-accent bg-accent/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className={`font-display text-sm sm:text-lg w-4 sm:w-6 ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-amber-600' :
                            'text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-mono text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                            {p.nickname}
                          </span>
                        </div>
                        <span className="font-display text-sm sm:text-lg text-primary">
                          {p.total_score}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CyberCardContent>
            </CyberCard>
          </div>
        </div>
      </main>

      {/* Permission Prompt Modal */}
      {showNextPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <CyberCard glow="accent" className="w-full max-w-md mx-4">
            <CyberCardHeader className="pb-4">
              <CyberCardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5" />
                Keyingi Savolga O'tish
              </CyberCardTitle>
            </CyberCardHeader>
            <CyberCardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  {timeLeft > 0 
                    ? `Savol vaqti hali tugamagan (${timeLeft}s qoldi). Keyingi savolga o'tishni hohlaysizmi?`
                    : showResultsButton
                    ? "Savol vaqti tugadi. Natijalarni elon qilishni hohlaysizmi?"
                    : "Savol vaqti tugadi. Keyingi savolga o'tish uchun ruxsat bering."
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <CyberButton 
                    onClick={proceedToNextQuestion} 
                    variant="accent"
                    className="flex-1"
                  >
                    {showResultsButton ? (
                      <>
                        <Trophy className="w-4 h-4" />
                        Natijalarni Elon Qilish
                      </>
                    ) : (
                      <>
                        <SkipForward className="w-4 h-4" />
                        Keyingi Savol
                      </>
                    )}
                  </CyberButton>
                  <CyberButton 
                    onClick={() => setShowNextPrompt(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Bekor Qilish
                  </CyberButton>
                </div>
              </div>
            </CyberCardContent>
          </CyberCard>
        </div>
      )}
    </div>
  );
};

export default GameControl;
