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

// CSRF protection (simple token-based)
const csrfTokens = new Map<string, { token: string; expires: number }>();

const generateCSRFToken = () => {
  const token = crypto.randomUUID();
  const expires = Date.now() + (60 * 60 * 1000); // 1 hour
  csrfTokens.set(token, { token, expires });
  return token;
};

const validateCSRFToken = (token: string) => {
  const data = csrfTokens.get(token);
  if (!data || data.expires < Date.now()) {
    csrfTokens.delete(token);
    return false;
  }
  return true;
};

// Clean expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of csrfTokens.entries()) {
    if (data.expires < now) {
      csrfTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export {
  rateLimit,
  isIPAllowed,
  validateRequest,
  generateCSRFToken,
  validateCSRFToken
};
