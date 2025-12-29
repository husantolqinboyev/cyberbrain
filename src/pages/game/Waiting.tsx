import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BrainLogo } from "@/components/BrainLogo";
import { CyberCard, CyberCardContent } from "@/components/ui/cyber-card";
import { CyberButton } from "@/components/ui/cyber-button";
import { Users, Loader2, LogOut, Trash2 } from "lucide-react";
import { useGameSession } from "@/hooks/useGameSession";
import { supabase } from "@/integrations/supabase/client";

const GameWaiting = () => {
  console.log('🎯🎯🎯 GAME WAITING COMPONENT RENDERED!');
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid") || "";
  console.log('🎯 participantId:', participantId);
  const [dots, setDots] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const navigate = useNavigate();
  const { sessionData, isLoading, updateSessionState, checkSession, leaveSession } = useGameSession();
  
  // Direct session check without useEffect dependency
  const checkAndRedirect = () => {
    console.log('🔍 DIRECT SESSION CHECK');
    console.log('🔍 Current sessionData:', sessionData);
    
    if (sessionData) {
      console.log('=== DIRECT SESSION DEBUG ===');
      console.log('Status:', sessionData.status);
      console.log('Question started at:', sessionData.questionStartedAt);
      console.log('Session ID:', sessionData.sessionId);
      console.log('Participant ID:', sessionData.participantId);
      console.log('Current question index:', sessionData.currentQuestionIndex);
      console.log('=============================');
      
      // FORCE REDIRECT - If game is already playing, navigate immediately
      if (sessionData.status === 'playing') {
        console.log('🚀🚀🚀 DIRECT CHECK - GAME IS ALREADY PLAYING - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        // Add a small delay to ensure React has processed the state
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return true; // Redirect initiated
      }
      
      // Additional check - if session has question_started_at
      if (sessionData.questionStartedAt) {
        console.log('🚀🚀🚀 DIRECT CHECK - SESSION HAS QUESTION STARTED - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return true; // Redirect initiated
      }
      
      // Check if currentQuestionIndex > 0 (game has started)
      if (sessionData.currentQuestionIndex > 0) {
        console.log('🚀🚀🚀 DIRECT CHECK - CURRENT QUESTION INDEX > 0 - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return true; // Redirect initiated
      }
      
      console.log('❌ Game not started yet, continuing to wait...');
    } else {
      console.log('❌ No session data available');
    }
    
    return false; // No redirect needed
  };

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

  // Subscribe to game session changes for realtime updates
  useEffect(() => {
    if (!sessionData?.sessionId) return;

    console.log('Setting up realtime subscription for session:', sessionData.sessionId);
    
    const channel = supabase
      .channel(`game-session-${sessionData.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionData.sessionId}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as {
              status: string;
              current_question_index: number;
              question_started_at: string | null;
              started_at: string | null;
            };
            
            console.log('Updating session state to:', newData);
            updateSessionState(
              newData.status,
              newData.current_question_index,
              newData.question_started_at
            );

            // Navigate to playing page when game starts
            if (newData.status === 'playing') {
              console.log('Game started via realtime, navigating to playing page');
              window.location.href = `/game/playing?pid=${sessionData.participantId}`;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime updates');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('Realtime connection lost, attempting to reconnect...');
          // Force refresh after connection loss
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [sessionData?.sessionId, sessionData?.participantId]); // Include participantId for navigation

  // Check session age when session data is available
  useEffect(() => {
    console.log('🔥🔥🔥 USEEFFECT TRIGGERED - sessionData changed!');
    console.log('🔥 sessionData exists:', !!sessionData);
    console.log('🔥 sessionData reference:', sessionData);
    
    if (sessionData) {
      console.log('=== SESSION DEBUG ===');
      console.log('Full session data:', sessionData);
      console.log('Status:', sessionData.status);
      console.log('Question started at:', sessionData.questionStartedAt);
      console.log('Session ID:', sessionData.sessionId);
      console.log('Participant ID:', sessionData.participantId);
      console.log('Current question index:', sessionData.currentQuestionIndex);
      console.log('==================');
      
      checkSessionAge();
      
      // FORCE REDIRECT - If game is already playing, navigate immediately
      if (sessionData.status === 'playing') {
        console.log('🚀🚀🚀 GAME IS ALREADY PLAYING - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        // Add a small delay to ensure React has processed the state
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return; // Prevent further execution
      }
      
      // Additional check - if session has question_started_at
      if (sessionData.questionStartedAt) {
        console.log('🚀🚀🚀 SESSION HAS QUESTION STARTED - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return;
      }
      
      // Check if currentQuestionIndex > 0 (game has started)
      if (sessionData.currentQuestionIndex > 0) {
        console.log('🚀🚀🚀 CURRENT QUESTION INDEX > 0 - FORCE REDIRECT!!!');
        console.log('🚀 Redirecting to:', `/game/playing?pid=${sessionData.participantId}`);
        
        setTimeout(() => {
          console.log('🚀 EXECUTING REDIRECT NOW!');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }, 100);
        
        return;
      }
      
      console.log('❌ Game not started yet, continuing to wait...');
    } else {
      console.log('❌ No session data available');
    }
  }, [sessionData]);

  // Periodic session check as backup
  useEffect(() => {
    if (!sessionData?.sessionId) return;
    
    const interval = setInterval(async () => {
      try {
        console.log('🔄 Periodic check - querying session status...');
        const { data, error } = await supabase
          .from('game_sessions')
          .select('status, started_at, question_started_at')
          .eq('id', sessionData.sessionId)
          .single();
        
        console.log('📊 Periodic check result:', { data, error });
        console.log('📊 Current local status:', sessionData.status);
        
        if (data && data.status === 'playing' && sessionData.status !== 'playing') {
          console.log('🚀 Periodic check detected game started, redirecting');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }
        
        if (data && data.question_started_at && !sessionData.questionStartedAt) {
          console.log('🚀 Periodic check detected question started, redirecting');
          window.location.href = `/game/playing?pid=${sessionData.participantId}`;
        }
      } catch (error) {
        console.error('❌ Periodic session check error:', error);
      }
    }, 2000); // Check every 2 seconds for faster response
    
    return () => clearInterval(interval);
  }, [sessionData?.sessionId, sessionData?.status, sessionData?.participantId, sessionData?.questionStartedAt]);

  // Redirect if no session
  useEffect(() => {
    if (!isLoading && !sessionData && !participantId) {
      navigate('/play');
    }
  }, [isLoading, sessionData, participantId, navigate]);

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
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <BrainLogo size="sm" />
            <span className="font-display text-lg sm:text-xl font-bold text-primary text-glow-primary">
              CYBERBRAIN
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-4">
        {/* Direct session check in render */}
        {(() => {
          console.log('🎯 RENDER TIME SESSION CHECK');
          const shouldRedirect = checkAndRedirect();
          if (shouldRedirect) {
            return null; // Don't render anything if redirecting
          }
          return null;
        })()}
        
        <CyberCard glow="primary" className="w-full max-w-md sm:max-w-lg text-center">
          <CyberCardContent className="py-8 sm:py-12">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="relative">
                <BrainLogo size="lg" animated />
                <Loader2 className="absolute -bottom-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-accent animate-spin" />
              </div>
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-bold uppercase mb-3 sm:mb-4 text-foreground">
              Kutilmoqda{dots}
            </h1>

            <p className="text-muted-foreground font-mono text-sm sm:text-base mb-6 sm:mb-8">
              O'qituvchi o'yinni boshlaguncha kuting
            </p>

            <div className="bg-muted p-4 sm:p-6 border-2 border-border">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="font-display text-xs sm:text-sm uppercase text-muted-foreground">
                  Sizning Ma'lumotlaringiz
                </span>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono text-xs sm:text-sm">PIN:</span>
                  <span className="font-mono text-lg sm:text-xl text-primary tracking-wider">
                    {sessionData?.pin || '------'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-mono text-xs sm:text-sm">Nickname:</span>
                  <span className="font-display text-base sm:text-lg text-accent">
                    {sessionData?.nickname || 'Loading...'}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-6 sm:mt-8 text-xs text-muted-foreground font-mono">
              Sahifani yopmang. O'yin boshlanganda avtomatik o'tasiz.
            </p>

            {/* Exit Button */}
            <div className="mt-4 sm:mt-6 space-y-3">
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