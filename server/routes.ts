/**
 * API Routes
 * 
 * This module defines the API routes for the application.
 * It handles various endpoints for AI interactions, search, and more.
 */

import { Request, Response, Express } from 'express';
import { processMessage } from './model-router';
import { getAvailableModels } from './model-selector';
import { apiQuotaManager } from './api-quota-manager';
import { ChatMessage } from './types';
import { storage } from './storage';
import { insertColorPaletteSchema } from '@shared/schema';

/**
 * Set up all routes for the application
 * @param app Express application
 */
export function setupRoutes(app: Express): void {
  // API root endpoint
  app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({ message: 'API server is running' });
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // Get available models
  app.get('/api/models', async (req: Request, res: Response) => {
    try {
      const models = getAvailableModels();
      res.status(200).json({ models });
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Chat endpoint
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, history = [], options = {} } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Process the message
      const response = await processMessage(
        message,
        history as ChatMessage[],
        options
      );
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error processing chat:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Streaming chat endpoint
  app.post('/api/chat/stream', async (req: Request, res: Response) => {
    try {
      const { message, history = [], options = {} } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Set up SSE connection
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Helper function to send SSE events
      const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      // Start the response
      sendEvent('start', { 
        timestamp: Date.now()
      });
      
      // For this demo, we'll simulate streaming instead of actually streaming from the model
      // In a real implementation, you would connect to a streaming API
      const simulateStream = async () => {
        // First, get the actual response (we'll send it at the end)
        const fullResponse = await processMessage(
          message,
          history as ChatMessage[],
          options
        );
        
        // Simulate streaming chunks of text
        let sentChars = 0;
        const chunks = fullResponse.message.match(/.{1,20}(?:\s|$)/g) || [];
        
        for (const chunk of chunks) {
          // Send a chunk and wait a bit
          sendEvent('chunk', { text: chunk });
          sentChars += chunk.length;
          
          // Simulate typing delay
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
        }
        
        // Send the complete response
        sendEvent('complete', {
          ...fullResponse,
          message: fullResponse.message // Include the full message again for clients that missed chunks
        });
        
        // End the response
        sendEvent('end', { timestamp: Date.now() });
        res.end();
      };
      
      // Start the simulation
      simulateStream().catch((error) => {
        console.error('Error in stream:', error);
        sendEvent('error', { error: String(error) || 'An unknown error occurred' });
        res.end();
      });
    } catch (error) {
      console.error('Error setting up streaming chat:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // API usage stats
  app.get('/api/stats/usage', (req: Request, res: Response) => {
    const stats = apiQuotaManager.getUsageSummary();
    res.status(200).json(stats);
  });

  // API cost estimates
  app.get('/api/stats/costs', (req: Request, res: Response) => {
    const costs = apiQuotaManager.getEstimatedCosts();
    res.status(200).json(costs);
  });

  // Text-to-speech endpoint
  app.post('/api/tts', (req: Request, res: Response) => {
    // Placeholder for TTS implementation
    // In a real implementation, this would call ElevenLabs, OpenAI TTS, or browser APIs
    res.status(501).json({ error: 'Text-to-speech is not implemented yet' });
  });

  // Speech-to-text endpoint
  app.post('/api/stt', (req: Request, res: Response) => {
    // Placeholder for STT implementation
    // In a real implementation, this would call Whisper API or similar
    res.status(501).json({ error: 'Speech-to-text is not implemented yet' });
  });

  // Color Palette endpoints
  app.get('/api/color-palettes', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string | undefined;
      const palettes = await storage.getColorPalettes(userId);
      res.status(200).json(palettes);
    } catch (error) {
      console.error('Error fetching color palettes:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.get('/api/color-palettes/default', async (req: Request, res: Response) => {
    try {
      const defaultPalette = await storage.getDefaultColorPalette();
      if (!defaultPalette) {
        return res.status(404).json({ error: 'No default color palette found' });
      }
      res.status(200).json(defaultPalette);
    } catch (error) {
      console.error('Error fetching default color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.get('/api/color-palettes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid palette ID' });
      }
      
      const palette = await storage.getColorPaletteById(id);
      if (!palette) {
        return res.status(404).json({ error: 'Color palette not found' });
      }
      
      res.status(200).json(palette);
    } catch (error) {
      console.error('Error fetching color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.post('/api/color-palettes', async (req: Request, res: Response) => {
    try {
      const validationResult = insertColorPaletteSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: 'Invalid palette data', details: validationResult.error });
      }
      
      const palette = await storage.createColorPalette(validationResult.data);
      res.status(201).json(palette);
    } catch (error) {
      console.error('Error creating color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.put('/api/color-palettes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid palette ID' });
      }
      
      const palette = await storage.updateColorPalette(id, req.body);
      if (!palette) {
        return res.status(404).json({ error: 'Color palette not found' });
      }
      
      res.status(200).json(palette);
    } catch (error) {
      console.error('Error updating color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.put('/api/color-palettes/:id/set-default', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid palette ID' });
      }
      
      const palette = await storage.setDefaultColorPalette(id);
      if (!palette) {
        return res.status(404).json({ error: 'Color palette not found' });
      }
      
      res.status(200).json(palette);
    } catch (error) {
      console.error('Error setting default color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.delete('/api/color-palettes/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid palette ID' });
      }
      
      const success = await storage.deleteColorPalette(id);
      if (!success) {
        return res.status(404).json({ error: 'Color palette not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting color palette:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Fallback for unmatched API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });
}