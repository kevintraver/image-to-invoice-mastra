import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export const anthropicVisionTool = createTool({
  id: 'anthropic-vision',
  description:
    'Analyze invoice images and convert them to React component JSX code',
  inputSchema: z.object({
    imageBuffer: z
      .instanceof(Buffer)
      .describe('The invoice image buffer to analyze'),
    imageType: z
      .string()
      .describe('The image MIME type (e.g., image/jpeg, image/png)')
  }),
  outputSchema: z.object({
    reactComponent: z
      .string()
      .describe('The generated React component JSX code'),
    componentName: z.string().describe('The suggested component name')
  }),
  execute: async ({ context }) => {
    return await analyzeInvoiceImage(context.imageBuffer, context.imageType)
  }
})

async function analyzeInvoiceImage(
  imageBuffer: Buffer,
  imageType: string
): Promise<{ reactComponent: string; componentName: string }> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables')
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image file: empty buffer')
    }

    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `You are an expert React developer and visual designer. Analyze this invoice image and create a production-ready React component that EXACTLY REPLICATES the visual appearance of the original invoice.

PRIMARY MISSION: PIXEL-PERFECT VISUAL REPLICATION

STEP 1: COMPREHENSIVE VISUAL ANALYSIS
Perform detailed analysis of the invoice image:

Color Analysis:
- Identify ALL colors: background, text, borders, accents, highlights
- Extract exact hex color codes where possible
- Note color-coded sections, alternating row colors, brand colors
- Analyze gradients, shadows, or subtle color variations

Layout and Structure Analysis:
- Map the grid structure: identify columns, rows, sections
- Measure proportions: header/body/footer ratios, column widths
- Note alignment patterns: left/center/right positioning
- Identify visual hierarchy: title sizes, emphasis, groupings

Typography Analysis:
- Font families used (describe if cannot identify exact fonts)
- Font sizes for headers, body text, labels, numbers
- Font weights: light, normal, medium, bold, extra-bold
- Text styling: underlines, italics, all-caps, letter spacing
- Line heights and text spacing

Visual Elements Analysis:
- Borders: thickness, style (solid/dashed/dotted), colors
- Dividers and separators: horizontal/vertical lines
- Background patterns, textures, or fills
- Logos, icons, or graphical elements (describe placement and style)
- Tables: cell borders, header styling, alternating rows
- Spacing: margins, padding, gaps between elements

STEP 2: DATA EXTRACTION
Extract ALL visible information:
- Company/business details (name, address, contact info)
- Invoice metadata (number, date, due date, terms)
- Billing/shipping addresses
- Line items (descriptions, quantities, rates, amounts)
- Subtotals, taxes, discounts, totals
- Payment information, notes, terms

STEP 3: REACT COMPONENT CREATION
Create a complete, production-ready React component:

Component Structure:
- Use functional component with TypeScript-friendly props
- Organize data logically matching the original layout
- Handle missing data gracefully with fallbacks

Styling Implementation:
- Use ONLY Tailwind CSS classes for all styling
- Implement custom colors using Tailwind arbitrary values: bg-[#1a365d], text-[#2d3748]
- Create responsive grid layouts using CSS Grid (grid-cols-X) or Flexbox
- Match exact spacing with Tailwind spacing scale (p-4, m-2, gap-3, etc.)
- Replicate borders with border utilities (border-2, border-gray-300, border-dashed)
- Use typography utilities for exact font matching (text-sm, font-bold, tracking-wide)

Visual Fidelity Requirements:
- Every visual element from the original must be recreated
- Colors must match exactly (use hex codes in Tailwind format)
- Spacing and proportions must be identical
- Typography hierarchy must be preserved
- Layout structure must match the original grid/flow

Code Quality:
- Self-contained component (no external imports except React)
- Clean, readable JSX structure
- Proper semantic HTML elements
- Accessible markup where appropriate
- Efficient Tailwind class usage

CRITICAL OUTPUT FORMAT:
The component should follow this structure:
const InvoiceComponentName = () => {
  // Component implementation with pixel-perfect styling
  return (
    <div className="tailwind-classes-here">
      {/* Exact visual recreation */}
    </div>
  );
};

export default InvoiceComponentName;

QUALITY CHECKLIST:
- All text content extracted and positioned correctly
- Colors match original exactly (using custom hex values)
- Layout structure recreates original grid/flow
- Typography matches font sizes, weights, and styling
- Borders, lines, and visual elements replicated
- Spacing and proportions are identical
- Component is self-contained and renderable
- Code is clean and production-ready

OUTPUT REQUIREMENTS:
- Return JSON: {"reactComponent": "...", "componentName": "..."}
- Component must start with: const ComponentName = () => {
- Component must end with: export default ComponentName;
- Use ONLY Tailwind CSS (including arbitrary hex values)
- NO import statements, interfaces, or explanatory text
- PRIORITIZE visual accuracy - the component should look IDENTICAL to the original

REMEMBER: Your goal is to create a React component that, when rendered, is visually indistinguishable from the original invoice image!`
            }
          ]
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Anthropic Vision API')
    }

    // Try to parse the response as JSON
    let result
    try {
      result = JSON.parse(content.text)
    } catch {
      // If not JSON, assume the entire response is the React component
      result = {
        reactComponent: content.text,
        componentName: 'InvoiceComponent'
      }
    }

    if (!result.reactComponent) {
      throw new Error('No React component generated from the invoice image')
    }

    return {
      reactComponent: result.reactComponent,
      componentName: result.componentName || 'InvoiceComponent'
    }
  } catch (error) {
    throw new Error(
      `Invoice analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// Helper function for direct use in workflows
export async function generateReactComponentFromInvoice(
  imageBuffer: Buffer,
  imageType: string
): Promise<{ reactComponent: string; componentName: string }> {
  const result = await analyzeInvoiceImage(imageBuffer, imageType)
  return result
}
