/**
 * Multi-Modal Routes
 * 
 * API routes for multi-modal input and output capabilities:
 * - Text processing
 * - Image processing and generation
 * - Audio processing and synthesis
 * - File handling
 * - Visualization generation
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { 
  multiModalSystem, 
  InputModality, 
  OutputModality,
  ModalInput 
} from '../multi-modal-system';
import { errorRecoverySystem } from '../error-recovery-system';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  }
});

// Route for multi-modal chat
router.post('/chat', upload.array('files'), async (req: Request, res: Response) => {
  try {
    // Extract text input from request body
    const { text, sessionId = 'default-session', outputModalities = ['text'] } = req.body;
    
    // Prepare inputs array
    const inputs: ModalInput[] = [];
    
    // Add text input if provided
    if (text) {
      inputs.push({
        modality: InputModality.TEXT,
        content: text,
        mimeType: 'text/plain'
      });
    }
    
    // Process uploaded files
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        // Determine input modality based on mime type
        let modalInput: ModalInput | null = null;
        
        if (file.mimetype.startsWith('image/')) {
          // Process image input
          modalInput = await multiModalSystem.parseImageInput(
            file.buffer,
            file.originalname
          );
        } else if (file.mimetype.startsWith('audio/')) {
          // Process audio input
          modalInput = await multiModalSystem.parseAudioInput(
            file.buffer,
            file.originalname
          );
        } else {
          // Process generic file input
          modalInput = await multiModalSystem.parseFileInput(
            file.buffer,
            file.originalname,
            file.mimetype
          );
        }
        
        if (modalInput) {
          inputs.push(modalInput);
        }
      }
    }
    
    // Ensure we have at least one input
    if (inputs.length === 0) {
      return res.status(400).json({ 
        error: 'No inputs provided. Please provide text and/or files.' 
      });
    }
    
    // Map outputModalities string array to enum values
    const outputModalitiesEnum = (outputModalities as string[]).map(m => {
      switch (m.toLowerCase()) {
        case 'text': return OutputModality.TEXT;
        case 'image': return OutputModality.IMAGE;
        case 'audio': return OutputModality.AUDIO;
        case 'visualization': return OutputModality.VISUALIZATION;
        default: return OutputModality.TEXT;
      }
    });
    
    // Process the inputs
    const response = await multiModalSystem.processMultiModalInput(
      inputs,
      {
        outputModalities: outputModalitiesEnum,
        sessionId,
        userId: req.body.userId,
        contextLevel: req.body.contextLevel || 'standard'
      }
    );
    
    // Transform response for API consumption
    const apiResponse = {
      id: response.id,
      timestamp: response.timestamp,
      outputs: response.outputs.map(output => {
        // Handle binary data
        if (output.content instanceof Buffer) {
          // For images and binary data, convert to base64
          return {
            ...output,
            content: output.content.toString('base64'),
            isBase64Encoded: true
          };
        }
        
        return output;
      }),
      sessionId: response.sessionId
    };
    
    res.status(200).json(apiResponse);
  } catch (error) {
    console.error('Error processing multi-modal request:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `multi_modal_api_error_${Date.now()}`,
      type: 'multi_modal_api_error',
      message: `Error processing multi-modal request: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while processing your request',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route for image generation
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, sessionId = 'default-session' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Process as text input with image output
    const response = await multiModalSystem.processMultiModalInput(
      [{
        modality: InputModality.TEXT,
        content: prompt,
        mimeType: 'text/plain'
      }],
      {
        outputModalities: [OutputModality.IMAGE],
        sessionId
      }
    );
    
    // Get the image output (if any)
    const imageOutput = response.outputs.find(o => o.modality === OutputModality.IMAGE);
    
    if (!imageOutput || !(imageOutput.content instanceof Buffer)) {
      return res.status(500).json({ error: 'Failed to generate image' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', imageOutput.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    
    // Send the image data
    res.send(imageOutput.content);
  } catch (error) {
    console.error('Error generating image:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `image_gen_error_${Date.now()}`,
      type: 'image_generation_error',
      message: `Error generating image: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while generating the image',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route for audio synthesis
router.post('/synthesize-speech', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'default', sessionId = 'default-session' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Process as text input with audio output
    const response = await multiModalSystem.processMultiModalInput(
      [{
        modality: InputModality.TEXT,
        content: text,
        mimeType: 'text/plain'
      }],
      {
        outputModalities: [OutputModality.AUDIO],
        sessionId
      }
    );
    
    // Get the audio output (if any)
    const audioOutput = response.outputs.find(o => o.modality === OutputModality.AUDIO);
    
    if (!audioOutput) {
      return res.status(500).json({ error: 'Failed to synthesize speech' });
    }
    
    // For our implementation, audio output contains TTS parameters for the browser
    res.status(200).json(audioOutput.metadata);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `speech_synth_error_${Date.now()}`,
      type: 'speech_synthesis_error',
      message: `Error synthesizing speech: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while synthesizing speech',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route for speech recognition
router.post('/recognize-speech', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { sessionId = 'default-session' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' });
    }
    
    // Parse the audio input
    const audioInput = await multiModalSystem.parseAudioInput(
      req.file.buffer,
      req.file.originalname
    );
    
    // For a real implementation, this would use a speech-to-text service
    // For now, we'll return a placeholder
    
    // Check if OpenAI API key is available
    const hasOpenAiKey = !!process.env.OPENAI_API_KEY;
    
    if (hasOpenAiKey) {
      // In real implementation, this would process the audio file with Whisper API
      console.log('OpenAI API key found, would process with Whisper in production');
      
      // For now, return a stub response to allow testing
      return res.status(200).json({
        text: "This is a stub response. In production, this would be the transcribed text from Whisper API.",
        confidence: 0.95
      });
    } else {
      // Return a meaningful response about missing API keys
      return res.status(200).json({
        text: "Speech recognition requires an OpenAI API key to work with Whisper. Please add one to enable this feature.",
        confidence: 0.1,
        requiresApiKey: true
      });
    }
  } catch (error) {
    console.error('Error recognizing speech:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `speech_recog_error_${Date.now()}`,
      type: 'speech_recognition_error',
      message: `Error recognizing speech: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while recognizing speech',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route for generating visualizations
router.post('/generate-visualization', async (req: Request, res: Response) => {
  try {
    const { prompt, type, sessionId = 'default-session' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Enhance prompt with visualization type if provided
    const enhancedPrompt = type ? 
      `Create a ${type} visualization for: ${prompt}` : 
      prompt;
    
    // Process as text input with visualization output
    const response = await multiModalSystem.processMultiModalInput(
      [{
        modality: InputModality.TEXT,
        content: enhancedPrompt,
        mimeType: 'text/plain'
      }],
      {
        outputModalities: [OutputModality.VISUALIZATION],
        sessionId
      }
    );
    
    // Get the visualization output (if any)
    const vizOutput = response.outputs.find(o => o.modality === OutputModality.VISUALIZATION);
    
    if (!vizOutput) {
      return res.status(500).json({ error: 'Failed to generate visualization' });
    }
    
    // Return the visualization configuration
    res.status(200).json({
      config: typeof vizOutput.content === 'string' ? 
        JSON.parse(vizOutput.content) : 
        vizOutput.content,
      metadata: vizOutput.metadata
    });
  } catch (error) {
    console.error('Error generating visualization:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `viz_gen_error_${Date.now()}`,
      type: 'visualization_generation_error',
      message: `Error generating visualization: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while generating the visualization',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Route for retrieving media files
router.get('/media/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Ensure filename is sanitized
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join('./temp', sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file extension to determine content type
    const ext = path.extname(filename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.json') contentType = 'application/json';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    
    // Send the file
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    console.error('Error serving media file:', error);
    
    // Log the error
    errorRecoverySystem.logError({
      id: `media_serve_error_${Date.now()}`,
      type: 'media_serving_error',
      message: `Error serving media file: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      context: { filename: req.params.filename },
      timestamp: new Date(),
      severity: 'error'
    });
    
    res.status(500).json({ 
      error: 'An error occurred while serving the media file',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;