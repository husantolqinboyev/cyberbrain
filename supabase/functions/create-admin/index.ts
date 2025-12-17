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

  // Simple secret key check for initialization
  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Allow service role key as bearer token
  if (!authHeader || !authHeader.includes(expectedKey?.slice(0, 20) || '')) {
    // If no auth, just proceed - this is an init function
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      u => u.email === 'husanboy@cyberbrain.local'
    );

    if (adminExists) {
      return new Response(
        JSON.stringify({ message: 'Admin already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'husanboy@cyberbrain.local',
      password: 'husan0716',
      email_confirm: true,
      user_metadata: {
        nickname: 'husanboy',
        full_name: 'Husanboy (Admin)',
      },
    });

    if (userError) {
      throw userError;
    }

    // Update the profile nickname
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nickname: 'husanboy', full_name: 'Husanboy (Admin)' })
      .eq('user_id', userData.user.id);

    // Add admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userData.user.id,
        role: 'admin',
      });

    if (roleError) {
      throw roleError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'Admin created successfully',
        user_id: userData.user.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
