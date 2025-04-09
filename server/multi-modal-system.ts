/**
 * Multi-Modal Input and Output System
 * 
 * This module handles various input and output modalities:
 * - Text (input/output)
 * - Images (input/output)
 * - Audio (input/output)
 * - Video (input)
 * - Files (input)
 * - Interactive visualizations (output)
 * 
 * The system integrates with various AI services to process
 * different modalities and provide a unified interface.
 */

import { generateCompletion, generateStructuredCompletion } from './ai-service';
import { errorRecoverySystem } from './error-recovery-system';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { asyncProcessingManager, TaskPriority } from './async-processing-manager';
import { createCanvas, loadImage, Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Supported input modalities
export enum InputModality {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file'
}

// Supported output modalities
export enum OutputModality {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VISUALIZATION = 'visualization'
}

// Input content interface
export interface ModalInput {
  modality: InputModality;
  content: string | Buffer; // Text content or Buffer for binary data
  mimeType?: string;
  filename?: string;
  metadata?: Record<string, any>;
}

// Output content interface
export interface ModalOutput {
  modality: OutputModality;
  content: string | Buffer; // Text content or Buffer for binary data
  mimeType: string;
  metadata?: Record<string, any>;
}

// Multi-modal message interface
export interface MultiModalMessage {
  id: string;
  timestamp: Date;
  inputs: ModalInput[];
  outputs: ModalOutput[];
  sessionId?: string;
  userId?: string;
}

// Storage for temporary media files
const TEMP_DIR = './temp';
// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Process a multi-modal input and generate appropriate outputs
 */
export async function processMultiModalInput(
  inputs: ModalInput[],
  options: {
    outputModalities?: OutputModality[];
    sessionId?: string;
    userId?: string;
    contextLevel?: 'minimal' | 'standard' | 'enhanced';
  } = {}
): Promise<MultiModalMessage> {
  try {
    const { 
      outputModalities = [OutputModality.TEXT],
      sessionId = 'default-session',
      userId,
      contextLevel = 'standard'
    } = options;
    
    console.log(`Processing multi-modal input with ${inputs.length} inputs`);
    
    // Create the message object
    const message: MultiModalMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      inputs,
      outputs: [],
      sessionId,
      userId
    };
    
    // Process each input modality
    const inputDescriptions: string[] = [];
    for (const input of inputs) {
      const description = await describeInput(input);
      inputDescriptions.push(description);
    }
    
    // Generate context
    let context = '';
    if (contextLevel !== 'minimal' && sessionId) {
      const memories = await enhancedMemoryManager.retrieveMemories(
        sessionId,
        {
          limit: contextLevel === 'enhanced' ? 10 : 5,
          recency: contextLevel === 'enhanced' ? 'high' : 'medium'
        }
      );
      
      if (memories.length > 0) {
        context = 'Previous conversation context:\n' + 
                  memories.map(m => m.content).join('\n');
      }
    }
    
    // Generate outputs for each requested modality
    for (const outputModality of outputModalities) {
      const output = await generateOutput(
        inputDescriptions.join('\n'),
        outputModality,
        context,
        sessionId
      );
      
      if (output) {
        message.outputs.push(output);
      }
    }
    
    // Store in memory for future reference
    if (sessionId) {
      await enhancedMemoryManager.addMemory(
        `Multi-modal message: ${inputDescriptions.join(' | ')}`,
        sessionId,
        'episodic',
        [], // Entities would be extracted by a more sophisticated system
        ['multi-modal', ...inputs.map(i => i.modality)]
      );
    }
    
    return message;
  } catch (error) {
    console.error('Error processing multi-modal input:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `modal_error_${Date.now()}`,
      type: 'multi_modal_processing_error',
      message: `Error processing multi-modal input: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        inputTypes: inputs.map(i => i.modality),
        sessionId: options.sessionId,
        userId: options.userId
      },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return a basic error message
    return {
      id: `error_${Date.now()}`,
      timestamp: new Date(),
      inputs,
      outputs: [{
        modality: OutputModality.TEXT,
        content: `An error occurred while processing your input: ${error instanceof Error ? error.message : String(error)}`,
        mimeType: 'text/plain',
        metadata: { error: true }
      }],
      sessionId: options.sessionId,
      userId: options.userId
    };
  }
}

/**
 * Generate a textual description of an input
 */
async function describeInput(input: ModalInput): Promise<string> {
  switch (input.modality) {
    case InputModality.TEXT:
      return `Text input: ${input.content as string}`;
    
    case InputModality.IMAGE:
      // For an actual implementation, this would use a vision model to describe the image
      // For now, we'll return basic metadata
      const imgMetadata = input.metadata || {};
      return `Image input: ${imgMetadata.width || '?'}x${imgMetadata.height || '?'} ${imgMetadata.format || 'image'}`;
    
    case InputModality.AUDIO:
      // For an actual implementation, this would use speech-to-text
      // For now, we'll return basic metadata
      const audioMetadata = input.metadata || {};
      return `Audio input: ${audioMetadata.duration || '?'} seconds ${audioMetadata.format || 'audio'}`;
    
    case InputModality.VIDEO:
      // For an actual implementation, this would extract frames and describe
      // For now, we'll return basic metadata
      const videoMetadata = input.metadata || {};
      return `Video input: ${videoMetadata.duration || '?'} seconds ${videoMetadata.format || 'video'}`;
    
    case InputModality.FILE:
      const filename = input.filename || 'unnamed file';
      const filetype = input.mimeType || 'unknown type';
      return `File input: ${filename} (${filetype})`;
    
    default:
      return `Unknown input type: ${input.modality}`;
  }
}

/**
 * Generate output in the specified modality
 */
async function generateOutput(
  inputDescription: string,
  outputModality: OutputModality,
  context: string = '',
  sessionId?: string
): Promise<ModalOutput | null> {
  try {
    switch (outputModality) {
      case OutputModality.TEXT:
        return await generateTextOutput(inputDescription, context);
      
      case OutputModality.IMAGE:
        return await generateImageOutput(inputDescription, context);
      
      case OutputModality.AUDIO:
        return await generateAudioOutput(inputDescription, context);
      
      case OutputModality.VISUALIZATION:
        return await generateVisualizationOutput(inputDescription, context, sessionId);
      
      default:
        throw new Error(`Unsupported output modality: ${outputModality}`);
    }
  } catch (error) {
    console.error(`Error generating ${outputModality} output:`, error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `output_gen_error_${Date.now()}`,
      type: 'output_generation_error',
      message: `Error generating ${outputModality} output: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { inputDescription, outputModality },
      timestamp: new Date(),
      severity: 'error'
    });
    
    return null;
  }
}

/**
 * Generate text output
 */
async function generateTextOutput(
  inputDescription: string,
  context: string = ''
): Promise<ModalOutput> {
  // Create the prompt with optional context
  const prompt = context ? 
    `${context}\n\nBased on this input: ${inputDescription}\n\nGenerate a helpful response:` :
    `Based on this input: ${inputDescription}\n\nGenerate a helpful response:`;
  
  // Generate text completion
  const response = await generateCompletion(prompt);
  
  return {
    modality: OutputModality.TEXT,
    content: response,
    mimeType: 'text/plain'
  };
}

/**
 * Generate image output
 */
async function generateImageOutput(
  inputDescription: string,
  context: string = ''
): Promise<ModalOutput> {
  // For actual implementation, this would call a text-to-image model
  // For now, we'll generate a simple image with text
  
  // Parse the input to determine what to draw
  const prompt = `
    Based on this input: "${inputDescription}"
    
    Generate a simple image by providing:
    1. Background color (CSS color name)
    2. Main shape (circle, rectangle, or triangle)
    3. Shape color (CSS color name)
    4. Optional text to include
  `;
  
  // Get structured response
  const imageSpec = await generateStructuredCompletion<{
    backgroundColor: string;
    shape: 'circle' | 'rectangle' | 'triangle';
    shapeColor: string;
    text?: string;
  }>(prompt, 'gpt-4o', 0.7, 1000);
  
  // Create a canvas
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');
  
  // Draw background
  ctx.fillStyle = imageSpec.backgroundColor || 'white';
  ctx.fillRect(0, 0, 400, 400);
  
  // Draw shape
  ctx.fillStyle = imageSpec.shapeColor || 'blue';
  
  switch (imageSpec.shape) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(200, 200, 100, 0, Math.PI * 2);
      ctx.fill();
      break;
    
    case 'rectangle':
      ctx.fillRect(100, 100, 200, 200);
      break;
    
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(200, 100);
      ctx.lineTo(300, 300);
      ctx.lineTo(100, 300);
      ctx.closePath();
      ctx.fill();
      break;
    
    default:
      // Default to circle
      ctx.beginPath();
      ctx.arc(200, 200, 100, 0, Math.PI * 2);
      ctx.fill();
  }
  
  // Add text if specified
  if (imageSpec.text) {
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(imageSpec.text, 200, 350, 380);
  }
  
  // Convert to buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Save to temp file
  const filename = `image_${Date.now()}.png`;
  const filepath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filepath, buffer);
  
  return {
    modality: OutputModality.IMAGE,
    content: buffer,
    mimeType: 'image/png',
    metadata: {
      generatedFrom: inputDescription,
      width: 400,
      height: 400,
      filepath
    }
  };
}

/**
 * Generate audio output
 */
async function generateAudioOutput(
  inputDescription: string,
  context: string = ''
): Promise<ModalOutput> {
  // For actual implementation, this would call a text-to-speech service
  // For now, we'll return a placeholder
  
  // Get text to synthesize
  const textToSynthesize = await generateCompletion(
    `Based on this input: "${inputDescription}"
    
    Generate a short, concise response that would be suitable for voice output (1-3 sentences maximum).`
  );
  
  // Return metadata for browser TTS
  return {
    modality: OutputModality.AUDIO,
    content: textToSynthesize,
    mimeType: 'application/json',
    metadata: {
      type: 'browser-tts',
      text: textToSynthesize,
      voice: 'default',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  };
}

/**
 * Generate visualization output
 */
async function generateVisualizationOutput(
  inputDescription: string,
  context: string = '',
  sessionId?: string
): Promise<ModalOutput> {
  // For actual implementation, this would generate visualization configs
  // For now, we'll create a simple chart configuration
  
  // Determine if the input is asking for a data visualization
  const visualizationType = await generateStructuredCompletion<{
    needsVisualization: boolean;
    type?: 'bar' | 'line' | 'pie' | 'scatter' | 'network';
    title?: string;
    description?: string;
  }>(
    `Based on this input: "${inputDescription}"
    
    Determine if the user is asking for a data visualization and if so, what type.
    Respond with:
    - needsVisualization: whether a visualization would be helpful (true/false)
    - type: what type of chart or graph would be most appropriate (bar, line, pie, scatter, network)
    - title: a suggested title for the visualization
    - description: a brief description of what the visualization would show`,
    'gpt-4o',
    0.7,
    1000
  );
  
  if (!visualizationType.needsVisualization) {
    // No visualization needed
    return {
      modality: OutputModality.TEXT,
      content: 'I don\'t have enough information to create a meaningful visualization based on your input.',
      mimeType: 'text/plain'
    };
  }
  
  // Generate sample data for visualization
  const chartData = await generateStructuredCompletion<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string;
    }>;
  }>(
    `Based on this input: "${inputDescription}"
    
    Generate sample data for a ${visualizationType.type} chart with the title "${visualizationType.title}".
    The data should make sense in the context of the user's request.
    
    For labels, provide 5-7 meaningful categories or time periods.
    For datasets, provide 1-2 data series with realistic values.
    
    Note: This is for demonstration purposes, so the data should be representative but does not need to be factually accurate.`,
    'gpt-4o',
    0.7,
    1000
  );
  
  // Create visualization config
  const visualizationConfig = {
    type: visualizationType.type,
    title: visualizationType.title,
    description: visualizationType.description,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1000
      },
      plugins: {
        title: {
          display: true,
          text: visualizationType.title,
          font: {
            size: 16
          }
        },
        tooltip: {
          enabled: true
        },
        legend: {
          display: true,
          position: 'top'
        }
      }
    }
  };
  
  return {
    modality: OutputModality.VISUALIZATION,
    content: JSON.stringify(visualizationConfig),
    mimeType: 'application/json',
    metadata: {
      visualizationType: visualizationType.type,
      sourceDescription: inputDescription,
      canBeInteractive: true
    }
  };
}

/**
 * Save a media file to disk
 */
export function saveMediaFile(
  buffer: Buffer,
  fileExtension: string,
  prefix: string = 'media'
): string {
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${fileExtension}`;
  const filepath = path.join(TEMP_DIR, filename);
  
  fs.writeFileSync(filepath, buffer);
  
  return filepath;
}

/**
 * Read a media file from disk
 */
export function readMediaFile(filepath: string): Buffer {
  return fs.readFileSync(filepath);
}

/**
 * Parse an image and extract metadata
 */
export async function parseImageInput(
  buffer: Buffer,
  filename?: string
): Promise<ModalInput> {
  try {
    // Load image to get dimensions
    const image = await loadImage(buffer);
    
    // Save to temp file
    const fileExtension = filename ? path.extname(filename).substring(1) : 'png';
    const filepath = saveMediaFile(buffer, fileExtension, 'img');
    
    return {
      modality: InputModality.IMAGE,
      content: buffer,
      mimeType: `image/${fileExtension}`,
      filename: path.basename(filepath),
      metadata: {
        width: image.width,
        height: image.height,
        format: fileExtension,
        filepath
      }
    };
  } catch (error) {
    console.error('Error parsing image input:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `image_parse_error_${Date.now()}`,
      type: 'image_parsing_error',
      message: `Error parsing image input: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { filename },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return basic input with error flag
    return {
      modality: InputModality.IMAGE,
      content: buffer,
      mimeType: 'image/unknown',
      filename,
      metadata: { error: true }
    };
  }
}

/**
 * Parse audio input
 */
export async function parseAudioInput(
  buffer: Buffer,
  filename?: string
): Promise<ModalInput> {
  try {
    // In a real implementation, this would extract audio metadata
    // For now, we'll just save the file
    
    const fileExtension = filename ? path.extname(filename).substring(1) : 'mp3';
    const filepath = saveMediaFile(buffer, fileExtension, 'audio');
    
    return {
      modality: InputModality.AUDIO,
      content: buffer,
      mimeType: `audio/${fileExtension}`,
      filename: path.basename(filepath),
      metadata: {
        format: fileExtension,
        filepath
      }
    };
  } catch (error) {
    console.error('Error parsing audio input:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `audio_parse_error_${Date.now()}`,
      type: 'audio_parsing_error',
      message: `Error parsing audio input: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { filename },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return basic input with error flag
    return {
      modality: InputModality.AUDIO,
      content: buffer,
      mimeType: 'audio/unknown',
      filename,
      metadata: { error: true }
    };
  }
}

/**
 * Parse file input
 */
export async function parseFileInput(
  buffer: Buffer,
  filename?: string,
  mimeType?: string
): Promise<ModalInput> {
  try {
    // Save to temp file
    const fileExtension = filename ? path.extname(filename).substring(1) : 'bin';
    const filepath = saveMediaFile(buffer, fileExtension, 'file');
    
    return {
      modality: InputModality.FILE,
      content: buffer,
      mimeType: mimeType || 'application/octet-stream',
      filename: filename || path.basename(filepath),
      metadata: {
        size: buffer.length,
        filepath
      }
    };
  } catch (error) {
    console.error('Error parsing file input:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `file_parse_error_${Date.now()}`,
      type: 'file_parsing_error',
      message: `Error parsing file input: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { filename, mimeType },
      timestamp: new Date(),
      severity: 'error'
    });
    
    // Return basic input with error flag
    return {
      modality: InputModality.FILE,
      content: buffer,
      mimeType: mimeType || 'application/octet-stream',
      filename,
      metadata: { error: true }
    };
  }
}

// Export as a singleton
export const multiModalSystem = {
  processMultiModalInput,
  saveMediaFile,
  readMediaFile,
  parseImageInput,
  parseAudioInput,
  parseFileInput,
  InputModality,
  OutputModality
};