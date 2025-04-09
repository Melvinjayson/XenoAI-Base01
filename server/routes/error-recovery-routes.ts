/**
 * Error Recovery Routes
 * 
 * This module defines API routes for the error recovery system
 * and related capabilities.
 */

import express, { Request, Response } from 'express';
import * as errorRecoverySystem from '../error-recovery-system';

const router = express.Router();

// Register an error
router.post('/errors/register', (req: Request, res: Response) => {
  try {
    const { message, stack, component, operation, category, severity, context, userImpact } = req.body;
    
    if (!message || !component || !operation) {
      return res.status(400).json({ error: 'Message, component, and operation are required' });
    }
    
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }
    
    const errorRecord = errorRecoverySystem.registerError(
      error,
      component,
      operation,
      {
        category,
        severity,
        context,
        userImpact
      }
    );
    
    res.status(201).json(errorRecord);
  } catch (error) {
    console.error('Error registering error:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Resolve an error
router.post('/errors/:errorId/resolve', (req: Request, res: Response) => {
  try {
    const { errorId } = req.params;
    const { resolutionNote } = req.body;
    
    if (!errorId) {
      return res.status(400).json({ error: 'Error ID is required' });
    }
    
    const success = errorRecoverySystem.resolveError(errorId, resolutionNote);
    
    if (!success) {
      return res.status(404).json({ error: 'Error not found' });
    }
    
    res.status(200).json({ success: true, message: 'Error resolved successfully' });
  } catch (error) {
    console.error('Error resolving error:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Record a successful operation
router.post('/errors/record-success', (req: Request, res: Response) => {
  try {
    const { component } = req.body;
    
    if (!component) {
      return res.status(400).json({ error: 'Component is required' });
    }
    
    errorRecoverySystem.recordSuccessfulOperation(component);
    
    res.status(200).json({ success: true, message: 'Success recorded' });
  } catch (error) {
    console.error('Error recording success:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get system health status
router.get('/system/health', (req: Request, res: Response) => {
  try {
    const healthStatus = errorRecoverySystem.getSystemHealthStatus();
    
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Error getting system health status:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Analyze error patterns
router.get('/errors/analyze', async (req: Request, res: Response) => {
  try {
    const analysis = await errorRecoverySystem.analyzeErrorPatterns();
    
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing error patterns:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

export default router;