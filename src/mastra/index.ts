import { Mastra } from '@mastra/core';
import { registerApiRoute } from '@mastra/core/server';
import { blogPostAgent } from './agents/blogPostAgent';
import { pdfToBlogWorkflow } from './workflow/pdfToBlogWorkflow';
import { corsMiddleware } from './middleware/cors';
import { uploadPdfRoute } from './routes/pdf';
import { healthRoute } from './routes/health';

export const mastra = new Mastra({
  agents: {
    blogPostAgent,
  },
  workflows: {
    pdfToBlogWorkflow,
  },
  server: {
    port: Number(process.env.PORT) || 4111, 
    timeout: 300000, 
    middleware: [corsMiddleware],
    apiRoutes: [
      registerApiRoute('/upload-pdf', { 
        method: 'POST',
        handler: uploadPdfRoute.handler
      }),
      registerApiRoute('/health', {
        method: 'GET',
        handler: healthRoute
      })
    ]
  }
});

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}