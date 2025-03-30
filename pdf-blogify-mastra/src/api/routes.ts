import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { pdfToBlogWorkflow } from '../mastra/workflow/pdfToBlogWorkflow';
import { File as MulterFile } from 'multer';

// Define custom request interface for file uploads
interface FileUploadRequest extends Request {
  file?: MulterFile;
}

interface ImageData {
  id: string;
  top_left_x: number;
  top_left_y: number;
  bottom_right_x: number;
  bottom_right_y: number;
  image_base64: string;
}

interface PageDimensions {
  dpi: number;
  height: number;
  width: number;
}

interface PageData {
  index: number;
  markdown: string;
  images: ImageData[];
  dimensions: PageDimensions;
  metadata?: Record<string, any>;
}

interface UsageInfo {
  pages_processed: number;
  doc_size_bytes: number;
}

interface ApiResponse {
  pages: PageData[];
  model: string;
  usage_info: UsageInfo;
}


const router = express.Router();


router.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  maxAge: 86400
}));


const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  }
});


router.post('/upload-pdf', upload.single('pdf'), async (req: FileUploadRequest, res: Response): Promise<void> => {
  try {
  
    if (!req.file) {
      res.status(400).send('No PDF file uploaded. Use key "pdf" in form-data.');
      return;
    }

    const pdf = req.file.buffer;

    console.log('Starting PDF to blog workflow...');
    
    const { start } = pdfToBlogWorkflow.createRun();
    const result = await start({ triggerData: { pdfFile: pdf } });
    
    console.log('Workflow completed. Processing results...');
    
    
    const processPdfStep = result?.results?.['process-pdf-to-blog'];
    

    if (processPdfStep?.status !== 'success' || !processPdfStep.output) {
      console.error('Blog post generation failed or has invalid result structure', JSON.stringify(result, null, 2));
      res.status(500).send('Failed to generate blog post content');
      return;
    }
    
    const blogPost = processPdfStep.output.blogPost;
    
    if (!blogPost) {
      console.error('Blog post is empty or undefined');
      res.status(500).send('Generated blog post is empty');
      return;
    }
    
    console.log('Blog post generated successfully, length:', blogPost.length);
    console.log('First 200 characters of blog post:');
    console.log(blogPost.substring(0, 200) + '...');
    
    const response: ApiResponse = {
      pages: [{
        index: 0,
        markdown: blogPost,
        images: [],
        dimensions: {
          dpi: 300,
          height: 792,
          width: 612
        },
        metadata: {
          source: req.file.originalname,
          generatedAt: new Date().toISOString(),
          generator: 'Mastra AI + Mistral OCR'
        }
      }],
      model: "mistral-ocr-v1.0",
      usage_info: {
        pages_processed: 1,
        doc_size_bytes: req.file.size
      }
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));

    res.json(response);
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).send(`Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default router;
