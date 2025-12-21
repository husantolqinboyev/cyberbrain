import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberCard, CyberCardContent } from "@/components/ui/cyber-card";
import { CyberButton } from "@/components/ui/cyber-button";
import { Users, Loader2, LogOut, Trash2 } from "lucide-react";
import { useGameSession } from "@/hooks/useGameSession";
import { supabase } from "@/integrations/supabase/client";

const GameWaiting = () => {
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid") || "";
  const [dots, setDots] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const navigate = useNavigate();
  const { sessionData, isLoading, updateSessionState, checkSession, leaveSession } = useGameSession();

  // Handle exit from waiting room
  const handleExit = async () => {
    setIsLeaving(true);
    try {
      // Leave the session
      if (sessionData?.participantId) {
        await leaveSession();
      }
      
      // Clear localStorage
      localStorage.removeItem('gameSession');
      
      // Navigate back to play page
      navigate('/play');
    } catch (error) {
      console.error('Error exiting session:', error);
      // Force navigation even if there's an error
      localStorage.removeItem('gameSession');
      navigate('/play');
    }
  };

  // Check if session is older than 12 hours and clean up
  const checkSessionAge = () => {
    if (!sessionData?.sessionId) return;
    
    // Get session creation time from session data or check database
    const sessionCreatedTime = sessionData.questionStartedAt || Date.now();
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    
    if (Date.now() - new Date(sessionCreatedTime).getTime() > twelveHoursInMs) {
      console.log('Session is older than 12 hours, cleaning up...');
      handleExit();
    }
  };

  // Dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Check session when participantId is available
  useEffect(() => {
    if (participantId && !sessionData && !isLoading) {
      console.log('Checking session for participant:', participantId);
      checkSession(participantId);
    }
  }, [participantId, sessionData, isLoading, checkSession]);

  // Check session age when session data is available
  useEffect(() => {
    if (sessionData) {
      checkSessionAge();
    }
  }, [sessionData]);

  // Check if game should redirect to playing based on session status
  useEffect(() => {
    if (sessionData?.status === 'playing') {
      console.log('Game is playing, redirecting to playing page');
      navigate(`/game/playing?pid=${sessionData.participantId}`);
    }
  }, [sessionData?.status, sessionData?.participantId, navigate]);

  // Redirect if no session
  useEffect(() => {
    if (!isLoading && !sessionData && !participantId) {
      navigate('/play');
    }
  }, [isLoading, sessionData, participantId, navigate]);

  // Subscribe to game session changes for realtime updates
  useEffect(() => {
    if (!sessionData?.sessionId) return;

    const channel = supabase
      .channel(`game-session-${sessionData.sessionId}`)
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

          // Navigate to playing page when game starts
          if (newData.status === 'playing') {
            navigate(`/game/playing?pid=${sessionData.participantId}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionData?.sessionId, sessionData?.participantId, navigate, updateSessionState]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background cyber-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background cyber-grid flex flex-col">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b-2 border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-3">
            <BrainLogo size="sm" />
            <span className="font-display text-xl font-bold text-primary text-glow-primary">
              CYBERBRAIN
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <CyberCard glow="primary" className="w-full max-w-lg text-center">
          <CyberCardContent className="py-12">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <BrainLogo size="lg" animated />
                <Loader2 className="absolute -bottom-2 -right-2 w-8 h-8 text-accent animate-spin" />
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold uppercase mb-4 text-foreground">
              Kutilmoqda{dots}
            </h1>

            <p className="text-muted-foreground font-mono mb-8">
              O'qituvchi o'yinni boshlaguncha kuting
            </p>

            <div className="bg-muted p-6 border-2 border-border">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-display text-sm uppercase text-muted-foreground">
                  Sizning Ma'lumotlaringiz
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono text-sm">PIN:</span>
                  <span className="font-mono text-xl text-primary tracking-wider">
                    {sessionData?.pin || '------'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono text-sm">Nickname:</span>
                  <span className="font-display text-lg text-accent">
                    {sessionData?.nickname || 'Loading...'}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs text-muted-foreground font-mono">
              Sahifani yopmang. O'yin boshlanganda avtomatik o'tasiz.
            </p>

            {/* Exit Button */}
            <div className="mt-6 space-y-3">
              <CyberButton
                variant="outline"
                onClick={handleExit}
                disabled={isLeaving}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLeaving ? "Chiqilmoqda..." : "Kutishdan chiqish"}
              </CyberButton>
              
              <p className="text-xs text-muted-foreground font-mono text-center">
                12 soat ichida o'yin boshlanmasa avtomatik chiqiladi
              </p>
            </div>
          </CyberCardContent>
        </CyberCard>
      </main>
    </div>
  );
};

export default GameWaiting;