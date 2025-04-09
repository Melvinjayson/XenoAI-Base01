/**
 * Server Entry Point
 * 
 * This is the main entry point for the server application.
 * It sets up the Express server and all necessary middleware.
 */

import express from 'express';
import * as path from 'path';
import { createServer } from 'http';
import { setupRoutes } from './routes';
import { initializeLocalLLM } from './local-llm';
import { isOpenAIAvailable } from './openai';
import { getAvailableModels } from './model-selector';
import { setupVite, serveStatic, log } from './vite';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { initializeCrossDomainIntegration } from './cross-domain-integration';
import { ChatMessage } from './types';
import { 
  enhancedContextAnalysis, 
  enhancedContextDetection, 
  processWithEnhancedContext,
  suggestFollowUpQuestion,
  suggestNextActions
} from './context-integration';
import { advancedSystemIntegration } from './advanced-system-integration';

// Create Express application
const app = express();

// Create HTTP server
const httpServer = createServer(app);

// Import validation middleware
import { validateRequest } from './middleware/requestValidation';

// Middleware
app.use(express.json({ limit: '50mb' })); // For parsing application/json with large payload support
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(validateRequest); // Add request validation

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log once the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.originalUrl}`);
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Set up API routes and WebSocket server
const webSocketServer = setupRoutes(app, httpServer);
console.log(`WebSocket server available: ${!!webSocketServer}`);

// Start the server
const PORT = process.env.PORT || 5000;

// Initialize local model and check API availability on startup, then set up frontend serving
(async () => {
  console.log('Checking AI service availability...');
  
  try {
    // Check OpenAI API availability
    const openAIAvailable = await isOpenAIAvailable();
    console.log(`OpenAI API available: ${openAIAvailable}`);
    
    // Initialize enhanced memory manager
    console.log('Initializing enhanced memory system...');
    
    // Skip full memory initialization in development to speed up startup
    const skipMemoryInit = process.env.NODE_ENV !== 'production';
    
    if (skipMemoryInit) {
      console.log('Skipping full memory initialization in development mode.');
      enhancedMemoryManager.initializeDefault();
      console.log('Memory system initialized with defaults.');
    } else {
      // Preload a default session memory
      const defaultSessionId = 'default-session';
      // Initialize with a system message
      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'Memory system initialized with default session.',
        timestamp: new Date()
      };
      
      await enhancedMemoryManager.processMessage(
        systemMessage,
        defaultSessionId,
        [], // No entities for system message
        ['system', 'initialization'] // Basic topics
      );
      console.log('Enhanced memory system initialized completely.');
    }
    
    // Initialize local model
    console.log('Initializing local language model...');
    const localLLMInitialized = await initializeLocalLLM();
    console.log(`Local language model initialized: ${localLLMInitialized}`);
    
    if (!localLLMInitialized) {
      // Try once more with a delay
      console.log('Retrying local model initialization...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retrySuccess = await initializeLocalLLM();
      console.log(`Local model initialization retry: ${retrySuccess ? 'successful' : 'failed'}`);
    }
    
    // Log available models
    const models = getAvailableModels();
    console.log('Available AI models:');
    models.forEach(model => {
      console.log(`- ${model.name} (${model.provider}) - ${model.category} category`);
    });
    
    // Initialize cross-domain integration system
    initializeCrossDomainIntegration();
    
    // Initialize advanced system components (if available)
    try {
      console.log('Initializing advanced system components...');
      advancedSystemIntegration.initialize();
      console.log('Advanced system components initialized successfully.');
    } catch (error) {
      console.warn('Error initializing advanced components:', error);
      console.log('Continuing with limited functionality.');
    }

    // Setup Vite for development or serve static files for production
    if (process.env.NODE_ENV === 'production') {
      serveStatic(app);
    } else {
      await setupVite(app, httpServer);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
  
  // Start server regardless of AI service availability
  const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
})();