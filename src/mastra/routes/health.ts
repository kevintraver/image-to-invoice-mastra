import type { Context } from 'hono';

export const healthRoute = {
  path: '/health',
  method: 'GET' as const,
  handler: (c: Context) => {
    return c.json({ 
      status: 'ok', 
      message: 'PDF to Blog service is running',
      version: process.env.npm_package_version || 'development'
    });
  }
};
