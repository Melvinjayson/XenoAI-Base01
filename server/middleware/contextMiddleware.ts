/**
 * Context Middleware
 * 
 * This middleware analyzes conversation context from incoming API requests
 * and attaches the extracted context to the request object for use in route handlers.
 */

import { Request, Response, NextFunction } from 'express';
import { analyzeConversationContext } from '../context-agent';
import { ConversationContext } from '../context-agent';

// Extend the Express Request type to include context
declare global {
  namespace Express {
    interface Request {
      context?: ConversationContext;
    }
  }
}

/**
 * Middleware that analyzes the message context for all incoming requests
 * that contain a messages array in the request body
 */
export async function contextMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if no messages in the request
    if (!req.body || !req.body.messages || !Array.isArray(req.body.messages)) {
      return next();
    }

    // Analyze the context using messages from the request body
    const context = await analyzeConversationContext(req.body.messages);
    
    // Attach the context to the request object
    req.context = context;
    
    // Log context info for debugging (optional)
    console.log(`Context middleware: Detected primary context type: ${context.primaryType}`);
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error analyzing context in middleware:", error);
    // Don't fail the request, just continue without context
    next();
  }
}

/**
 * Lightweight context middleware that only uses rule-based analysis
 * Useful for routes where AI-based analysis would be too expensive
 */
export async function lightContextMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip if no messages in the request
    if (!req.body || !req.body.messages || !Array.isArray(req.body.messages)) {
      return next();
    }

    // Use non-AI contextual analysis
    const context = await analyzeConversationContext(req.body.messages, false);
    
    // Attach the context to the request object
    req.context = context;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error in light context middleware:", error);
    // Don't fail the request, just continue without context
    next();
  }
}

/**
 * Middleware to validate whether the request context is appropriate
 * for the specific API endpoint (optional security measure)
 */
export function contextValidation(allowedContextTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation if no context
    if (!req.context) {
      return next();
    }

    // Check if the context type is allowed
    if (allowedContextTypes.includes(req.context.primaryType)) {
      return next();
    }

    // Check secondary context types as fallback
    if (req.context.secondaryTypes && req.context.secondaryTypes.some(type => allowedContextTypes.includes(type))) {
      return next();
    }

    // Context type not allowed, but we'll still allow the request with a warning
    console.warn(`Context validation: ${req.context.primaryType} not in allowed types: ${allowedContextTypes.join(', ')}`);
    next();
  };
}