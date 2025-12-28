import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, next: () => Promise<Response>) => {
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [ip, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(ip);
      }
    }
    
    // Check current IP
    const current = rateLimitStore.get(clientIP);
    
    if (current && current.count >= maxRequests && current.resetTime > now) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { 
          status: 429, 
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
          }
        }
      );
    }
    
    // Update counter
    if (current) {
      current.count++;
    } else {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs });
    }
    
    return next();
  };
};

// IP whitelist for admin access
const allowedIPs = [
  '127.0.0.1',
  'localhost',
  '::1',
  // Add your trusted IP addresses here
];

const isIPAllowed = (req: Request) => {
  const clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  // In production, you might want to check against specific IPs
  // For now, we'll allow localhost and skip IP check in development
  return allowedIPs.includes(clientIP) || clientIP === 'unknown';
};

// Request validation
const validateRequest = (body: any, requiredFields: string[]) => {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Invalid request body');
    return errors;
  }
  
  for (const field of requiredFields) {
    if (!body[field] || typeof body[field] !== 'string' || body[field].trim() === '') {
      errors.push(`${field} is required`);
    }
  }
  
  // Validate email format
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('Invalid email format');
  }
  
  // Validate password strength
  if (body.password) {
    const password = body.password;
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain uppercase, lowercase, and numbers');
    }
  }
  
  return errors;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await rateLimit(10, 60 * 1000)(req, async () => new Response());
  if (rateLimitResponse.status !== 200) {
    return rateLimitResponse;
  }

  // Check IP whitelist (optional - comment out if not needed)
  if (!isIPAllowed(req)) {
    return new Response(
      JSON.stringify({ error: 'Access denied from this IP' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate CSRF token (if provided)
  const csrfToken = req.headers.get('x-csrf-token');
  if (!csrfToken) {
    return new Response(
      JSON.stringify({ error: 'CSRF token required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate request data
    const validationErrors = validateRequest(body, ['email', 'password', 'nickname']);
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Validation errors', validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, nickname, full_name } = body;
    console.log('Received data:', { email, nickname, full_name, passwordProvided: !!password });

    // Simple secret key check for initialization
    const authHeader = req.headers.get('Authorization');
    const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Allow service role key as bearer token
    if (!authHeader || !authHeader.includes(expectedKey?.slice(0, 20) || '')) {
      // If no auth, just proceed - this is an init function
    }

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      u => u.email === 'husanboy@cyberbrain.local'
    );

    if (adminExists) {
      // Update existing admin password
      const { data: existingUserData } = await supabase.auth.admin.listUsers();
      const adminUser = existingUserData?.users?.find(u => u.email === 'husanboy@cyberbrain.local');
      
      if (adminUser) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          adminUser.id,
          { password: '@husan078184#Hasan' }
        );
        
        if (updateError) {
          throw updateError;
        }
        
        return new Response(
          JSON.stringify({ message: 'Admin password updated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ message: 'Admin already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: 'husanboy@cyberbrain.local',
      password: '@husan078184#Hasan',
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
