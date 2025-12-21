import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Parsing request body...');
    const { email, password, nickname, full_name } = await req.json();
    console.log('Received data:', { email, nickname, full_name, passwordProvided: !!password });

    if (!email || !password || !nickname) {
      console.log('Missing required fields:', { email: !!email, password: !!password, nickname: !!nickname });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating teacher user...');
    // Create teacher user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nickname,
        full_name,
      },
    });

    if (userError) {
      console.error('User creation error:', userError);
      throw userError;
    }

    console.log('User created successfully:', userData.user.id);

    console.log('Updating profile...');
    // Update the profile - use insert since user_id is unique
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ 
        user_id: userData.user.id,
        nickname, 
        full_name 
      });

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
    }

    console.log('Adding teacher role...');
    // Add teacher role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userData.user.id,
        role: 'teacher',
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw roleError;
    }

    console.log('Teacher created successfully');
    return new Response(
      JSON.stringify({ 
        message: 'Teacher created successfully',
        user_id: userData.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create teacher error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
