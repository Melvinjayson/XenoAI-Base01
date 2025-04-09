/**
 * Multi-Agent Framework Routes
 * 
 * This module defines API routes for the multi-agent collaboration framework
 * and related capabilities.
 */

import express, { Request, Response } from 'express';
import * as multiAgentFramework from '../multi-agent-framework';

const router = express.Router();

// Initialize multi-agent system
router.post('/api/agents/initialize', (req: Request, res: Response) => {
  try {
    const agents = multiAgentFramework.initializeMultiAgentSystem();
    
    res.status(200).json({ 
      success: true, 
      agentCount: agents.length,
      agents: agents.map(a => ({
        id: a.id,
        type: a.type,
        name: a.name
      }))
    });
  } catch (error) {
    console.error('Error initializing agent system:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Register a new agent
router.post('/api/agents/register', (req: Request, res: Response) => {
  try {
    const { type, name, description, capabilities, specializations } = req.body;
    
    if (!type || !name || !description || !capabilities) {
      return res.status(400).json({ error: 'Type, name, description, and capabilities are required' });
    }
    
    const agent = multiAgentFramework.registerAgent(
      type,
      name,
      description,
      capabilities,
      specializations
    );
    
    res.status(201).json(agent);
  } catch (error) {
    console.error('Error registering agent:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Create a new task
router.post('/api/agents/tasks', (req: Request, res: Response) => {
  try {
    const { description, requiredCapabilities, options } = req.body;
    
    if (!description || !requiredCapabilities) {
      return res.status(400).json({ error: 'Description and required capabilities are required' });
    }
    
    const task = multiAgentFramework.createTask(
      description,
      requiredCapabilities,
      options
    );
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Assign a task to an agent
router.post('/api/agents/assign', (req: Request, res: Response) => {
  try {
    const { taskId, agentId } = req.body;
    
    if (!taskId || !agentId) {
      return res.status(400).json({ error: 'Task ID and agent ID are required' });
    }
    
    const assignment = multiAgentFramework.assignTask(taskId, agentId);
    
    if (!assignment) {
      return res.status(400).json({ error: 'Could not assign task to agent' });
    }
    
    res.status(200).json(assignment);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Find a suitable agent for a task
router.get('/api/agents/find-suitable/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    const agent = multiAgentFramework.findSuitableAgent(taskId);
    
    if (!agent) {
      return res.status(404).json({ error: 'No suitable agent found' });
    }
    
    res.status(200).json(agent);
  } catch (error) {
    console.error('Error finding suitable agent:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Create a workflow
router.post('/api/agents/workflows', (req: Request, res: Response) => {
  try {
    const { name, description, initialTasks } = req.body;
    
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }
    
    const workflow = multiAgentFramework.createWorkflow(
      name,
      description,
      initialTasks
    );
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Generate a dynamic workflow
router.post('/api/agents/workflows/generate', async (req: Request, res: Response) => {
  try {
    const { taskDescription, availableAgentTypes } = req.body;
    
    if (!taskDescription) {
      return res.status(400).json({ error: 'Task description is required' });
    }
    
    const workflow = await multiAgentFramework.generateDynamicWorkflow(
      taskDescription,
      availableAgentTypes
    );
    
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error generating workflow:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Send a message between agents
router.post('/api/agents/messages', (req: Request, res: Response) => {
  try {
    const { fromAgentId, toAgentId, content, options } = req.body;
    
    if (!fromAgentId || !toAgentId || !content) {
      return res.status(400).json({ error: 'From agent ID, to agent ID, and content are required' });
    }
    
    const message = multiAgentFramework.sendAgentMessage(
      fromAgentId,
      toAgentId,
      content,
      options
    );
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Get messages for an agent
router.get('/api/agents/messages/:agentId', (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { since, messageType, relatedTaskId } = req.query;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    const options: any = {};
    
    if (since) {
      options.since = new Date(since as string);
    }
    
    if (messageType) {
      options.messageType = messageType as string;
    }
    
    if (relatedTaskId) {
      options.relatedTaskId = relatedTaskId as string;
    }
    
    const messages = multiAgentFramework.getAgentMessages(agentId, options);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Register a conflict
router.post('/api/agents/conflicts', (req: Request, res: Response) => {
  try {
    const { workflowId, taskId, conflictingAgentIds, description, proposals } = req.body;
    
    if (!workflowId || !taskId || !conflictingAgentIds || !description || !proposals) {
      return res.status(400).json({ error: 'Workflow ID, task ID, conflicting agent IDs, description, and proposals are required' });
    }
    
    const conflict = multiAgentFramework.registerConflict(
      workflowId,
      taskId,
      conflictingAgentIds,
      description,
      proposals
    );
    
    res.status(201).json(conflict);
  } catch (error) {
    console.error('Error registering conflict:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Resolve a conflict
router.post('/api/agents/conflicts/:conflictId/resolve', (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { resolution, resolvedBy } = req.body;
    
    if (!conflictId || !resolution || !resolvedBy) {
      return res.status(400).json({ error: 'Conflict ID, resolution, and resolved by are required' });
    }
    
    const conflict = multiAgentFramework.resolveConflict(
      conflictId,
      resolution,
      resolvedBy
    );
    
    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' });
    }
    
    res.status(200).json(conflict);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Auto-resolve a conflict
router.post('/api/agents/conflicts/:conflictId/auto-resolve', async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { mediatorAgentId } = req.body;
    
    if (!conflictId || !mediatorAgentId) {
      return res.status(400).json({ error: 'Conflict ID and mediator agent ID are required' });
    }
    
    const conflict = await multiAgentFramework.autoResolveConflict(
      conflictId,
      mediatorAgentId
    );
    
    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found or could not be auto-resolved' });
    }
    
    res.status(200).json(conflict);
  } catch (error) {
    console.error('Error auto-resolving conflict:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Update task progress
router.post('/api/agents/tasks/:taskId/progress', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { agentId, progress, state, output, notes } = req.body;
    
    if (!taskId || !agentId || progress === undefined || !state) {
      return res.status(400).json({ error: 'Task ID, agent ID, progress, and state are required' });
    }
    
    const assignment = multiAgentFramework.updateTaskProgress(
      taskId,
      agentId,
      progress,
      state,
      output,
      notes
    );
    
    if (!assignment) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }
    
    res.status(200).json(assignment);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

// Aggregate results from multiple agents
router.post('/api/agents/aggregate-results', async (req: Request, res: Response) => {
  try {
    const { results, task } = req.body;
    
    if (!results || !task) {
      return res.status(400).json({ error: 'Results and task are required' });
    }
    
    const aggregation = await multiAgentFramework.aggregateResults(
      results,
      task
    );
    
    res.status(200).json(aggregation);
  } catch (error) {
    console.error('Error aggregating results:', error);
    res.status(500).json({ error: String(error) || 'An unknown error occurred' });
  }
});

export default router;