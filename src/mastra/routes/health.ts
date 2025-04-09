import type { Context } from 'hono';

// Export the handler function directly for use with registerApiRoute
export const healthRoute = (c: Context) => {
  return c.json({ 
    status: 'ok', 
    message: 'PDF to Blog service is running',
    version: process.env.npm_package_version || 'development'
  });
};
