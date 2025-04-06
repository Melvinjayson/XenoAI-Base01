/**
 * API Routes
 * 
 * This module defines the API routes for the application.
 * It handles various endpoints for AI interactions, search, and more.
 */

import { Request, Response, Express } from 'express';
import { processUserMessage } from './model-router';
import { getAllModels } from './model-selector';
import { apiQuotaManager } from './api-quota-manager';
import { ChatMessage } from './types';

/**
 * Set up all routes for the application
 * @param app Express application
 */
export function setupRoutes(app: Express): void {
  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });

  // Get available models
  app.get('/api/models', async (req: Request, res: Response) => {
    try {
      const models = getAllModels();
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
      const response = await processUserMessage(
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
        const fullResponse = await processUserMessage(
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
    const stats = apiQuotaManager.getQuotaUsageSummary();
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

  // Fallback for unmatched routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });
}