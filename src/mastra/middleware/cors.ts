import type { Context, Next } from 'hono';

const corsOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL] 
  : ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'];

export const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header('origin');
  
  // Handle CORS
  if (origin && corsOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  } else {
    c.header('Access-Control-Allow-Origin', corsOrigins[0]);
  }
  
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight with correct status code
  if (c.req.method === 'OPTIONS') {
    return new Response('', { status: 204 });
  }
  
  await next();
};
