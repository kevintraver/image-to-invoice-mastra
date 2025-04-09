import type { Context } from 'hono';
import { pdfToBlogWorkflow } from '../workflow/pdfToBlogWorkflow';

export const uploadPdfRoute = {
  path: '/api/upload-pdf',
  method: 'POST' as const,
  handler: async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const pdfFile = formData.get('pdf');
      
      if (!pdfFile || !(pdfFile instanceof File)) {
        return c.json({ error: 'No PDF file uploaded. Use key "pdf" in form-data.' }, 400);
      }
      
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('Received PDF, starting workflow...');
      
      const { start } = pdfToBlogWorkflow.createRun();
      const result = await start({ triggerData: { pdfFile: buffer } });
      
      console.log('Workflow finished. Processing results...');
      
      
      let blogPost;
      let generatorSource = 'Unknown step';
      
      const steps = ['generate-blog-post', 'fallback-blog-post', 'final-fallback'];
      
      for (const step of steps) {
        if (result?.results?.[step]?.status === 'success') {
          const stepOutput = result.results[step].output;
         
          if ((stepOutput?.success !== false) && stepOutput?.blogPost) {
            blogPost = stepOutput.blogPost;
            generatorSource = step;
            console.log(`Using output from successful step: ${step}`);
            break;
          }
        }
      }
      

      if (!blogPost) {
        console.error('Workflow Error: No step produced a valid blog post.', result);
        return c.json({ error: 'Failed to generate blog post content' }, 500);
      }
      
      const response = {
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
            source: pdfFile.name,
            generatedAt: new Date().toISOString(),
            generator: `Mastra AI - ${generatorSource}`
          }
        }],
        model: "mistral-ocr-v1.0", 
        usage_info: {
          pages_processed: 1, 
          doc_size_bytes: pdfFile.size
        }
      };
      
      return c.json(response);
    } catch (error) {
      console.error('API Route Error in backend/src/mastra/routes/pdf.ts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: `Error processing PDF: ${errorMessage}` }, 500);
    }
  }
};
