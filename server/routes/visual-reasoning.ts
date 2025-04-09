/**
 * Visual Reasoning Routes
 * 
 * This module defines API routes for visual reasoning functionality.
 * It enables diagram generation, knowledge visualization, and canvas manipulation.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { 
  createSvgFlowchart, 
  createSvgEntityDiagram, 
  createSvgMindMap,
  createSvgSequenceDiagram,
  createSvgUIMockup
} from '../diagram-generator';
import { storage } from '../storage';

// Create router
const router = Router();

// Types for diagram generation
const DiagramTypeSchema = z.enum([
  'flowchart',
  'entity',
  'mindmap',
  'sequence',
  'ui-mockup'
]);

const DiagramOptionsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  colorScheme: z.enum(['light', 'dark', 'colorful']).optional(),
  platform: z.enum(['web', 'mobile', 'desktop']).optional(),
});

const GenerateDiagramSchema = z.object({
  type: DiagramTypeSchema,
  content: z.string(),
  sessionId: z.string(),
  options: DiagramOptionsSchema.optional(),
});

const NaturalLanguageToVisualSchema = z.object({
  prompt: z.string(),
  sessionId: z.string(),
  diagramType: DiagramTypeSchema.optional(),
  options: DiagramOptionsSchema.optional(),
});

const SaveDiagramSchema = z.object({
  sessionId: z.string(),
  diagramType: DiagramTypeSchema,
  svgContent: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const AnalyzeDiagramSchema = z.object({
  sessionId: z.string(),
  diagramId: z.string(),
  queryType: z.enum(['explain', 'critique', 'improve', 'relation']),
  additionalContext: z.string().optional(),
});

/**
 * Generate a diagram based on the provided content and type
 */
router.post('/api/visual/generate-diagram', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = GenerateDiagramSchema.parse(req.body);
    const { type, content, options } = validatedData;
    
    let svgContent = '';
    
    // Generate the appropriate diagram type
    switch (type) {
      case 'flowchart':
        svgContent = await createSvgFlowchart(content, options);
        break;
      case 'entity':
        svgContent = await createSvgEntityDiagram(content, options);
        break;
      case 'mindmap':
        svgContent = await createSvgMindMap(content, options);
        break;
      case 'sequence':
        svgContent = await createSvgSequenceDiagram(content, options);
        break;
      case 'ui-mockup':
        svgContent = await createSvgUIMockup(content, options);
        break;
      default:
        return res.status(400).json({ error: 'Invalid diagram type' });
    }
    
    // Return the generated SVG content
    res.json({
      success: true,
      svgContent,
      diagramType: type,
    });
  } catch (error) {
    console.error('Error generating diagram:', error);
    res.status(500).json({ 
      error: 'Failed to generate diagram',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Convert natural language prompt to visual representation
 */
router.post('/api/visual/natural-language-to-visual', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = NaturalLanguageToVisualSchema.parse(req.body);
    const { prompt, diagramType = 'mindmap', options } = validatedData;
    
    let svgContent = '';
    
    // Default options with some reasonable sizing
    const diagramOptions = {
      width: 800,
      height: 600,
      colorScheme: 'light' as const,
      ...options
    };
    
    // Generate the appropriate diagram type based on prompt
    switch (diagramType) {
      case 'flowchart':
        svgContent = await createSvgFlowchart(prompt, diagramOptions);
        break;
      case 'entity':
        svgContent = await createSvgEntityDiagram(prompt, diagramOptions);
        break;
      case 'mindmap':
        svgContent = await createSvgMindMap(prompt, diagramOptions);
        break;
      case 'sequence':
        svgContent = await createSvgSequenceDiagram(prompt, diagramOptions);
        break;
      case 'ui-mockup':
        svgContent = await createSvgUIMockup(prompt, diagramOptions);
        break;
      default:
        return res.status(400).json({ error: 'Invalid diagram type' });
    }
    
    // Return the generated SVG content
    res.json({
      success: true,
      svgContent,
      diagramType,
    });
  } catch (error) {
    console.error('Error processing natural language to visual:', error);
    res.status(500).json({ 
      error: 'Failed to convert natural language to visual',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Save a diagram to storage
 */
router.post('/api/visual/save-diagram', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = SaveDiagramSchema.parse(req.body);
    const { sessionId, diagramType, svgContent, title, description, tags } = validatedData;
    
    // Generate a default title if none provided
    const diagramTitle = title || `${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagram`;
    
    // Save diagram to storage
    const diagram = await storage.saveDiagram({
      sessionId,
      diagramType,
      svgContent,
      title: diagramTitle,
      description: description || '',
      tags: tags || [],
      createdAt: new Date(),
    });
    
    // Return the saved diagram information
    res.json({
      success: true,
      diagram,
    });
  } catch (error) {
    console.error('Error saving diagram:', error);
    res.status(500).json({ 
      error: 'Failed to save diagram',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get diagrams for a specific session
 */
router.get('/api/visual/diagrams/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Get diagrams from storage
    const diagrams = await storage.getDiagrams(sessionId);
    
    // Return diagrams
    res.json({
      success: true,
      diagrams,
    });
  } catch (error) {
    console.error('Error fetching diagrams:', error);
    res.status(500).json({ 
      error: 'Failed to fetch diagrams',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Analyze a diagram
 */
router.post('/api/visual/analyze-diagram', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = AnalyzeDiagramSchema.parse(req.body);
    const { sessionId, diagramId, queryType, additionalContext } = validatedData;
    
    // Get the diagram from storage
    // Note: In a real implementation, we would fetch the diagram from storage
    // and analyze it using LLM. For now, we'll just return a placeholder response.
    
    // Placeholder analysis response
    const analysis = {
      explanation: 'Diagram analysis would explain the elements, relationships, and purpose of the diagram.',
      insights: [
        'Key elements in the diagram include entities, processes, and data flows.',
        'The diagram represents a conceptual model of the system architecture.',
        'There are opportunities for optimization in the process flow.'
      ],
      suggestions: [
        'Consider adding more detailed labels to the connections.',
        'The overall structure could be simplified by grouping related components.',
        'Add color coding to distinguish between different types of operations.'
      ]
    };
    
    // Return the analysis
    res.json({
      success: true,
      analysis,
      diagramId,
      queryType
    });
  } catch (error) {
    console.error('Error analyzing diagram:', error);
    res.status(500).json({ 
      error: 'Failed to analyze diagram',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export the router
export default router;