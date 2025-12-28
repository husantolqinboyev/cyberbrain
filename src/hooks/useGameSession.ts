import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GameSessionData {
  participantId: string;
  sessionId: string;
  nickname: string;
  pin: string;
  status: string;
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  totalScore: number;
}

export const useGameSession = () => {
  // Load session data from localStorage on mount
  const [sessionData, setSessionData] = useState<GameSessionData | null>(() => {
    const saved = localStorage.getItem('gameSession');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save session data to localStorage whenever it changes
  useEffect(() => {
    if (sessionData) {
      // Don't save finished games to localStorage - they should be cleared
      if (sessionData.status === 'finished') {
        console.log('Game finished, clearing session data');
        setSessionData(null);
        localStorage.removeItem('gameSession');
        return;
      }
      localStorage.setItem('gameSession', JSON.stringify(sessionData));
    } else {
      localStorage.removeItem('gameSession');
    }
  }, [sessionData]);

  // Check for existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem('gameSession');
    if (saved) {
      try {
        const savedData = JSON.parse(saved);
        if (savedData.participantId) {
          console.log('Found saved session, validating with server...');
          // Always validate saved session with server
          checkSessionWithId(savedData.participantId);
        }
      } catch (err) {
        console.error('Error parsing saved session:', err);
        localStorage.removeItem('gameSession');
      }
    }
  }, []);

  // Check for existing session on mount
  const checkSession = useCallback(async (participantId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://dwvosiwottjjixudppca.supabase.co/functions/v1/student-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get-session' })
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('No active session');
        setSessionData(null);
      } else if (data?.success) {
        setSessionData({
          participantId: data.participant.id,
          sessionId: data.gameSession.id,
          nickname: data.participant.nickname,
          pin: data.pin,
          status: data.gameSession.status,
          currentQuestionIndex: data.gameSession.current_question_index,
          questionStartedAt: data.gameSession.question_started_at,
          totalScore: data.participant.total_score
        });
      }
    } catch (err) {
      console.error('Error checking session:', err);
      setSessionData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  
  // Check session with participant ID
  const checkSessionWithId = useCallback(async (participantId: string) => {
    setIsLoading(true);
    try {
      console.log('Checking session for participant:', participantId);
      
      // Use Supabase client with service role key for direct access
      const supabaseUrl = 'https://dwvosiwottjjixudppca.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3dm9zaXdvdHRqaml4dWRwcGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkwNDg5NCwiZXhwIjoyMDgxNDgwODk0fQ.V7I1ccmN6a6Byz21xHieQk7SOyY91f3Qfy_fdije0WI'
      // Create a temporary Supabase client for direct API access
      const response = await fetch(`${supabaseUrl}/rest/v1/participants?id=eq.${participantId}&select=id,nickname,total_score,session_id,joined_at,sessions:game_sessions(*)`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Session check response:', { data, response });

      if (!response.ok || data.length === 0) {
        console.log('No active session found');
        setSessionData(null);
      } else {
        console.log('Raw API response data:', data);
        const participant = data[0];
        console.log('Participant data:', participant);
        
        if (!participant) {
          console.error('Participant is undefined');
          setSessionData(null);
          return;
        }
        
        // Try to get session data from nested game_sessions or fetch separately
        let session = null;
        
        if (participant.sessions && participant.sessions.length > 0) {
          session = participant.sessions[0];
          console.log('Found nested session data:', session);
        } else if (participant.session_id) {
          // Fetch session data separately using session_id
          console.log('Fetching session data separately for session_id:', participant.session_id);
          try {
            const sessionResponse = await fetch(`${supabaseUrl}/rest/v1/game_sessions?id=eq.${participant.session_id}`, {
              method: 'GET',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              }
            });
            const sessionData = await sessionResponse.json();
            if (sessionData && sessionData.length > 0) {
              session = sessionData[0];
              console.log('Fetched session data separately:', session);
            }
          } catch (sessionErr) {
            console.error('Error fetching session data:', sessionErr);
          }
        }
        
        if (!session) {
          console.error('No session data found');
          setSessionData(null);
          return;
        }
        
        const newSessionData = {
          participantId: participant.id,
          sessionId: session.id,
          nickname: participant.nickname,
          pin: session.pin_code,
          status: session.status,
          currentQuestionIndex: session.current_question_index,
          questionStartedAt: session.question_started_at,
          totalScore: participant.total_score
        };
        console.log('Setting session data:', newSessionData);
        setSessionData(newSessionData);
      }
    } catch (err) {
      console.error('Error checking session:', err);
      setSessionData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join a game session
  const joinSession = async (pin: string, nickname: string) => {
    setError(null);
    
    // Clear any existing session data before joining new game
    setSessionData(null);
    localStorage.removeItem('gameSession');
    
    try {
      const response = await fetch('https://dwvosiwottjjixudppca.supabase.co/functions/v1/student-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3dm9zaXdvdHRqaml4dWRwcGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkwNDg5NCwiZXhwIjoyMDgxNDgwODk0fQ.V7I1ccmN6a6Byz21xHieQk7SOyY91f3Qfy_fdije0WI`
        },
        body: JSON.stringify({ action: 'join', pin, nickname })
      });

      const data = await response.json();
      console.log('Join session response:', data);

      if (!response.ok || data?.error) {
        const errorMessage = data?.error || 'Failed to join session';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      const sessionDataToSet = {
        participantId: data.participant.id,
        sessionId: data.gameSession.id,
        nickname,
        pin,
        status: data.gameSession.status,
        currentQuestionIndex: 0,
        questionStartedAt: null,
        totalScore: 0
      };
      
      console.log('Setting session data:', sessionDataToSet);
      setSessionData(sessionDataToSet);

      return { success: true, participantId: data.participant.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join session';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Submit an answer
  const submitAnswer = async (questionId: string, selectedOption: number, responseTimeMs: number) => {
    if (!sessionData) {
      return { success: false, error: 'No active session' };
    }

    try {
      const response = await fetch('https://dwvosiwottjjixudppca.supabase.co/functions/v1/student-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3dm9zaXdvdHRqaml4dWRwcGNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkwNDg5NCwiZXhwIjoyMDgxNDgwODk0fQ.V7I1ccmN6a6Byz21xHieQk7SOyY91f3Qfy_fdije0WI`
        },
        body: JSON.stringify({ 
          action: 'submit-answer',
          participantId: sessionData.participantId,
          questionId,
          selectedOption,
          responseTimeMs
        })
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        return { success: false, error: data?.error || 'Failed to submit answer' };
      }

      // Update local score
      if (data?.pointsEarned) {
        setSessionData((prev: GameSessionData | null) => prev ? {
          ...prev,
          totalScore: prev.totalScore + data.pointsEarned
        } : null);
      }

      return { 
        success: true, 
        isCorrect: data.isCorrect,
        pointsEarned: data.pointsEarned
      };
    } catch (err) {
      return { success: false, error: 'Failed to submit answer' };
    }
  };

  // Leave the session
  const leaveSession = async () => {
    try {
      await fetch('https://dwvosiwottjjixudppca.supabase.co/functions/v1/game-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'leave' })
      });
      setSessionData(null);
    } catch (err) {
      console.error('Error leaving session:', err);
    }
  };

  // Update session data from realtime
  const updateSessionState = (status: string, currentQuestionIndex: number, questionStartedAt: string | null) => {
    setSessionData((prev: GameSessionData | null) => prev ? {
      ...prev,
      status,
      currentQuestionIndex,
      questionStartedAt
    } : null);
  };

  // Get current player's rank
  const getCurrentRank = useCallback(async (): Promise<number | null> => {
    if (!sessionData?.sessionId || !sessionData?.participantId) return null;

    try {
      const { data: participants, error } = await supabase
        .from('participants')
        .select('total_score')
        .eq('session_id', sessionData.sessionId)
        .order('total_score', { ascending: false }) as any;

      if (error || !participants) return null;

      // Find current player's rank
      const currentPlayerScore = sessionData.totalScore;
      const rank = participants.findIndex(p => p.total_score === currentPlayerScore) + 1;
      
      return rank > 0 ? rank : null;
    } catch (err) {
      console.error('Error getting rank:', err);
      return null;
    }
  }, [sessionData]);

  return {
    sessionData,
    isLoading,
    error,
    joinSession,
    submitAnswer,
    leaveSession,
    updateSessionState,
    checkSession: checkSessionWithId,
    getCurrentRank
  };
};