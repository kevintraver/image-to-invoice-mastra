import { Mastra } from '@mastra/core';
import { blogPostAgent } from './agents/blogPostAgent';
import { pdfToBlogWorkflow } from './workflow/pdfToBlogWorkflow';
import { corsMiddleware } from './middleware/cors';
import { uploadPdfRoute, healthRoute } from './routes';

// Initialize Mastra with our agent, workflow, and server configuration
export const mastra = new Mastra({
  agents: {
    blogPostAgent,
  },
  workflows: {
    pdfToBlogWorkflow,
  },
  server: {
    port: Number(process.env.PORT) || 4111, // Use environment variable or fallback
    timeout: 300000, // 5 minutes to handle larger PDFs
    middleware: [corsMiddleware],
    apiRoutes: [uploadPdfRoute, healthRoute]
  }
});

// Set development environment
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}