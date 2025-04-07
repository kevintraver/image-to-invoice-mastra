import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { extractTextFromPDF } from '../tools/mistralOCR';
import { blogPostAgent } from '../agents/blogPostAgent';

// Define schemas for input and outputs
const pdfInputSchema = z.object({
  pdfFile: z.instanceof(Buffer).describe('The PDF file to convert into a blog post'),
});

const extractedTextSchema = z.object({
  extractedText: z.string().describe('The text extracted from the PDF'),
});

const blogPostSchema = z.object({
  blogPost: z.string().describe('The generated blog post'),
  success: z.boolean().describe('Indicates if the blog post generation was successful'),
});

// Step 1: Extract Text from PDF
const extractTextStep = new Step({
  id: 'extract-text',
  description: 'Extracts text from the provided PDF file',
  inputSchema: pdfInputSchema,
  outputSchema: extractedTextSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: extract-text');
    const { pdfFile } = context.triggerData;
    
    if (!pdfFile || !(pdfFile instanceof Buffer)) {
      throw new Error('Invalid PDF file provided');
    }
    
    const extractedText = await extractTextFromPDF(pdfFile);
    
    if (!extractedText || extractedText.trim() === '') {
      console.error('No text could be extracted from the PDF');
      throw new Error('No text could be extracted from the provided PDF');
    }
    
    console.log(`Step extract-text: Succeeded - Extracted ${extractedText.length} characters`);
    
    return { extractedText };
  },
});

// Step 2: Primary Blog Post Generation
const generateBlogPostStep = new Step({
  id: 'generate-blog-post',
  description: 'Generates a blog post from the extracted text',
  inputSchema: extractedTextSchema,
  outputSchema: blogPostSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: generate-blog-post');
    
    // Use the same pattern that works in fallback steps to access extractedText
    // Check if extract-text step succeeded
    if (context.steps['extract-text']?.status !== 'success') {
      console.error('Step generate-blog-post: Failed - Cannot access extract-text step result');
      return { blogPost: '', success: false };
    }
    
    // Get extractedText from the successful step output
    const { extractedText } = context.steps['extract-text'].output;
    
    if (!extractedText) {
      console.error('Missing extracted text in primary generation step');
      return { blogPost: '', success: false };
    }
    
    try {
      const streamResponse = await blogPostAgent.stream([
        {
          role: 'user',
          content: `Create a professional blog post based on the following content extracted from a PDF. 
Please make sure to return a complete, well-formatted blog post:

${extractedText.substring(0, 3000)}`,
        },
      ]);

      let blogPost = '';
      
      for await (const chunk of streamResponse.textStream) {
        blogPost += chunk || '';
      }

      if (blogPost.trim().length > 50) {
        console.log(`Step generate-blog-post: Succeeded - Generated ${blogPost.length} characters`);
        return { blogPost, success: true };
      } else {
        console.warn('Step generate-blog-post: Failed - Generated content too short');
        return { blogPost: '', success: false };
      }
    } catch (error) {
      console.error('Step generate-blog-post: Failed - Error during generation:', error);
      return { blogPost: '', success: false };
    }
  },
});

// Step 3: Fallback Blog Post Generation (simpler format)
const fallbackBlogPostStep = new Step({
  id: 'fallback-blog-post',
  description: 'Attempts to generate a simpler blog post if the primary generation fails',
  inputSchema: extractedTextSchema,
  outputSchema: blogPostSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: fallback-blog-post');
    
    // Get extracted text from the extract-text step using correct context.steps pattern
    if (context.steps['extract-text']?.status !== 'success') {
      console.error('Step fallback-blog-post: Failed - Cannot access extracted text from step extract-text');
      return { blogPost: '', success: false };
    }
    
    const { extractedText } = context.steps['extract-text'].output;
    
    if (!extractedText) {
      console.error('Missing extracted text in fallback generation step');
      return { blogPost: '', success: false };
    }
    
    try {
      const simplifiedResponse = await blogPostAgent.stream([
        {
          role: 'user',
          content: `Summarize this content as a simple markdown blog post with headings:

${extractedText.substring(0, 1500)}`,
        },
      ]);

      let fallbackBlogPost = '';
      
      for await (const chunk of simplifiedResponse.textStream) {
        fallbackBlogPost += chunk || '';
      }

      if (fallbackBlogPost.trim().length > 30) {
        console.log(`Step fallback-blog-post: Succeeded - Generated ${fallbackBlogPost.length} characters`);
        return { blogPost: fallbackBlogPost, success: true };
      } else {
        console.warn('Step fallback-blog-post: Failed - Generated content too short');
        return { blogPost: '', success: false };
      }
    } catch (error) {
      console.error('Step fallback-blog-post: Failed - Error during generation:', error);
      return { blogPost: '', success: false };
    }
  },
});

// Step 4: Final Fallback (just return formatted extracted text)
const finalFallbackStep = new Step({
  id: 'final-fallback',
  description: 'Provides basic fallback content if all previous steps fail',
  inputSchema: extractedTextSchema,
  outputSchema: blogPostSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: final-fallback');
    
    // Get extracted text from the extract-text step using correct context.steps pattern
    if (context.steps['extract-text']?.status !== 'success') {
      console.error('Step final-fallback: Failed - Cannot access extracted text from step extract-text');
      return { 
        blogPost: '# Error Processing Document\n\nUnable to process the document content.', 
        success: true // Still success: true to provide *some* output
      };
    }
    
    const { extractedText } = context.steps['extract-text'].output;
    
    if (!extractedText) {
      console.error('Missing extracted text in final fallback step');
      return { 
        blogPost: '# Error Processing Document\n\nUnable to process the document content.', 
        success: true 
      };
    }
    
    const contentFallback = `# Generated Content from PDF\n\n${extractedText.substring(0, 2000)}...`;
    
    console.log('Step final-fallback: Succeeded - Generated content from raw text');
    return { blogPost: contentFallback, success: true };
  },
});

// Define the workflow with conditional branches
export const pdfToBlogWorkflow = new Workflow({
  name: 'pdf-to-blog',
  triggerSchema: pdfInputSchema,
})
  // First step: Extract text from PDF
  .step(extractTextStep)
  
  // Second step: Generate blog post (runs if text extraction succeeds)
  .then(generateBlogPostStep)
  
  // Third step: Fallback blog post (runs if primary generation fails/returns success: false)
  .then(fallbackBlogPostStep, {
    when: async ({ context }) => {
      console.log('Checking condition for step: fallback-blog-post...');
      const primaryStep = context.steps['generate-blog-post'];
      const shouldRun = !primaryStep || primaryStep.status !== 'success' || 
                        !primaryStep.output.success;
      console.log(`Condition result for fallback-blog-post: ${shouldRun}`);
      return shouldRun;
    },
  })
  
  // Fourth step: Final fallback (runs if fallback generation fails/returns success: false)
  .then(finalFallbackStep, {
    when: async ({ context }) => {
      console.log('Checking condition for step: final-fallback...');
      const fallbackStep = context.steps['fallback-blog-post'];
      
      let shouldRun: boolean;
      if (fallbackStep?.status === 'success') {
        shouldRun = !fallbackStep.output.success;
      } else {
        // If fallback step didn't run or failed, we should run the final fallback
        shouldRun = true;
      }
      
      console.log(`Condition result for final-fallback: ${shouldRun}`);
      return shouldRun;
    },
  });

// Commit the workflow
pdfToBlogWorkflow.commit();
