/**
 * Ethical Routes
 * 
 * This module defines API routes for the ethical guardian
 * and related services.
 */

import express, { Request, Response } from 'express';
import * as ethicalGuardian from '../ethical-guardian';

const router = express.Router();

// Ethical content evaluation
router.post('/api/ethical/evaluate', async (req: Request, res: Response) => {
  try {
    const { content, context, principles } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const evaluation = await ethicalGuardian.evaluateContent(
      content,
      context,
      principles
    );
    
    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error evaluating content:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Decision explanation
router.post('/api/ethical/explain-decision', async (req: Request, res: Response) => {
  try {
    const { decision, context, factors } = req.body;
    
    if (!decision) {
      return res.status(400).json({ error: 'Decision is required' });
    }
    
    const explanation = await ethicalGuardian.explainDecision(
      decision,
      context,
      factors
    );
    
    res.status(200).json(explanation);
  } catch (error) {
    console.error('Error explaining decision:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Action compliance check
router.post('/api/ethical/check-compliance', async (req: Request, res: Response) => {
  try {
    const { action, guidelines } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    const compliance = await ethicalGuardian.checkActionCompliance(
      action,
      guidelines
    );
    
    res.status(200).json(compliance);
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Ethical reflection
router.post('/api/ethical/reflect', async (req: Request, res: Response) => {
  try {
    const { situation, stakeholders } = req.body;
    
    if (!situation) {
      return res.status(400).json({ error: 'Situation is required' });
    }
    
    const reflection = await ethicalGuardian.generateEthicalReflection(
      situation,
      stakeholders
    );
    
    res.status(200).json(reflection);
  } catch (error) {
    console.error('Error generating reflection:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Content filtering
router.post('/api/ethical/filter-content', (req: Request, res: Response) => {
  try {
    const { content, sensitivePatterns } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const filtered = ethicalGuardian.filterSensitiveContent(
      content,
      sensitivePatterns
    );
    
    res.status(200).json(filtered);
  } catch (error) {
    console.error('Error filtering content:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

export default router;