import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // No JWT verification - allow all requests
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, pin, nickname, participantId, questionId, selectedOption, responseTimeMs } = await req.json();

    console.log(`Game session action: ${action}`, { pin, nickname, participantId });

    if (action === 'join') {
      // Validate PIN
      const { data: session, error: sessionError } = await supabase
        .rpc('get_session_by_pin', { pin });

      if (sessionError || !session || session.length === 0) {
        console.error('Session not found:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Session not found or not accepting players' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Join the game session
      const { data: newParticipantId, error: joinError } = await supabase
        .rpc('join_game_session', { p_pin_code: pin, p_nickname: nickname });

      if (joinError) {
        console.error('Join error:', joinError);
        return new Response(
          JSON.stringify({ error: joinError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Player joined successfully:', newParticipantId);

      // Set httpOnly cookie with participant data
      const sessionData = {
        participantId: newParticipantId,
        sessionId: session[0].id,
        nickname: nickname,
        pin: pin
      };

      const cookieValue = btoa(JSON.stringify(sessionData));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          participantId: newParticipantId,
          sessionId: session[0].id,
          status: session[0].status
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': `game_session=${cookieValue}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
          } 
        }
      );
    }

    if (action === 'get-session') {
      // Get session from cookie
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const gameSessionCookie = cookies['game_session'];
      
      if (!gameSessionCookie) {
        return new Response(
          JSON.stringify({ error: 'No active session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const sessionData = JSON.parse(atob(gameSessionCookie));
        
        // Verify participant still exists and get current session state
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('id, nickname, session_id, total_score')
          .eq('id', sessionData.participantId)
          .single();

        if (participantError || !participant) {
          return new Response(
            JSON.stringify({ error: 'Session expired' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current game session state
        const { data: gameSession, error: gameError } = await supabase
          .from('game_sessions')
          .select('id, status, current_question_index, question_started_at, pin_code')
          .eq('id', participant.session_id)
          .single();

        if (gameError || !gameSession) {
          return new Response(
            JSON.stringify({ error: 'Game session not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            participant,
            gameSession,
            pin: gameSession.pin_code
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid session data' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'submit-answer') {
      if (!participantId || !questionId || selectedOption === undefined || responseTimeMs === undefined) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Submit answer using RPC function (scores are calculated automatically)
      const { data: result, error: submitError } = await supabase
        .rpc('submit_answer', {
          p_participant_id: participantId,
          p_question_id: questionId,
          p_selected_option: selectedOption,
          p_response_time_ms: responseTimeMs
        });

      if (submitError) {
        console.error('Submit answer error:', submitError);
        return new Response(
          JSON.stringify({ error: submitError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Answer submitted:', result);

      return new Response(
        JSON.stringify({ 
          success: true, 
          isCorrect: result[0]?.is_correct,
          pointsEarned: result[0]?.points_earned
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'leave') {
      // Clear the cookie
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Set-Cookie': `game_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in game-session function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});