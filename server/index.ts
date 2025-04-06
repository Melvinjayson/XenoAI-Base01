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

// Set up API routes
setupRoutes(app);

// Start the server
const PORT = process.env.PORT || 5000;

// Initialize local model and check API availability on startup, then set up frontend serving
(async () => {
  console.log('Checking AI service availability...');
  
  try {
    // Check OpenAI API availability
    const openAIAvailable = await isOpenAIAvailable();
    console.log(`OpenAI API available: ${openAIAvailable}`);
    
    // Initialize local model
    await initializeLocalLLM();
    
    // Log available models
    const models = getAvailableModels();
    console.log('Available AI models:');
    models.forEach(model => {
      console.log(`- ${model.name} (${model.provider}) - ${model.category} category`);
    });

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