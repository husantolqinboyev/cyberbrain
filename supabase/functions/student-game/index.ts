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

    console.log(`Student game action: ${action}`, { pin, nickname, participantId });

    if (action === 'join') {
      // Join game session
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('pin_code', pin)
        .eq('status', 'waiting')
        .single();

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Invalid PIN or game not waiting' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          nickname,
        })
        .select()
        .single();

      if (participantError) {
        return new Response(
          JSON.stringify({ error: 'Failed to join game' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          participant,
          gameSession: session,
          pin: session.pin_code
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-session') {
      // Get session info for participant
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select(`
          *,
          game_sessions:session_id (
            *,
            blocks:block_id (
              questions:questions (
                *
              )
            )
          )
        `)
        .eq('id', participantId)
        .single();

      if (participantError || !participant) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Participant session data:', participant);

      return new Response(
        JSON.stringify({
          success: true,
          participant: {
            id: participant.id,
            nickname: participant.nickname,
            total_score: participant.total_score
          },
          gameSession: participant.game_sessions,
          pin: participant.game_sessions.pin_code
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Student game function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
