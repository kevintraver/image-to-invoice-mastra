import type { Context } from 'hono';

export const uploadPdfRoute = {
  path: '/upload-pdf',
  method: 'POST' as const,
  handler: async (c: Context) => {
    try {
      const formData = await c.req.formData();
      const pdfFile = formData.get('pdf');
      
      if (!pdfFile || !(pdfFile instanceof File)) {
        return c.json({ error: 'No PDF file uploaded. Use key "pdf" in form-data.' }, 400);
      }
      
      // Convert File to Buffer
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('Received PDF, starting workflow...');
      
      // Get instance of mastra
      const mastraInstance = c.get('mastra');
      
      // Start the workflow
      const { start } = mastraInstance.getWorkflow('pdfToBlogWorkflow').createRun();
      const result = await start({ triggerData: { pdfFile: buffer } });
      
      console.log('Workflow finished. Processing results...');
      
      // Check which step succeeded and get its output
      let blogPost;
      let generatorSource = 'Unknown step';
      
      // Try to get result from each step in order of preference
      const steps = ['generate-blog-post', 'fallback-blog-post', 'final-fallback'];
      
      for (const step of steps) {
        if (result?.results?.[step]?.status === 'success') {
          const stepOutput = result.results[step].output;
          // We need to check both the success flag AND if blogPost exists
          if ((stepOutput?.success !== false) && stepOutput?.blogPost) {
            blogPost = stepOutput.blogPost;
            generatorSource = step;
            console.log(`Using output from successful step: ${step}`);
            break;
          }
        }
      }
      
      // If no successful step was found
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
      console.error('API Route Error in /api/upload-pdf:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: `Error processing PDF: ${errorMessage}` }, 500);
    }
  }
};
