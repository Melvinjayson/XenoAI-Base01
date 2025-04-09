/**
 * Diagram Generator
 * 
 * This module provides functions to generate SVG diagrams from conversation content
 * using LLM-powered generation.
 */

import { generateCompletion, generateStructuredCompletion } from './ai-service';

/**
 * Creates an SVG flowchart diagram based on conversation context
 */
export async function createSvgFlowchart(
  content: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    colorScheme?: 'light' | 'dark' | 'colorful';
  } = {}
): Promise<string> {
  const { width = 800, height = 600, title = 'Process Flowchart', colorScheme = 'light' } = options;
  
  // Prepare system prompt
  const systemPrompt = `You are a diagram generation assistant that creates SVG flowcharts. 
Generate a clear, well-structured SVG flowchart based on the content provided.
Follow these requirements:
- Use standard flowchart symbols (rectangles for processes, diamonds for decisions, etc.)
- Create a flowchart with width=${width} and height=${height}
- Use ${colorScheme} color scheme
- Include the title "${title}" at the top
- Ensure the SVG is valid and renders correctly
- Use <svg> tag with appropriate namespaces
- Include reasonable padding and spacing
- Add clean arrows connecting related steps
- Keep the design professional and readable
- Return ONLY the SVG code with no explanations`;

  try {
    const svgContent = await generateCompletion(
      content,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );
    
    return extractSvgFromText(svgContent);
  } catch (error) {
    console.error('Error generating flowchart SVG:', error);
    throw new Error('Failed to generate flowchart diagram');
  }
}

/**
 * Creates an SVG entity relationship diagram based on conversation context
 */
export async function createSvgEntityDiagram(
  content: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    colorScheme?: 'light' | 'dark' | 'colorful';
  } = {}
): Promise<string> {
  const { width = 800, height = 600, title = 'Entity Relationship Diagram', colorScheme = 'light' } = options;
  
  // Prepare system prompt
  const systemPrompt = `You are a diagram generation assistant that creates SVG entity relationship diagrams. 
Generate a clear, well-structured SVG entity relationship diagram based on the content provided.
Follow these requirements:
- Extract entities and their relationships from the provided content
- Create a diagram with width=${width} and height=${height}
- Use ${colorScheme} color scheme
- Include the title "${title}" at the top
- Use rectangles for entities with their attributes listed inside
- Use lines with appropriate cardinality notation (1, N, 0..1, etc.) for relationships
- Ensure the SVG is valid and renders correctly
- Use <svg> tag with appropriate namespaces
- Include reasonable padding and spacing
- Keep the design professional and readable
- Return ONLY the SVG code with no explanations`;

  try {
    const svgContent = await generateCompletion(
      content,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );
    
    return extractSvgFromText(svgContent);
  } catch (error) {
    console.error('Error generating ER diagram SVG:', error);
    throw new Error('Failed to generate entity relationship diagram');
  }
}

/**
 * Creates an SVG mind map diagram based on conversation context
 */
export async function createSvgMindMap(
  content: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    colorScheme?: 'light' | 'dark' | 'colorful';
  } = {}
): Promise<string> {
  const { width = 800, height = 600, title = 'Mind Map', colorScheme = 'colorful' } = options;
  
  // Prepare system prompt
  const systemPrompt = `You are a diagram generation assistant that creates SVG mind maps. 
Generate a clear, well-structured SVG mind map based on the content provided.
Follow these requirements:
- Extract key concepts and their relationships from the provided content
- Create a mind map with width=${width} and height=${height}
- Use ${colorScheme} color scheme with distinct colors for different branches
- Include the title "${title}" at the top
- Use circles or rounded rectangles for concepts
- Connect related concepts with curved lines
- Organize hierarchically with the main concept in the center
- Ensure the SVG is valid and renders correctly
- Use <svg> tag with appropriate namespaces
- Include reasonable padding and spacing
- Keep the design professional and readable
- Return ONLY the SVG code with no explanations`;

  try {
    const svgContent = await generateCompletion(
      content,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );
    
    return extractSvgFromText(svgContent);
  } catch (error) {
    console.error('Error generating mind map SVG:', error);
    throw new Error('Failed to generate mind map diagram');
  }
}

/**
 * Creates an SVG sequence diagram based on conversation context
 */
export async function createSvgSequenceDiagram(
  content: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    colorScheme?: 'light' | 'dark' | 'colorful';
  } = {}
): Promise<string> {
  const { width = 800, height = 600, title = 'Sequence Diagram', colorScheme = 'light' } = options;
  
  // Prepare system prompt
  const systemPrompt = `You are a diagram generation assistant that creates SVG sequence diagrams. 
Generate a clear, well-structured SVG sequence diagram based on the content provided.
Follow these requirements:
- Extract actors/objects and their interactions over time from the provided content
- Create a sequence diagram with width=${width} and height=${height}
- Use ${colorScheme} color scheme
- Include the title "${title}" at the top
- Show actors/objects as rectangles at the top
- Use dashed vertical lifelines extending downward from each actor/object
- Represent messages as horizontal arrows between lifelines with descriptive labels
- Time flows from top to bottom
- Ensure the SVG is valid and renders correctly
- Use <svg> tag with appropriate namespaces
- Include reasonable padding and spacing
- Keep the design professional and readable
- Return ONLY the SVG code with no explanations`;

  try {
    const svgContent = await generateCompletion(
      content,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );
    
    return extractSvgFromText(svgContent);
  } catch (error) {
    console.error('Error generating sequence diagram SVG:', error);
    throw new Error('Failed to generate sequence diagram');
  }
}

/**
 * Creates an SVG UI mockup based on conversation context
 */
export async function createSvgUIMockup(
  content: string,
  options: {
    width?: number;
    height?: number;
    title?: string;
    platform?: 'web' | 'mobile' | 'desktop';
    colorScheme?: 'light' | 'dark' | 'colorful';
  } = {}
): Promise<string> {
  const { 
    width = 800, 
    height = 600, 
    title = 'UI Mockup', 
    platform = 'web',
    colorScheme = 'light' 
  } = options;
  
  // Prepare system prompt
  const systemPrompt = `You are a UI/UX design assistant that creates SVG UI mockups. 
Generate a clear, detailed SVG UI mockup based on the content provided.
Follow these requirements:
- Create a ${platform} UI mockup with width=${width} and height=${height}
- Use ${colorScheme} color scheme with appropriate contrast for readability
- Design for a ${platform} interface with appropriate components and layouts
- Include the title "${title}" if appropriate
- Use proper UI elements (buttons, forms, navigation, etc.) based on the requirements
- Add realistic but placeholder content where needed
- Ensure the SVG is valid and renders correctly
- Use <svg> tag with appropriate namespaces
- Include reasonable padding and spacing
- Keep the design professional and modern
- Return ONLY the SVG code with no explanations`;

  try {
    const svgContent = await generateCompletion(
      content,
      'gpt-4o',
      0.7,
      2000,
      systemPrompt
    );
    
    return extractSvgFromText(svgContent);
  } catch (error) {
    console.error('Error generating UI mockup SVG:', error);
    throw new Error('Failed to generate UI mockup');
  }
}

/**
 * Extracts SVG content from a text response which might contain other content
 */
function extractSvgFromText(text: string): string {
  // Find opening and closing SVG tags
  const svgStartMatch = text.match(/<svg[^>]*>/i);
  const svgEndMatch = text.match(/<\/svg>/i);
  
  if (svgStartMatch && svgEndMatch) {
    const startIndex = svgStartMatch.index || 0;
    const endIndex = svgEndMatch.index || 0;
    const endTagLength = svgEndMatch[0].length;
    
    if (endIndex > startIndex) {
      // Extract the SVG content including tags
      const svgContent = text.substring(startIndex, endIndex + endTagLength);
      return ensureValidSvg(svgContent);
    }
  }
  
  // If we couldn't find proper SVG tags, check if it's just missing namespace
  if (text.trim().startsWith('<svg') && text.trim().endsWith('</svg>')) {
    return ensureValidSvg(text.trim());
  }
  
  // Return a fallback SVG if extraction failed
  console.warn('Failed to extract SVG content from text. Using fallback SVG.');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <rect width="100%" height="100%" fill="#f8f9fa"/>
    <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#6c757d" text-anchor="middle">
      Diagram generation failed. Please try again.
    </text>
  </svg>`;
}

/**
 * Ensures the SVG content is valid by adding default header if needed
 */
function ensureValidSvg(svgContent: string): string {
  // Check if SVG has proper namespace
  if (!svgContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
    // Add namespace to opening SVG tag
    svgContent = svgContent.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  
  return svgContent;
}