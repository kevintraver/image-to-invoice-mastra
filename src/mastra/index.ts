import { Mastra } from '@mastra/core'
import { registerApiRoute } from '@mastra/core/server'
import { blogPostAgent } from './agents/blogPostAgent'
import { invoiceToReactAgent } from './agents/invoiceToReactAgent'
import { pdfToBlogWorkflow } from './workflow/pdfToBlogWorkflow'
import { invoiceToReactWorkflow } from './workflow/invoiceToReactWorkflow'
import { uploadPdfHandler, uploadInvoiceHandler } from './routes'
import { healthRoute } from './routes/health'

export const mastra = new Mastra({
  agents: {
    blogPostAgent,
    invoiceToReactAgent
  },
  workflows: {
    pdfToBlogWorkflow,
    invoiceToReactWorkflow
  },
  server: {
    port: Number(process.env.PORT) || 4111,
    timeout: 300000,
    cors: {
      origin: process.env.FRONTEND_URL
        ? [process.env.FRONTEND_URL]
        : [
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:5173'
          ],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    apiRoutes: [
      registerApiRoute('/mastra/upload-pdf', {
        method: 'POST',
        handler: uploadPdfHandler
      }),
      registerApiRoute('/mastra/invoice', {
        method: 'POST',
        handler: uploadInvoiceHandler
      }),
      registerApiRoute('/mastra/health', {
        method: 'GET',
        handler: healthRoute
      })
    ]
  }
})

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'development'
}
