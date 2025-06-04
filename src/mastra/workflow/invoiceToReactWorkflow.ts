import { Step, Workflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { generateReactComponentFromInvoice } from '../tools/anthropicVision'
import { invoiceToReactAgent } from '../agents/invoiceToReactAgent'

// Define schemas for input and outputs
const imageInputSchema = z.object({
  imageFile: z
    .instanceof(Buffer)
    .describe('The invoice image file to convert into a React component'),
  imageType: z
    .string()
    .describe('The image MIME type (e.g., image/jpeg, image/png)')
})

const analyzedImageSchema = z.object({
  reactComponent: z.string().describe('The generated React component JSX code'),
  componentName: z.string().describe('The suggested component name')
})

const enhancedComponentSchema = z.object({
  finalComponent: z.string().describe('The enhanced React component'),
  success: z
    .boolean()
    .describe('Indicates if the component enhancement was successful')
})

// Step 1: Analyze Invoice Image
const analyzeImageStep = new Step({
  id: 'analyze-image',
  description:
    'Analyzes the invoice image and generates initial React component',
  inputSchema: imageInputSchema,
  outputSchema: analyzedImageSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: analyze-image')
    const { imageFile, imageType } = context.triggerData

    if (!imageFile || !(imageFile instanceof Buffer)) {
      throw new Error('Invalid image file provided')
    }

    if (!imageType || !imageType.startsWith('image/')) {
      throw new Error('Invalid image type provided')
    }

    const result = await generateReactComponentFromInvoice(imageFile, imageType)

    if (!result.reactComponent || result.reactComponent.trim() === '') {
      console.error('No React component could be generated from the image')
      throw new Error(
        'No React component could be generated from the provided invoice image'
      )
    }

    console.log(
      `Step analyze-image: Succeeded - Generated ${result.reactComponent.length} characters`
    )

    return {
      reactComponent: result.reactComponent,
      componentName: result.componentName
    }
  }
})

// Step 2: Enhance React Component with Agent
const enhanceComponentStep = new Step({
  id: 'enhance-component',
  description: 'Refines the React component code for production readiness',
  inputSchema: analyzedImageSchema,
  outputSchema: enhancedComponentSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: enhance-component')

    // Check if analyze-image step succeeded
    if (context.steps['analyze-image']?.status !== 'success') {
      console.error(
        'Step enhance-component: Failed - Cannot access analyze-image step result'
      )
      return { finalComponent: '', success: false }
    }

    // Get component data from the successful step output
    const { reactComponent, componentName } =
      context.steps['analyze-image'].output

    if (!reactComponent) {
      console.error('Missing React component in enhancement step')
      return { finalComponent: '', success: false }
    }

    try {
      const streamResponse = await invoiceToReactAgent.stream([
        {
          role: 'user',
          content: `REFINE this React component for production readiness while maintaining exact visual appearance:

${reactComponent}

REFINEMENT GOALS:
- Clean up and optimize Tailwind classes
- Improve code structure and readability
- Ensure consistent formatting
- Maintain ALL visual elements and styling
- Remove any redundant code

CRITICAL REQUIREMENTS:
- Start with: const ${componentName} = () => {
- End with: export default ${componentName};
- Use ONLY Tailwind CSS classes
- NO import statements or explanatory text
- DO NOT change the visual appearance
- Focus on code quality improvements only

Return ONLY the refined component code.`
        }
      ])

      let enhancedComponent = ''

      for await (const chunk of streamResponse.textStream) {
        enhancedComponent += chunk || ''
      }

      if (enhancedComponent.trim().length > 100) {
        console.log(
          `Step enhance-component: Succeeded - Refined component ${enhancedComponent.length} characters`
        )
        return { finalComponent: enhancedComponent, success: true }
      } else {
        console.warn(
          'Step enhance-component: Failed - Refined component too short'
        )
        return { finalComponent: '', success: false }
      }
    } catch (error) {
      console.error(
        'Step enhance-component: Failed - Error during refinement:',
        error
      )
      return { finalComponent: '', success: false }
    }
  }
})

// Step 3: Fallback Component Generation (simpler format)
const fallbackComponentStep = new Step({
  id: 'fallback-component',
  description: 'Generates a simplified React component if refinement fails',
  inputSchema: analyzedImageSchema,
  outputSchema: enhancedComponentSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: fallback-component')

    // Get component data from the analyze-image step
    if (context.steps['analyze-image']?.status !== 'success') {
      console.error(
        'Step fallback-component: Failed - Cannot access analyzed component from step analyze-image'
      )
      return { finalComponent: '', success: false }
    }

    const { reactComponent, componentName } =
      context.steps['analyze-image'].output

    if (!reactComponent) {
      console.error('Missing React component in fallback generation step')
      return { finalComponent: '', success: false }
    }

    try {
      const simplifiedResponse = await invoiceToReactAgent.stream([
        {
          role: 'user',
          content: `SIMPLIFY and CLEAN this React component while preserving its visual appearance:

${reactComponent.substring(0, 2000)}

SIMPLIFICATION GOALS:
- Streamline the component structure
- Remove unnecessary complexity
- Optimize Tailwind class usage
- Maintain visual accuracy
- Ensure clean, readable code

REQUIRED FORMAT:
- Start with: const ${componentName} = () => {
- End with: export default ${componentName};
- Use ONLY Tailwind CSS classes
- NO import statements or explanatory text
- Preserve all visual elements

Return ONLY the simplified component code.`
        }
      ])

      let fallbackComponent = ''

      for await (const chunk of simplifiedResponse.textStream) {
        fallbackComponent += chunk || ''
      }

      if (fallbackComponent.trim().length > 50) {
        console.log(
          `Step fallback-component: Succeeded - Generated ${fallbackComponent.length} characters`
        )
        return { finalComponent: fallbackComponent, success: true }
      } else {
        console.warn(
          'Step fallback-component: Failed - Generated component too short'
        )
        return { finalComponent: '', success: false }
      }
    } catch (error) {
      console.error(
        'Step fallback-component: Failed - Error during generation:',
        error
      )
      return { finalComponent: '', success: false }
    }
  }
})

// Step 4: Final Fallback (return original component with basic formatting)
const finalFallbackStep = new Step({
  id: 'final-fallback',
  description: 'Provides the original component if all enhancement steps fail',
  inputSchema: analyzedImageSchema,
  outputSchema: enhancedComponentSchema,
  execute: async ({ context }) => {
    console.log('Executing Step: final-fallback')

    // Get component data from the analyze-image step
    if (context.steps['analyze-image']?.status !== 'success') {
      console.error(
        'Step final-fallback: Failed - Cannot access analyzed component from step analyze-image'
      )
      return {
        finalComponent: `// Error: Unable to process invoice image
export const InvoiceComponent = () => {
  return <div>Error processing invoice</div>;
};`,
        success: true
      }
    }

    const { reactComponent, componentName } =
      context.steps['analyze-image'].output

    if (!reactComponent) {
      console.error('Missing React component in final fallback step')
      return {
        finalComponent: `// Error: Unable to process invoice image  
export const InvoiceComponent = () => {
  return <div>Error processing invoice</div>;
};`,
        success: true
      }
    }

    // Just return the original component with basic cleanup
    const cleanedComponent = `// Original component generated from invoice image
// Component Name: ${componentName}

${reactComponent}`

    console.log('Step final-fallback: Succeeded - Returned original component')
    return { finalComponent: cleanedComponent, success: true }
  }
})

// Define the workflow with conditional branches
export const invoiceToReactWorkflow = new Workflow({
  name: 'invoice-to-react',
  triggerSchema: imageInputSchema
})
  // First step: Analyze invoice image and generate React component
  .step(analyzeImageStep)

  // Second step: Refine component with agent (runs if image analysis succeeds)
  .then(enhanceComponentStep)

  // Third step: Fallback component generation (runs if refinement fails)
  .then(fallbackComponentStep, {
    when: async ({ context }) => {
      console.log('Checking condition for step: fallback-component...')
      const refineStep = context.steps['enhance-component']
      const shouldRun =
        !refineStep ||
        refineStep.status !== 'success' ||
        !refineStep.output.success
      console.log(`Condition result for fallback-component: ${shouldRun}`)
      return shouldRun
    }
  })

  // Fourth step: Final fallback (runs if fallback generation fails)
  .then(finalFallbackStep, {
    when: async ({ context }) => {
      console.log('Checking condition for step: final-fallback...')
      const fallbackStep = context.steps['fallback-component']

      let shouldRun: boolean
      if (fallbackStep?.status === 'success') {
        shouldRun = !fallbackStep.output.success
      } else {
        // If fallback step didn't run or failed, we should run the final fallback
        shouldRun = true
      }

      console.log(`Condition result for final-fallback: ${shouldRun}`)
      return shouldRun
    }
  })

// Commit the workflow
invoiceToReactWorkflow.commit()
