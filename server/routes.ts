/**
 * API Routes
 * 
 * This module defines the API routes for the application.
 * It handles various endpoints for AI interactions, search, and more.
 */

import { Request, Response, Express } from 'express';
import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { processMessage, DEFAULT_PROMPTS } from './model-router';
import { getAvailableModels } from './model-selector';
import { apiQuotaManager } from './api-quota-manager';
import { ChatMessage, ActionType } from './types';
import { storage } from './storage';
import { insertColorPaletteSchema } from '@shared/schema';
import { 
  enhancedContextAnalysis, 
  enhancedContextDetection,
  processWithEnhancedContext,
  suggestNextActions,
  suggestFollowUpQuestion
} from './context-integration';
import { memoryManager } from './memory-manager';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { isLocalLLMAvailable, getLocalLLMStatus } from './local-llm';
import { modelTransitionManager, ModelType } from './model-transition-manager';
import { analyzeDecision, generateReflectionPrompts, generateInsights } from './decision-framework';

// Define API Service type for quota manager
type ApiService = 'openai' | 'anthropic' | 'elevenlabs';

/**
 * Set up all API routes for the application
 * @param app Express application
 */
function setupApiRoutes(app: Express): void {
  // API root endpoint
  app.get('/api', (req: Request, res: Response) => {
    res.status(200).json({ message: 'API server is running' });
  });

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
  });
  
  // Model status endpoint
  app.get('/api/model-status', (req: Request, res: Response) => {
    try {
      const models = getAvailableModels();
      const localStatus = getLocalLLMStatus();
      const quotaStatus = apiQuotaManager.getUsageSummary();
      
      res.status(200).json({
        localModel: localStatus,
        availableModels: models,
        quotaStatus: quotaStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error fetching model status:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
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
      const { message, history = [], options = {}, sessionId = 'anonymous-session', useEnhancedContext = true } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Process the message with enhanced context if requested
      let response;
      if (useEnhancedContext) {
        response = await processWithEnhancedContext(
          message,
          history as ChatMessage[],
          sessionId,
          options
        );
      } else {
        response = await processMessage(
          message,
          history as ChatMessage[],
          options
        );
      }
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error processing chat:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Streaming chat endpoint
  app.post('/api/chat/stream', async (req: Request, res: Response) => {
    try {
      const { message, history = [], options = {}, sessionId = 'anonymous-session', useEnhancedContext = true } = req.body;
      
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
        let fullResponse;
        
        if (useEnhancedContext) {
          fullResponse = await processWithEnhancedContext(
            message,
            history as ChatMessage[],
            sessionId,
            options
          );
        } else {
          fullResponse = await processMessage(
            message,
            history as ChatMessage[],
            options
          );
        }
        
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
  
  // Model transition settings
  app.get('/api/model/transition', (req: Request, res: Response) => {
    try {
      // Get the session ID from query params or default to 'default-session'
      const sessionId = req.query.sessionId as string || 'default-session';
      
      // Get current settings
      const threshold = modelTransitionManager.getComplexityThreshold(sessionId);
      const currentModelType = modelTransitionManager.getLastUsedModelType(sessionId);
      
      res.status(200).json({
        sessionId,
        complexityThreshold: threshold,
        currentModelType: currentModelType === ModelType.LOCAL ? 'local' : 'cloud',
        cloudModelsAvailable: !modelTransitionManager.shouldAvoidCloudModels(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error getting model transition settings:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Update model transition settings
  app.post('/api/model/transition', (req: Request, res: Response) => {
    try {
      const { sessionId = 'default-session', threshold, forceModel } = req.body;
      
      // Update threshold if provided
      if (typeof threshold === 'number') {
        modelTransitionManager.setComplexityThreshold(sessionId, threshold);
      }
      
      // Force a specific model type if provided
      if (forceModel === 'local' || forceModel === 'cloud') {
        const modelType = forceModel === 'local' ? ModelType.LOCAL : ModelType.CLOUD;
        modelTransitionManager.recordModelUsage(sessionId, modelType);
      }
      
      // Return updated settings
      const updatedThreshold = modelTransitionManager.getComplexityThreshold(sessionId);
      const currentModelType = modelTransitionManager.getLastUsedModelType(sessionId);
      
      res.status(200).json({
        sessionId,
        complexityThreshold: updatedThreshold,
        currentModelType: currentModelType === ModelType.LOCAL ? 'local' : 'cloud',
        updated: true,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error updating model transition settings:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Process a message with automatic model selection for optimal processing
  app.post('/api/chat/optimal', async (req: Request, res: Response) => {
    try {
      const { 
        message, 
        history = [], 
        options = {}, 
        sessionId = 'anonymous-session'
      } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      console.log(`Processing optimal chat for session ${sessionId}`);
      
      // Use the model transition manager to process with optimal model
      const response = await modelTransitionManager.processWithOptimalModel(
        message,
        history as ChatMessage[],
        {
          sessionId,
          contextLevel: options.contextLevel || 'standard',
          preserveContext: options.preserveContext !== false,
          forceModel: options.forceModel as 'local' | 'cloud' | undefined
        }
      );
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error processing optimal chat:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Voice chat API for companion characters
  app.post('/api/chat/voice', async (req: Request, res: Response) => {
    try {
      const { 
        message, 
        characterType = 'assistant', 
        sessionId = 'voice-session'
      } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      console.log(`Processing voice command for ${characterType}: "${message}"`);
      
      // Define character-specific system prompts based on character type
      const characterPrompts = {
        assistant: `${DEFAULT_PROMPTS.generic} As a helpful AI assistant named Xeno, provide concise and helpful responses to voice commands. Focus on direct, actionable answers suitable for voice interaction.`,
        scientist: `You are Prof. X, an AI research scientist with expertise in analyzing complex questions. Provide informative, educational responses that explain concepts clearly. Your answers should be concise but thorough, with a slightly academic tone.`,
        guide: `You are Guido, a friendly guide to the Xeno AI system. Your responses should help users navigate the application, understand features, and make the most of the system. Be encouraging and offer practical tips.`,
        mentor: `You are Mentor, an AI specializing in decision support and personal development. Help users think through problems, consider different perspectives, and develop structured approaches to challenges. Focus on prompting deeper thinking and reflection.`
      };
      
      // Get the appropriate system prompt for this character
      const validCharacterTypes = ['assistant', 'scientist', 'guide', 'mentor'] as const;
      const validatedCharType = validCharacterTypes.includes(characterType as any) 
        ? characterType as keyof typeof characterPrompts 
        : 'assistant';
      const systemPrompt = characterPrompts[validatedCharType];
      
      // Process the voice command with enhanced context
      const response = await processMessage(
        message,
        [{ role: 'system', content: systemPrompt }],
        {
          temperature: 0.7,
          maxTokens: 150, // Keep responses concise for voice
          systemPrompt
        }
      );
      
      // Record the interaction in the memory manager for future context
      const memoryContent = `Voice interaction with character=${validatedCharType}, query='${message}', response='${response.message}'`;
      await enhancedMemoryManager.addMemory(
        memoryContent,
        sessionId,
        'episodic',  // Store as episodic memory type
        [], // No specific entities
        ['voice-interaction', validatedCharType] // Add relevant topics
      );
      
      res.status(200).json({
        response: response.message,
        character: validatedCharType,
        processed: true
      });
    } catch (error) {
      console.error('Error processing voice command:', error);
      res.status(500).json({ 
        error: String(error) || 'An unknown error occurred',
        fallbackResponse: "I'm sorry, I couldn't process that voice command. Could you try again?"
      });
    }
  });

  // Text-to-speech endpoint
  app.post('/api/tts', (req: Request, res: Response) => {
    // Placeholder for TTS implementation
    // In a real implementation, this would call ElevenLabs, OpenAI TTS, or browser APIs
    res.status(501).json({ error: 'Text-to-speech is not implemented yet' });
  });
  
  // Speech synthesis endpoint (alias for TTS that was being called by the frontend)
  app.post('/api/synthesize', async (req: Request, res: Response) => {
    try {
      const { text, voice = 'default', language = 'en' } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      // For the best local experience, we'll prioritize browser-based TTS with enhanced settings
      // This gives more consistent and reliable results across all devices
      console.log(`Synthesizing speech with local TTS: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      
      // Return enhanced browser TTS settings for better quality
      return res.status(200).json({
        status: 'browser',
        message: 'Use enhanced browser text-to-speech capabilities',
        text,
        voice,
        language,
        enhancedSettings: {
          rate: 1.0,            // Normal speaking rate
          pitch: 1.0,           // Normal pitch
          volume: 1.0,          // Full volume
          preferredVoices: [    // List of high-quality voices to try first
            'Google UK English Female',
            'Microsoft Zira Desktop',
            'Microsoft David Desktop',
            'Alex',             // macOS voice
            'Samantha'          // macOS voice
          ]
        }
      });
    } catch (error) {
      console.error('Error in speech synthesis:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Speech-to-text endpoint
  app.post('/api/speech-to-text', async (req: Request, res: Response) => {
    try {
      // Placeholder for real STT implementation
      // This would use OpenAI's Whisper API or similar in production
      
      console.log('Received speech-to-text request');
      
      // Check if we have OpenAI API key to potentially use Whisper
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
        // Return a meaningful error if API key is missing
        console.log('No OpenAI API key found, cannot process speech-to-text');
        return res.status(200).json({
          text: "Hello, how can I help you today? (This is a simulated response since speech recognition isn't fully implemented yet)",
          confidence: 0.9
        });
      }
    } catch (error) {
      console.error('Error in speech-to-text processing:', error);
      res.status(500).json({ 
        error: String(error) || 'An unknown error occurred',
        suggestion: 'Please check that your microphone is working and try again.'
      });
    }
  });
  
  // Legacy STT endpoint (keep for backward compatibility)
  app.post('/api/stt', (req: Request, res: Response) => {
    // Redirect to new endpoint
    console.log('Legacy STT endpoint called, redirecting to /api/speech-to-text');
    req.url = '/api/speech-to-text';
    app._router.handle(req, res);
  });
  
  // Enhanced context analysis endpoint
  app.post('/api/context/analyze', async (req: Request, res: Response) => {
    try {
      const { message, history = [], sessionId = 'anonymous-session' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const contextAnalysis = await enhancedContextAnalysis(
        message,
        history as ChatMessage[],
        sessionId
      );
      
      res.status(200).json({ context: contextAnalysis });
    } catch (error) {
      console.error('Error analyzing context:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Context detection endpoint
  app.post('/api/context/detect', async (req: Request, res: Response) => {
    try {
      const { message, history = [], sessionId = 'anonymous-session' } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const detectedContext = await enhancedContextDetection(
        message,
        history as ChatMessage[],
        sessionId
      );
      
      res.status(200).json({ context: detectedContext });
    } catch (error) {
      console.error('Error detecting context:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Get memory context endpoint
  app.post('/api/context/memory', async (req: Request, res: Response) => {
    try {
      const { message, sessionId = 'anonymous-session', options = {} } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const memoryContext = await enhancedMemoryManager.getEnhancedContext(
        sessionId,
        message,
        options
      );
      
      res.status(200).json({ context: memoryContext });
    } catch (error) {
      console.error('Error retrieving memory context:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Get follow-up question suggestions
  app.post('/api/context/follow-up', async (req: Request, res: Response) => {
    try {
      const { context, sessionId = 'anonymous-session' } = req.body;
      
      if (!context) {
        return res.status(400).json({ error: 'Context is required' });
      }
      
      const followUp = await suggestFollowUpQuestion(context, sessionId);
      
      res.status(200).json({ followUp });
    } catch (error) {
      console.error('Error generating follow-up question:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });
  
  // Get suggested actions based on context
  app.post('/api/context/actions', async (req: Request, res: Response) => {
    try {
      const { context, sessionId = 'anonymous-session' } = req.body;
      
      if (!context) {
        return res.status(400).json({ error: 'Context is required' });
      }
      
      const actions = await suggestNextActions(context, sessionId);
      
      res.status(200).json({ actions });
    } catch (error) {
      console.error('Error suggesting actions:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
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

  // Project management endpoints
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const projects = await storage.getProjects();
      res.status(200).json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      const project = await storage.createProject(projectData);
      
      // Provide real-time status update
      console.log(`Project created successfully: ${project.name} (ID: ${project.id})`);
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      
      const project = await storage.getProjectById(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(200).json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.patch('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      
      const projectData = req.body;
      const project = await storage.updateProject(id, projectData);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(200).json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      
      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: String(error) || 'An unknown error occurred' });
    }
  });

  // Decision Framework Analysis
  app.post('/api/decision/analyze', analyzeDecision);
  
  // Generate Reflection Prompts for Decision
  app.post('/api/decision/reflection-prompts', generateReflectionPrompts);
  
  // Generate Insights for Decision
  app.post('/api/decision/insights', generateInsights);

  // Fallback for unmatched API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });
}

/**
 * Set up all routes and WebSocket server for the application
 * @param app Express application
 * @param httpServer HTTP server instance
 * @returns WebSocketServer instance
 */
export function setupRoutes(app: Express, httpServer?: HTTPServer): WebSocketServer | undefined {
  // Set up all API routes
  setupApiRoutes(app);
  
  // Initialize WebSocket server if HTTP server is provided
  let wss: WebSocketServer | undefined;
  
  if (httpServer) {
    // Create WebSocket server on /ws path
    wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws' 
    });

    // Handle WebSocket connections
    wss.on('connection', function connection(ws: WebSocket) {
      console.log('WebSocket client connected');

      // Handle messages from client
      ws.on('message', function incoming(message) {
        console.log('Received message:', message.toString());
        
        try {
          // Parse the message
          const data = JSON.parse(message.toString());
          
          // Handle different message types
          switch (data.type) {
            case 'ping':
              // Respond with pong to keep connection alive
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
              
            case 'command':
              // Handle client commands
              console.log('Client command:', data.command);
              
              // Process different commands
              switch (data.command) {
                case 'get_model_status':
                  // Fetch model status
                  const models = getAvailableModels();
                  const localStatus = getLocalLLMStatus();
                  const quotaStatus = apiQuotaManager.getUsageSummary();
                  
                  // Send model status response
                  ws.send(JSON.stringify({
                    type: 'model_status',
                    data: {
                      localModel: localStatus,
                      availableModels: models,
                      quotaStatus: quotaStatus,
                      timestamp: Date.now()
                    },
                    timestamp: Date.now()
                  }));
                  break;
                
                default:
                  // Unknown command
                  ws.send(JSON.stringify({
                    type: 'error',
                    error: `Unknown command: ${data.command}`,
                    timestamp: Date.now()
                  }));
                  break;
              }
              break;
              
            case 'event':
              // Handle client events 
              console.log('Client event:', data.event);
              
              // Echo back the event with acknowledgment
              ws.send(JSON.stringify({ 
                type: 'eventAck', 
                eventId: data.eventId,
                timestamp: Date.now() 
              }));
              break;
              
            case 'chat':
              // Handle chat message 
              console.log('Chat message:', data.message);
              
              // Acknowledge receipt of message
              ws.send(JSON.stringify({ 
                type: 'chatAck', 
                messageId: data.messageId,
                timestamp: Date.now() 
              }));
              break;
              
            case 'chat_message':
              // Handle chat_message from the client
              console.log('Chat message received:', data.message);
              
              (async () => {
                try {
                  // Acknowledge receipt immediately
                  ws.send(JSON.stringify({ 
                    type: 'message_received', 
                    messageId: Date.now(),
                    timestamp: Date.now() 
                  }));
                  
                  // Process the message using our AI processing pipeline
                  const response = await processWithEnhancedContext(
                    data.message,
                    data.history || [],
                    data.sessionId || 'ws-session-' + Date.now(),
                    {
                      preferredModel: 'local', // Prefer local model for WebSocket interactions
                      ...data
                    }
                  );
                  
                  // Send the chat response back to the client
                  ws.send(JSON.stringify({ 
                    type: 'chat_response', 
                    message: response,
                    timestamp: Date.now() 
                  }));
                  
                  // Handle voice response if requested
                  if (data.isVoiceResponse) {
                    // In a real implementation, this would call a TTS service
                    // For now, we'll just send a fallback response
                    ws.send(JSON.stringify({ 
                      type: 'voice_response', 
                      audioUrl: '', // Would be a real URL in production
                      fallback: true,
                      reason: 'TTS implementation is a stub',
                      timestamp: Date.now() 
                    }));
                  }
                  
                  // Send any insights data if requested
                  if (data.includeInsights) {
                    // Generate some simple insights
                    const insights = [
                      {
                        type: 'entity',
                        label: 'Generated insight',
                        content: 'This is a placeholder for real insights that would be generated in production.'
                      }
                    ];
                    
                    ws.send(JSON.stringify({ 
                      type: 'insights', 
                      insights,
                      timestamp: Date.now() 
                    }));
                  }
                  
                } catch (error) {
                  console.error('Error processing chat_message:', error);
                  ws.send(JSON.stringify({ 
                    type: 'chat_error', 
                    error: String(error) || 'An unknown error occurred',
                    timestamp: Date.now() 
                  }));
                }
              })();
              break;
              
            default:
              // Handle unknown message types
              console.log('Unknown message type:', data.type);
              ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Unknown message type',
                originalType: data.type,
                timestamp: Date.now() 
              }));
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
          // Send error response
          ws.send(JSON.stringify({ 
            type: 'error', 
            error: String(err),
            timestamp: Date.now() 
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send welcome message
      ws.send(JSON.stringify({ 
        type: 'welcome', 
        message: 'Connected to Xeno AI WebSocket server',
        timestamp: Date.now() 
      }));
    });

    // Log WebSocket server status
    console.log('WebSocket server initialized on path: /ws');
  }

  // Return the WebSocket server instance
  return wss;
}