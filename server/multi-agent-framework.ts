/**
 * Multi-Agent Collaboration Framework
 * 
 * This module enables coordination between different specialized AI agents by:
 * - Defining agent roles and capabilities
 * - Managing agent communication and collaboration
 * - Orchestrating complex workflows across multiple agents
 * - Resolving conflicts between agents
 * - Aggregating results from multiple agents
 */

import { generateStructuredCompletion } from './ai-service';

/**
 * Types of specialized agents in the system
 */
export enum AgentType {
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  CREATOR = 'creator',
  CRITIC = 'critic',
  PLANNER = 'planner',
  EXECUTOR = 'executor',
  MEDIATOR = 'mediator',
  TEACHER = 'teacher',
  ETHICAL_GUARDIAN = 'ethical_guardian',
  DOMAIN_EXPERT = 'domain_expert'
}

/**
 * Agent workflow states
 */
export enum WorkflowState {
  IDLE = 'idle',
  THINKING = 'thinking',
  WORKING = 'working',
  WAITING = 'waiting',
  REVIEWING = 'reviewing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Interface for an agent in the system
 */
export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  state: WorkflowState;
  specializations?: string[];
  context?: { [key: string]: any };
}

/**
 * Interface for a task that can be assigned to agents
 */
export interface Task {
  id: string;
  description: string;
  requiredCapabilities: string[];
  preferredAgentTypes?: AgentType[];
  priority: number;
  dependencies?: string[];
  context?: { [key: string]: any };
  deadline?: Date;
}

/**
 * Task assignment to an agent
 */
export interface TaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: Date;
  state: WorkflowState;
  progress: number;
  output?: any;
  notes?: string[];
}

/**
 * Agent communication message
 */
export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string | 'all';
  content: string;
  timestamp: Date;
  relatedTaskId?: string;
  messageType: 'request' | 'response' | 'update' | 'question' | 'conflict' | 'resolution';
  context?: { [key: string]: any };
}

/**
 * Workflow for coordinating multiple agents
 */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  assignments: TaskAssignment[];
  messages: AgentMessage[];
  state: WorkflowState;
  context?: { [key: string]: any };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Conflict between agents
 */
export interface AgentConflict {
  id: string;
  workflowId: string;
  taskId: string;
  conflictingAgentIds: string[];
  description: string;
  proposals: { agentId: string; proposal: string }[];
  resolution?: string;
  resolvedBy?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// In-memory store for agents, tasks, assignments, workflows, and conflicts
const agents: Agent[] = [];
const tasks: Task[] = [];
const assignments: TaskAssignment[] = [];
const workflows: Workflow[] = [];
const conflicts: AgentConflict[] = [];
const messages: AgentMessage[] = [];

/**
 * Register a new agent in the system
 */
export function registerAgent(
  type: AgentType,
  name: string,
  description: string,
  capabilities: string[],
  specializations: string[] = []
): Agent {
  const id = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const agent: Agent = {
    id,
    type,
    name,
    description,
    capabilities,
    specializations,
    state: WorkflowState.IDLE
  };
  
  agents.push(agent);
  return agent;
}

/**
 * Create a new task that can be assigned to agents
 */
export function createTask(
  description: string,
  requiredCapabilities: string[],
  options: {
    priority?: number;
    preferredAgentTypes?: AgentType[];
    dependencies?: string[];
    context?: { [key: string]: any };
    deadline?: Date;
  } = {}
): Task {
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const task: Task = {
    id,
    description,
    requiredCapabilities,
    priority: options.priority || 5,
    preferredAgentTypes: options.preferredAgentTypes,
    dependencies: options.dependencies,
    context: options.context,
    deadline: options.deadline
  };
  
  tasks.push(task);
  return task;
}

/**
 * Assign a task to an agent
 */
export function assignTask(
  taskId: string,
  agentId: string
): TaskAssignment | null {
  // Find task and agent
  const task = tasks.find(t => t.id === taskId);
  const agent = agents.find(a => a.id === agentId);
  
  if (!task || !agent) {
    return null;
  }
  
  // Check if agent has required capabilities
  const hasCapabilities = task.requiredCapabilities.every(
    cap => agent.capabilities.includes(cap)
  );
  
  if (!hasCapabilities) {
    return null;
  }
  
  // Create assignment
  const assignment: TaskAssignment = {
    taskId,
    agentId,
    assignedAt: new Date(),
    state: WorkflowState.WAITING,
    progress: 0
  };
  
  // Update agent state
  agent.state = WorkflowState.WAITING;
  
  assignments.push(assignment);
  return assignment;
}

/**
 * Find the most suitable agent for a task
 */
export function findSuitableAgent(taskId: string): Agent | null {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;
  
  // Filter agents with required capabilities
  const capableAgents = agents.filter(agent => 
    task.requiredCapabilities.every(cap => agent.capabilities.includes(cap)) &&
    agent.state === WorkflowState.IDLE
  );
  
  if (capableAgents.length === 0) return null;
  
  // Score agents based on suitability
  const scoredAgents = capableAgents.map(agent => {
    let score = 0;
    
    // Score based on matching capabilities
    score += task.requiredCapabilities.filter(cap => 
      agent.capabilities.includes(cap)
    ).length;
    
    // Bonus for preferred agent types
    if (task.preferredAgentTypes?.includes(agent.type)) {
      score += 3;
    }
    
    // Bonus for specializations that might be relevant
    if (agent.specializations) {
      const relevantSpecializations = agent.specializations.filter(spec =>
        task.description.toLowerCase().includes(spec.toLowerCase())
      );
      score += relevantSpecializations.length;
    }
    
    return { agent, score };
  });
  
  // Sort by score (descending)
  scoredAgents.sort((a, b) => b.score - a.score);
  
  return scoredAgents[0]?.agent || null;
}

/**
 * Create a new workflow to coordinate multiple agents
 */
export function createWorkflow(
  name: string,
  description: string,
  initialTasks: Task[] = []
): Workflow {
  const id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add tasks to the global tasks array
  initialTasks.forEach(task => {
    if (!tasks.some(t => t.id === task.id)) {
      tasks.push(task);
    }
  });
  
  const workflow: Workflow = {
    id,
    name,
    description,
    tasks: initialTasks,
    assignments: [],
    messages: [],
    state: WorkflowState.IDLE,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  workflows.push(workflow);
  return workflow;
}

/**
 * Send a message between agents
 */
export function sendAgentMessage(
  fromAgentId: string,
  toAgentId: string | 'all',
  content: string,
  options: {
    relatedTaskId?: string;
    messageType?: 'request' | 'response' | 'update' | 'question' | 'conflict' | 'resolution';
    context?: { [key: string]: any };
  } = {}
): AgentMessage {
  const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const message: AgentMessage = {
    id,
    fromAgentId,
    toAgentId,
    content,
    timestamp: new Date(),
    relatedTaskId: options.relatedTaskId,
    messageType: options.messageType || 'update',
    context: options.context
  };
  
  messages.push(message);
  
  // If message is part of a workflow, add it to the workflow
  if (options.relatedTaskId) {
    const task = tasks.find(t => t.id === options.relatedTaskId);
    if (task) {
      const relatedWorkflow = workflows.find(w => 
        w.tasks.some(t => t.id === options.relatedTaskId)
      );
      
      if (relatedWorkflow) {
        relatedWorkflow.messages.push(message);
        relatedWorkflow.updatedAt = new Date();
      }
    }
  }
  
  return message;
}

/**
 * Get messages relevant to an agent
 */
export function getAgentMessages(
  agentId: string,
  options: {
    since?: Date;
    messageType?: 'request' | 'response' | 'update' | 'question' | 'conflict' | 'resolution';
    relatedTaskId?: string;
  } = {}
): AgentMessage[] {
  return messages.filter(msg => 
    (msg.toAgentId === agentId || msg.toAgentId === 'all') &&
    (!options.since || msg.timestamp >= options.since) &&
    (!options.messageType || msg.messageType === options.messageType) &&
    (!options.relatedTaskId || msg.relatedTaskId === options.relatedTaskId)
  );
}

/**
 * Register a conflict between agents
 */
export function registerConflict(
  workflowId: string,
  taskId: string,
  conflictingAgentIds: string[],
  description: string,
  proposals: { agentId: string; proposal: string }[]
): AgentConflict {
  const id = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const conflict: AgentConflict = {
    id,
    workflowId,
    taskId,
    conflictingAgentIds,
    description,
    proposals,
    createdAt: new Date()
  };
  
  conflicts.push(conflict);
  
  // Update workflow and task state
  const workflow = workflows.find(w => w.id === workflowId);
  if (workflow) {
    const taskAssignments = workflow.assignments.filter(a => a.taskId === taskId);
    taskAssignments.forEach(assignment => {
      assignment.state = WorkflowState.WAITING;
      assignment.notes = assignment.notes || [];
      assignment.notes.push(`Conflict registered: ${description}`);
    });
    
    workflow.updatedAt = new Date();
  }
  
  return conflict;
}

/**
 * Resolve a conflict between agents
 */
export function resolveConflict(
  conflictId: string,
  resolution: string,
  resolvedBy: string
): AgentConflict | null {
  const conflict = conflicts.find(c => c.id === conflictId);
  if (!conflict) return null;
  
  conflict.resolution = resolution;
  conflict.resolvedBy = resolvedBy;
  conflict.resolvedAt = new Date();
  
  // Update workflow and task state
  const workflow = workflows.find(w => w.id === conflict.workflowId);
  if (workflow) {
    const taskAssignments = workflow.assignments.filter(a => a.taskId === conflict.taskId);
    taskAssignments.forEach(assignment => {
      assignment.state = WorkflowState.WORKING;
      assignment.notes = assignment.notes || [];
      assignment.notes.push(`Conflict resolved: ${resolution}`);
    });
    
    workflow.updatedAt = new Date();
  }
  
  return conflict;
}

/**
 * Automatically resolve a conflict using a mediator agent
 */
export async function autoResolveConflict(
  conflictId: string,
  mediatorAgentId: string
): Promise<AgentConflict | null> {
  const conflict = conflicts.find(c => c.id === conflictId);
  const mediator = agents.find(a => a.id === mediatorAgentId);
  
  if (!conflict || !mediator || mediator.type !== AgentType.MEDIATOR) {
    return null;
  }
  
  try {
    const task = tasks.find(t => t.id === conflict.taskId);
    
    if (!task) return null;
    
    const conflictData = {
      description: conflict.description,
      task: task.description,
      proposals: conflict.proposals
    };
    
    const conflictJson = JSON.stringify(conflictData, null, 2);
    
    const prompt = `
      As a mediator agent, resolve the following conflict:
      
      ${conflictJson}
      
      Provide a fair and balanced resolution that takes all proposals into account.
    `;
    
    const systemPrompt = `
      You are an expert mediator agent in a multi-agent system.
      Your role is to analyze conflicts between agents and provide optimal resolutions.
      Consider the following in your resolution:
      - The original task objectives
      - The merit of each agent's proposal
      - Possibility of combining or synthesizing proposals
      - Fairness to all agents involved
      - Optimal outcome for the overall system
      
      Provide a clear, concise resolution with justification for your decision.
    `;
    
    interface MediationResponse {
      resolution: string;
      justification: string;
    }
    
    const mediation = await generateStructuredCompletion<MediationResponse>(
      prompt,
      'gpt-4o',
      0.7,
      1500,
      systemPrompt
    );
    
    // Update the conflict with the resolution
    conflict.resolution = mediation.resolution;
    conflict.resolvedBy = mediatorAgentId;
    conflict.resolvedAt = new Date();
    
    // Send messages to all involved agents
    conflict.conflictingAgentIds.forEach(agentId => {
      sendAgentMessage(
        mediatorAgentId,
        agentId,
        `Conflict resolution: ${mediation.resolution}\n\nJustification: ${mediation.justification}`,
        {
          relatedTaskId: conflict.taskId,
          messageType: 'resolution'
        }
      );
    });
    
    // Update workflow and task state
    const workflow = workflows.find(w => w.id === conflict.workflowId);
    if (workflow) {
      const taskAssignments = workflow.assignments.filter(a => a.taskId === conflict.taskId);
      taskAssignments.forEach(assignment => {
        assignment.state = WorkflowState.WORKING;
        assignment.notes = assignment.notes || [];
        assignment.notes.push(`Conflict automatically resolved: ${mediation.resolution}`);
      });
      
      workflow.updatedAt = new Date();
    }
    
    return conflict;
  } catch (error) {
    console.error('Error in automatic conflict resolution:', error);
    return null;
  }
}

/**
 * Update a task's progress and state
 */
export function updateTaskProgress(
  taskId: string,
  agentId: string,
  progress: number,
  state: WorkflowState,
  output?: any,
  notes?: string
): TaskAssignment | null {
  // Find the assignment
  const assignment = assignments.find(a => a.taskId === taskId && a.agentId === agentId);
  if (!assignment) return null;
  
  // Update assignment
  assignment.progress = Math.min(100, Math.max(0, progress));
  assignment.state = state;
  
  if (output !== undefined) {
    assignment.output = output;
  }
  
  if (notes) {
    assignment.notes = assignment.notes || [];
    assignment.notes.push(notes);
  }
  
  // Update agent state
  const agent = agents.find(a => a.id === agentId);
  if (agent) {
    agent.state = state;
  }
  
  // Update workflow
  const workflow = workflows.find(w => 
    w.assignments.some(a => a.taskId === taskId && a.agentId === agentId)
  );
  
  if (workflow) {
    workflow.updatedAt = new Date();
    
    // Check if all tasks are completed
    const allCompleted = workflow.assignments.every(a => 
      a.state === WorkflowState.COMPLETED
    );
    
    if (allCompleted) {
      workflow.state = WorkflowState.COMPLETED;
      workflow.completedAt = new Date();
    }
  }
  
  return assignment;
}

/**
 * Generate a dynamic workflow based on a complex task
 */
export async function generateDynamicWorkflow(
  taskDescription: string,
  availableAgentTypes: AgentType[] = Object.values(AgentType)
): Promise<Workflow> {
  try {
    const agentDescriptions = availableAgentTypes.map(type => {
      const agentDescription = {
        type,
        capabilities: agents
          .filter(a => a.type === type)
          .flatMap(a => a.capabilities)
          .filter((c, i, self) => self.indexOf(c) === i) // unique capabilities
      };
      return agentDescription;
    });
    
    const dataContext = {
      taskDescription,
      availableAgentTypes: agentDescriptions
    };
    
    const contextJson = JSON.stringify(dataContext, null, 2);
    
    const prompt = `
      Generate a multi-agent workflow to accomplish the following task:
      
      ${contextJson}
      
      Design a comprehensive workflow with subtasks assigned to appropriate agent types.
    `;
    
    const systemPrompt = `
      You are an expert workflow designer for multi-agent systems.
      Create a detailed workflow plan to accomplish the given task.
      Your workflow should include:
      - A descriptive name for the workflow
      - A clear overall description
      - A set of subtasks that decompose the main task
      - For each subtask:
        * A clear description
        * Required capabilities
        * Preferred agent types
        * Priority level (1-10)
        * Dependencies on other subtasks (if any)
      
      Ensure that the subtasks are properly sequenced and that the workflow leverages the strengths of different agent types.
    `;
    
    interface WorkflowPlan {
      name: string;
      description: string;
      subtasks: {
        description: string;
        requiredCapabilities: string[];
        preferredAgentTypes: AgentType[];
        priority: number;
        dependencies: string[];
      }[];
    }
    
    const workflowPlan = await generateStructuredCompletion<WorkflowPlan>(
      prompt,
      'gpt-4o',
      0.7,
      2500,
      systemPrompt
    );
    
    // Create tasks from the plan
    const createdTasks: Task[] = workflowPlan.subtasks.map((subtask, index) => 
      createTask(
        subtask.description,
        subtask.requiredCapabilities,
        {
          priority: subtask.priority,
          preferredAgentTypes: subtask.preferredAgentTypes,
          dependencies: subtask.dependencies,
          context: { subtaskIndex: index }
        }
      )
    );
    
    // Create the workflow
    const workflow = createWorkflow(
      workflowPlan.name,
      workflowPlan.description,
      createdTasks
    );
    
    // Attempt to assign tasks to suitable agents
    createdTasks.forEach(task => {
      // Skip tasks with unsatisfied dependencies
      const dependenciesUnsatisfied = task.dependencies?.some(depDesc => 
        !workflow.assignments.some(a => 
          a.taskId === tasks.find(t => t.description === depDesc)?.id
        )
      );
      
      if (dependenciesUnsatisfied) return;
      
      const suitableAgent = findSuitableAgent(task.id);
      if (suitableAgent) {
        const assignment = assignTask(task.id, suitableAgent.id);
        if (assignment) {
          workflow.assignments.push(assignment);
        }
      }
    });
    
    return workflow;
  } catch (error) {
    console.error('Error generating dynamic workflow:', error);
    
    // Create a simple fallback workflow
    const fallbackTask = createTask(
      taskDescription,
      ['general_purpose'],
      { priority: 10 }
    );
    
    return createWorkflow(
      'Fallback Workflow',
      `Simplified workflow for: ${taskDescription}`,
      [fallbackTask]
    );
  }
}

/**
 * Aggregate results from multiple agents into a cohesive response
 */
export async function aggregateResults(
  results: { agentId: string; output: any }[],
  task: string
): Promise<{
  aggregatedResult: any;
  confidence: number;
  methodology: string;
  attributions: { agentId: string; contribution: string }[];
}> {
  try {
    const agentInfo = results.map(result => {
      const agent = agents.find(a => a.id === result.agentId);
      return {
        agentType: agent?.type || 'unknown',
        agentName: agent?.name || 'Unknown Agent',
        output: result.output
      };
    });
    
    const resultsData = {
      task,
      agentResults: agentInfo
    };
    
    const dataJson = JSON.stringify(resultsData, null, 2);
    
    const prompt = `
      Aggregate the following results from multiple agents into a cohesive response:
      
      ${dataJson}
      
      Create an integrated output that combines the strengths of each agent's contribution.
    `;
    
    const systemPrompt = `
      You are an expert result aggregator for multi-agent systems.
      Analyze the outputs from different agents and create a cohesive, integrated result.
      Your aggregation should:
      - Combine the unique insights from each agent
      - Resolve any contradictions or inconsistencies
      - Provide a confidence assessment for the aggregated result
      - Explain the methodology used for aggregation
      - Give proper attribution to each agent's contributions
      
      Produce a well-structured, comprehensive aggregation that leverages the strengths of each agent.
    `;
    
    interface AggregationResponse {
      aggregatedResult: any;
      confidence: number;
      methodology: string;
      attributions: { agentId: string; contribution: string }[];
    }
    
    const aggregation = await generateStructuredCompletion<AggregationResponse>(
      prompt,
      'gpt-4o',
      0.7,
      2500,
      systemPrompt
    );
    
    return aggregation;
  } catch (error) {
    console.error('Error aggregating agent results:', error);
    
    // Create a simple fallback aggregation
    return {
      aggregatedResult: results.map(r => r.output).join('\n\n'),
      confidence: 30,
      methodology: 'Simple concatenation due to aggregation error',
      attributions: results.map(r => ({
        agentId: r.agentId,
        contribution: 'Direct contribution, unaggregated'
      }))
    };
  }
}

/**
 * Initialize the multi-agent system with standard agents
 */
export function initializeMultiAgentSystem(): Agent[] {
  // Clear existing agents
  agents.length = 0;
  
  // Create a set of standard agents
  const standardAgents: {
    type: AgentType;
    name: string;
    description: string;
    capabilities: string[];
    specializations?: string[];
  }[] = [
    {
      type: AgentType.RESEARCHER,
      name: 'Research Agent',
      description: 'Gathers and analyzes information from multiple sources',
      capabilities: ['information_gathering', 'data_analysis', 'source_evaluation', 'question_answering'],
      specializations: ['scientific_research', 'market_research', 'academic_research']
    },
    {
      type: AgentType.ANALYST,
      name: 'Analysis Agent',
      description: 'Performs deep analysis of data and information',
      capabilities: ['data_analysis', 'pattern_recognition', 'critical_thinking', 'statistical_analysis'],
      specializations: ['financial_analysis', 'trend_analysis', 'competitive_analysis']
    },
    {
      type: AgentType.CREATOR,
      name: 'Creative Agent',
      description: 'Generates creative content and solutions',
      capabilities: ['content_generation', 'ideation', 'storytelling', 'visual_design'],
      specializations: ['copywriting', 'product_design', 'content_creation']
    },
    {
      type: AgentType.CRITIC,
      name: 'Critical Evaluation Agent',
      description: 'Evaluates and critiques outputs for improvement',
      capabilities: ['quality_assessment', 'error_detection', 'improvement_suggestions', 'standards_compliance'],
      specializations: ['fact_checking', 'logical_evaluation', 'quality_control']
    },
    {
      type: AgentType.PLANNER,
      name: 'Planning Agent',
      description: 'Creates structured plans to achieve goals',
      capabilities: ['goal_decomposition', 'task_sequencing', 'resource_planning', 'risk_assessment'],
      specializations: ['project_planning', 'strategic_planning', 'process_planning']
    },
    {
      type: AgentType.EXECUTOR,
      name: 'Execution Agent',
      description: 'Efficiently executes tasks following plans',
      capabilities: ['task_execution', 'automation', 'process_management', 'adaptive_execution'],
      specializations: ['implementation', 'process_execution', 'operational_tasks']
    },
    {
      type: AgentType.MEDIATOR,
      name: 'Mediation Agent',
      description: 'Resolves conflicts and facilitates collaboration',
      capabilities: ['conflict_resolution', 'consensus_building', 'negotiation', 'fair_evaluation'],
      specializations: ['decision_mediation', 'team_coordination', 'dispute_resolution']
    },
    {
      type: AgentType.TEACHER,
      name: 'Teaching Agent',
      description: 'Explains concepts and provides educational content',
      capabilities: ['explanation', 'curriculum_design', 'knowledge_assessment', 'adaptive_teaching'],
      specializations: ['technical_teaching', 'concept_explanation', 'skill_development']
    },
    {
      type: AgentType.ETHICAL_GUARDIAN,
      name: 'Ethics Agent',
      description: 'Ensures ethical compliance and responsible AI use',
      capabilities: ['ethical_evaluation', 'bias_detection', 'privacy_protection', 'value_alignment'],
      specializations: ['ethical_review', 'responsible_ai', 'ethical_safeguards']
    },
    {
      type: AgentType.DOMAIN_EXPERT,
      name: 'Domain Expert Agent',
      description: 'Provides specialized knowledge in specific domains',
      capabilities: ['domain_knowledge', 'expert_reasoning', 'specialized_analysis', 'technical_advice'],
      specializations: ['technology', 'business', 'science', 'arts', 'health']
    }
  ];
  
  // Register each standard agent
  const registeredAgents = standardAgents.map(agent => 
    registerAgent(
      agent.type,
      agent.name,
      agent.description,
      agent.capabilities,
      agent.specializations
    )
  );
  
  return registeredAgents;
}