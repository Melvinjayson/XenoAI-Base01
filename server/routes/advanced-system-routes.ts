/**
 * Advanced System Routes
 * 
 * API routes for the advanced system components:
 * - Asynchronous processing
 * - Security and privacy
 * - Multi-agent collaboration
 * - Meta-learning capabilities
 */

import { Router, Request, Response } from 'express';
import { advancedSystemIntegration } from '../advanced-system-integration';
import { asyncProcessingManager, TaskPriority } from '../async-processing-manager';
import { securityPrivacyManager, DataCategory } from '../security-privacy-manager';
import { advancedAgentEcosystem, AgentRole } from '../advanced-agent-ecosystem';
import { metaLearningEngine, LearningSourceType, InsightType } from '../meta-learning-engine';
import { errorRecoverySystem } from '../error-recovery-system';

const router = Router();

//
// Async Processing Routes
//

// Get all tasks
router.get('/async/tasks', (req: Request, res: Response) => {
  try {
    const { sessionId, userId, status, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    
    // Get tasks
    const tasks = asyncProcessingManager.getTasks({
      sessionId: sessionId as string,
      userId: userId as string,
      status: status as any,
      limit: limitNum
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get task by ID
router.get('/async/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = asyncProcessingManager.getTask(id);
    
    if (!task) {
      return res.status(404).json({ error: `Task with ID ${id} not found` });
    }
    
    res.status(200).json(task);
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get task statistics
router.get('/async/stats', (req: Request, res: Response) => {
  try {
    const stats = asyncProcessingManager.getStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting task statistics:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Cancel a task
router.post('/async/tasks/:id/cancel', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = asyncProcessingManager.cancelTask(id);
    
    if (!success) {
      return res.status(404).json({ error: `Task with ID ${id} not found or could not be canceled` });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error canceling task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

//
// Security and Privacy Routes
//

// Get security events
router.get('/security/events', (req: Request, res: Response) => {
  try {
    const { type, severity, userId, startDate, endDate, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const startDateObj = startDate ? new Date(startDate as string) : undefined;
    const endDateObj = endDate ? new Date(endDate as string) : undefined;
    
    // Get events
    const events = securityPrivacyManager.getSecurityEvents({
      type: type as any,
      severity: severity as any,
      userId: userId as string,
      startDate: startDateObj,
      endDate: endDateObj,
      limit: limitNum
    });
    
    res.status(200).json(events);
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get transparency records
router.get('/security/transparency', (req: Request, res: Response) => {
  try {
    const { operation, dataCategory, startDate, endDate, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const startDateObj = startDate ? new Date(startDate as string) : undefined;
    const endDateObj = endDate ? new Date(endDate as string) : undefined;
    
    // Get records
    const records = securityPrivacyManager.getTransparencyRecords({
      operation: operation as string,
      dataCategory: dataCategory as DataCategory,
      startDate: startDateObj,
      endDate: endDateObj,
      limit: limitNum
    });
    
    res.status(200).json(records);
  } catch (error) {
    console.error('Error getting transparency records:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Generate transparency explanation
router.get('/security/transparency/:id/explain', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const explanation = securityPrivacyManager.generateTransparencyExplanation(id);
    
    res.status(200).json({ id, explanation });
  } catch (error) {
    console.error('Error generating transparency explanation:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get user privacy settings
router.get('/security/privacy/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { category } = req.query;
    
    const settings = securityPrivacyManager.getUserPrivacySettings(
      userId,
      category as DataCategory
    );
    
    if (!settings) {
      return res.status(404).json({ error: `Privacy settings for user ${userId} not found` });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Update user privacy setting
router.put('/security/privacy/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { category, level } = req.body;
    
    if (!category || !level) {
      return res.status(400).json({ error: 'Category and level are required' });
    }
    
    securityPrivacyManager.setUserPrivacySetting(
      userId,
      category as DataCategory,
      level
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating privacy setting:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

//
// Multi-Agent Collaboration Routes
//

// Create a collaboration task
router.post('/agents/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, goal, context, leadRole, participatingRoles, sessionId, userId } = req.body;
    
    if (!title || !goal) {
      return res.status(400).json({ error: 'Title and goal are required' });
    }
    
    const taskId = await advancedSystemIntegration.createCollaborationTask(
      title,
      description || '',
      goal,
      context || '',
      {
        leadRole,
        participatingRoles,
        sessionId,
        userId
      }
    );
    
    res.status(201).json({ taskId });
  } catch (error) {
    console.error('Error creating collaboration task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get all collaboration tasks
router.get('/agents/tasks', (req: Request, res: Response) => {
  try {
    const { sessionId, userId, status, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    
    // Get tasks
    const tasks = advancedAgentEcosystem.listTasks({
      sessionId: sessionId as string,
      userId: userId as string,
      status: status as any,
      limit: limitNum
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error getting collaboration tasks:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get collaboration task by ID
router.get('/agents/tasks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includeEnhancements } = req.query;
    
    // Determine whether to include additional data
    const enhanced = includeEnhancements === 'true';
    
    if (enhanced) {
      const taskData = advancedSystemIntegration.getTaskStatus(id);
      return res.status(200).json(taskData);
    } else {
      const task = advancedAgentEcosystem.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: `Task with ID ${id} not found` });
      }
      
      res.status(200).json(task);
    }
  } catch (error) {
    console.error('Error getting collaboration task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get available agent roles
router.get('/agents/roles', (req: Request, res: Response) => {
  try {
    // Convert enum to array of objects with name and description
    const roles = Object.entries(AgentRole).map(([key, value]) => ({
      id: value,
      name: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ')
    }));
    
    res.status(200).json(roles);
  } catch (error) {
    console.error('Error getting agent roles:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

//
// Meta-Learning Routes
//

// Record user feedback
router.post('/learning/feedback', (req: Request, res: Response) => {
  try {
    const { type, content, sessionId, userId, taskId, rating } = req.body;
    
    if (!type || !content) {
      return res.status(400).json({ error: 'Type and content are required' });
    }
    
    // Validate type
    if (!['positive', 'negative', 'suggestion'].includes(type)) {
      return res.status(400).json({ error: 'Type must be positive, negative, or suggestion' });
    }
    
    // Record feedback
    advancedSystemIntegration.recordFeedback(
      type,
      content,
      {
        sessionId,
        userId,
        taskId,
        rating
      }
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get insights
router.get('/learning/insights', (req: Request, res: Response) => {
  try {
    const { type, priority, minConfidence, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const minConfidenceNum = minConfidence ? parseFloat(minConfidence as string) : 0;
    
    // Get insights
    const insights = metaLearningEngine.getInsights({
      type: type as InsightType,
      priority: priority as any,
      minConfidence: minConfidenceNum,
      limit: limitNum
    });
    
    res.status(200).json(insights);
  } catch (error) {
    console.error('Error getting insights:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get knowledge gaps
router.get('/learning/knowledge-gaps', (req: Request, res: Response) => {
  try {
    const { status, priority, limit } = req.query;
    
    // Convert string parameters to appropriate types
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    
    // Get knowledge gaps
    const gaps = metaLearningEngine.getKnowledgeGaps({
      status: status as any,
      priority: priority as any,
      limit: limitNum
    });
    
    res.status(200).json(gaps);
  } catch (error) {
    console.error('Error getting knowledge gaps:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get user preferences
router.get('/learning/preferences/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    
    const preferences = metaLearningEngine.getUserPreferences(
      userId,
      type as string
    );
    
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Generate proactive insights
router.post('/learning/proactive-insights', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId, context } = req.body;
    
    const insights = await advancedSystemIntegration.generateInsights({
      sessionId,
      userId,
      context
    });
    
    res.status(200).json(insights);
  } catch (error) {
    console.error('Error generating proactive insights:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

//
// System Health Routes
//

// Run a system health check
router.get('/system/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await advancedSystemIntegration.runHealthCheck();
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Error running system health check:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get error statistics
router.get('/system/errors', (req: Request, res: Response) => {
  try {
    const stats = errorRecoverySystem.getErrorStats();
    const recentErrors = errorRecoverySystem.getRecentErrors(10);
    
    res.status(200).json({
      stats,
      recentErrors
    });
  } catch (error) {
    console.error('Error getting error statistics:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get error patterns
router.get('/system/error-patterns', (req: Request, res: Response) => {
  try {
    const patterns = errorRecoverySystem.getErrorPatterns();
    
    res.status(200).json(patterns);
  } catch (error) {
    console.error('Error getting error patterns:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

export default router;