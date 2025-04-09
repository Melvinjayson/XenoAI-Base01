/**
 * Evaluation Routes
 * 
 * This module defines API routes for the evaluation system
 * and self-diagnostic capabilities.
 */

import express, { Request, Response } from 'express';
import * as evaluationSystem from '../evaluation-system';

const router = express.Router();

// Evaluate response quality
router.post('/api/evaluation/response', async (req: Request, res: Response) => {
  try {
    const { query, response, context, groundTruth } = req.body;
    
    if (!query || !response) {
      return res.status(400).json({ error: 'Query and response are required' });
    }
    
    const evaluation = await evaluationSystem.evaluateResponse(
      query,
      response,
      context,
      groundTruth
    );
    
    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error evaluating response:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Record interaction for tracking
router.post('/api/evaluation/record', (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Type and data are required' });
    }
    
    const interactionId = evaluationSystem.recordInteraction(type, data);
    
    res.status(200).json({ 
      success: true, 
      interactionId,
      message: 'Interaction recorded successfully' 
    });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Add evaluation to a previously recorded interaction
router.post('/api/evaluation/add-evaluation', (req: Request, res: Response) => {
  try {
    const { interactionId, evaluation } = req.body;
    
    if (!interactionId || !evaluation) {
      return res.status(400).json({ error: 'Interaction ID and evaluation are required' });
    }
    
    const success = evaluationSystem.addEvaluationToInteraction(interactionId, evaluation);
    
    if (!success) {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Evaluation added successfully' 
    });
  } catch (error) {
    console.error('Error adding evaluation:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get performance stats
router.post('/api/evaluation/stats', (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime) {
      return res.status(400).json({ error: 'Start time is required' });
    }
    
    const stats = evaluationSystem.generatePerformanceStats(
      new Date(startTime),
      endTime ? new Date(endTime) : undefined
    );
    
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error generating performance stats:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Generate performance report
router.post('/api/evaluation/report', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime } = req.body;
    
    if (!startTime) {
      return res.status(400).json({ error: 'Start time is required' });
    }
    
    const report = await evaluationSystem.generatePerformanceReport(
      new Date(startTime),
      endTime ? new Date(endTime) : undefined
    );
    
    res.status(200).json(report);
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Run system diagnostic
router.get('/api/evaluation/diagnostic', async (req: Request, res: Response) => {
  try {
    const diagnostic = await evaluationSystem.runSystemDiagnostic();
    
    res.status(200).json(diagnostic);
  } catch (error) {
    console.error('Error running system diagnostic:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Analyze feedback patterns
router.post('/api/evaluation/feedback-analysis', async (req: Request, res: Response) => {
  try {
    const { feedbackItems } = req.body;
    
    if (!feedbackItems || !Array.isArray(feedbackItems) || feedbackItems.length === 0) {
      return res.status(400).json({ error: 'Valid feedback items array is required' });
    }
    
    const analysis = await evaluationSystem.analyzeFeedbackPatterns(feedbackItems);
    
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Generate an improvement plan
router.post('/api/evaluation/improvement-plan', async (req: Request, res: Response) => {
  try {
    const { report, diagnostic } = req.body;
    
    if (!report || !diagnostic) {
      return res.status(400).json({ error: 'Performance report and diagnostic are required' });
    }
    
    const plan = await evaluationSystem.generateImprovementPlan(report, diagnostic);
    
    res.status(200).json(plan);
  } catch (error) {
    console.error('Error generating improvement plan:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

export default router;