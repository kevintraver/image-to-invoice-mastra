import { Step, Workflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { extractTextFromPDF } from '../tools/mistralOCR';
import { blogPostAgent } from '../agents/blogPostAgent';

const pdfInputSchema = z.object({
  pdfFile: z.instanceof(Buffer).describe('The PDF file to convert into a blog post'),
});

const blogPostSchema = z.object({
  blogPost: z.string().describe('The generated blog post'),
});

const processPDFToBlogStep = new Step({
  id: 'process-pdf-to-blog',
  description: 'Extracts text from PDF and generates a blog post in one step',
  inputSchema: pdfInputSchema,
  outputSchema: blogPostSchema,
  execute: async ({ context }) => {
    const triggerData = context?.triggerData;
    if (!triggerData?.pdfFile) {
      throw new Error('PDF file not provided');
    }
    
    // First extract the text using the direct function
    console.log('Extracting text from PDF...');
    const extractedText = await extractTextFromPDF(triggerData.pdfFile);
    console.log(`Text extraction complete. Length: ${extractedText.length}`);
    
    if (!extractedText || extractedText.trim() === '') {
      console.error('No text extracted from PDF');
      throw new Error('No text could be extracted from the provided PDF');
    }
    
    
    console.log('Sample of extracted text:', extractedText.substring(0, 200) + '...');
    
    
    console.log('Generating blog post...');
    try {
      
      const streamResponse = await blogPostAgent.stream([
        {
          role: 'user',
          content: `Create a professional blog post based on the following content extracted from a PDF. 
Please make sure to return a complete, well-formatted blog post:

${extractedText.substring(0, 3000)}`
        }
      ]);

  
      let blogPost = '';
      console.log('Collecting response stream...');
      
      try {
        for await (const chunk of streamResponse.textStream) {
       
          blogPost += chunk || '';
        }
      } catch (streamError) {
        console.error('Error collecting stream:', streamError);
      }
      
      console.log('Blog post generation complete.');
      
     
      if (blogPost && blogPost.trim().length > 10) {
        console.log(`Generated blog post length: ${blogPost.length}`);
        
     
        console.log('\n========== FULL BLOG POST CONTENT ==========');
        console.log(blogPost);
        console.log('===========================================\n');
        
        return { blogPost };
      } 
      
     
      console.error('WARNING: Generated blog post is empty or too short!');
      
      
      console.log('Attempting simplified prompt...');
      
      const simplifiedResponse = await blogPostAgent.stream([
        {
          role: 'user',
          content: `Summarize this content as a simple markdown blog post with headings:
${extractedText.substring(0, 1500)}`
        }
      ]);
      
      let fallbackBlogPost = '';
      try {
        for await (const chunk of simplifiedResponse.textStream) {
          fallbackBlogPost += chunk || '';
        }
      } catch (fallbackError) {
        console.error('Error collecting fallback stream:', fallbackError);
      }
      
      
      if (fallbackBlogPost && fallbackBlogPost.trim().length > 10) {
        console.log('Fallback succeeded. Content length:', fallbackBlogPost.length);
        
        console.log('\n========== FULL FALLBACK BLOG POST ==========');
        console.log(fallbackBlogPost);
        console.log('=============================================\n');
        
        return { blogPost: fallbackBlogPost };
      }
      
     
      console.log('Using final fallback content');
      const contentFallback = `# Generated Content from PDF\n\n${extractedText.substring(0, 2000)}...`;
      
      
      console.log('\n========== FALLBACK CONTENT ==========');
      console.log(contentFallback);
      console.log('=====================================\n');
      
      return { blogPost: contentFallback };
      
    } catch (error) {
      console.error('Error generating blog post:', error);
      const fallbackBlogPost = `# PDF Content\n\n${extractedText.substring(0, 3000)}...`;
      console.log('Using fallback content due to error');
      
      
      console.log('\n========== ERROR FALLBACK CONTENT ==========');
      console.log(fallbackBlogPost);
      console.log('==========================================\n');
      
      return { blogPost: fallbackBlogPost };
    }
  },
});

// Define the workflow
export const pdfToBlogWorkflow = new Workflow({
  name: 'pdf-to-blog',
  triggerSchema: pdfInputSchema,
})
  .step(processPDFToBlogStep);

pdfToBlogWorkflow.commit();
