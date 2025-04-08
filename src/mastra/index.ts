import express from 'express';
import cors from 'cors';
import { Mastra } from '@mastra/core';
import { blogPostAgent } from './agents/blogPostAgent';
import { pdfToBlogWorkflow } from './workflow/pdfToBlogWorkflow';
import routes from '../api/routes';


const app = express();


app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'], 
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400 
}));

// Add preflight handling for all routes
app.options('*', cors()); 

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Mastra with our agent and workflow
const mastra = new Mastra({
  agents: {
    blogPostAgent,
  },
  workflows: {
    pdfToBlogWorkflow,
  }
});


process.env.NODE_ENV = 'development';

app.use('/api', routes);

// Health check endpoint 
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PDF to Blog service is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Run Express on a specific port
const expressPort = 5018;
app.listen(expressPort, () => {
  console.log(`Express server running on http://localhost:${expressPort}`);
  console.log(`PDF to Blog service is ready to convert PDFs to blog posts`);
  console.log(`API endpoint: http://localhost:${expressPort}/api/upload-pdf`);
});

export { app, mastra };