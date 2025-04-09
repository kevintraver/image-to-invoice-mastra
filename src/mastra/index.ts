import { Mastra } from '@mastra/core';
import { blogPostAgent } from './agents/blogPostAgent';
import { pdfToBlogWorkflow } from './workflow/pdfToBlogWorkflow';
import { corsMiddleware } from './middleware/cors';
import { uploadPdfRoute, healthRoute } from './routes';


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
    apiRoutes: [uploadPdfRoute, healthRoute]
  }
});

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development';
}