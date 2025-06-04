import type { Context } from 'hono'
import { invoiceToReactWorkflow } from '../workflow/invoiceToReactWorkflow'

// Export the handler function directly for use with registerApiRoute
export const uploadInvoiceHandler = async (c: Context) => {
  try {
    const formData = await c.req.formData()
    const imageFile = formData.get('image')

    if (!imageFile || !(imageFile instanceof File)) {
      return c.json(
        { error: 'No image file uploaded. Use key "image" in form-data.' },
        400
      )
    }

    // Validate image type
    if (!imageFile.type.startsWith('image/')) {
      return c.json(
        { error: 'Invalid file type. Please upload an image file.' },
        400
      )
    }

    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('Received invoice image, starting workflow...')

    const { start } = invoiceToReactWorkflow.createRun()
    const result = await start({
      triggerData: { imageFile: buffer, imageType: imageFile.type }
    })

    console.log('Workflow finished. Processing results...')

    let finalComponent
    let componentName = 'InvoiceComponent'
    let generatorSource = 'Unknown step'

    const steps = ['enhance-component', 'fallback-component', 'final-fallback']

    for (const step of steps) {
      if (result?.results?.[step]?.status === 'success') {
        const stepOutput = result.results[step].output

        if (stepOutput?.success !== false && stepOutput?.finalComponent) {
          finalComponent = stepOutput.finalComponent
          generatorSource = step
          console.log(`Using output from successful step: ${step}`)
          break
        }
      }
    }

    // Also check analyze-image step for component name
    if (result?.results?.['analyze-image']?.status === 'success') {
      const analyzeOutput = result.results['analyze-image'].output
      if (analyzeOutput?.componentName) {
        componentName = analyzeOutput.componentName
      }
    }

    if (!finalComponent) {
      console.error(
        'Workflow Error: No step produced a valid React component.',
        result
      )
      return c.json({ error: 'Failed to generate React component' }, 500)
    }

    const response = {
      component: {
        name: componentName,
        code: finalComponent,
        metadata: {
          source: imageFile.name,
          generatedAt: new Date().toISOString(),
          generator: `Mastra AI - ${generatorSource}`,
          imageType: imageFile.type,
          imageSizeBytes: imageFile.size
        }
      },
      model: 'anthropic-vision-v1.0',
      usage_info: {
        image_processed: true,
        image_size_bytes: imageFile.size,
        image_type: imageFile.type
      }
    }

    return c.json(response)
  } catch (error) {
    console.error(
      'API Route Error in backend/src/mastra/routes/invoice.ts:',
      error
    )
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return c.json(
      { error: `Error processing invoice image: ${errorMessage}` },
      500
    )
  }
}
