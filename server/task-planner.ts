/**
 * Dynamic Task Planning and Management System
 * 
 * This module provides capabilities for breaking down complex goals into manageable tasks,
 * tracking progress, and adapting plans based on changing conditions, user feedback, and
 * system insights. It enables autonomous task management and planning for the AI system.
 */

import { OpenAI } from "openai";
import { storage } from "./storage";
import { ChatMessage } from "./types";
import { apiQuotaManager, ApiService } from "./api-quota-manager";
import { conversationMemory, MemoryType } from "./conversation-memory";
import { metaLearningEngine } from "./meta-learning-engine";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Task Types and Status
export enum TaskType {
  RESEARCH = 'research',
  ANALYSIS = 'analysis',
  CREATION = 'creation',
  DECISION = 'decision',
  INTEGRATION = 'integration',
  VERIFICATION = 'verification'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  parentTaskId?: string;
  subtasks?: string[]; // IDs of child tasks
  dependencies?: string[]; // IDs of tasks this task depends on
  goalId: string; // ID of the parent goal
  sessionId: string;
  userId?: string;
  assignedTo?: string; // For multi-agent systems
  estimatedDuration?: number; // In minutes
  progress: number; // 0-100
  attachedResources?: string[]; // IDs of attached resources (files, links, etc.)
  notes: string[];
  metadata?: Record<string, any>;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  status: 'active' | 'completed' | 'archived';
  priority: TaskPriority;
  deadline?: Date;
  tasks: string[]; // IDs of related tasks
  sessionId: string;
  userId?: string;
  progress: number; // 0-100
  parentGoalId?: string;
  subgoals?: string[]; // IDs of child goals
  attachedResources?: string[]; // IDs of attached resources
  notes: string[];
  metadata?: Record<string, any>;
}

interface TaskDecomposition {
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  estimatedDuration?: number;
  dependencies?: string[];
  subtasks?: {
    title: string;
    description: string;
    type: TaskType;
    priority: TaskPriority;
    estimatedDuration?: number;
  }[];
}

interface PlanAnalysis {
  strengths: string[];
  weaknesses: string[];
  uncertainties: string[];
  recommendations: string[];
  criticalPath: string[]; // IDs of tasks on the critical path
  estimatedTotalDuration: number; // In minutes
}

/**
 * Task Planning and Management System
 */
export class TaskPlanner {
  private static instance: TaskPlanner;
  
  // Cache for faster access
  private tasksCache: Map<string, Task> = new Map(); // Task ID -> Task
  private goalsCache: Map<string, Goal> = new Map(); // Goal ID -> Goal
  
  // Chain of thought reasoning system
  private reasoningHistory: Map<string, any[]> = new Map(); // Goal ID -> reasoning steps
  
  private constructor() {
    console.log('Task Planner initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): TaskPlanner {
    if (!TaskPlanner.instance) {
      TaskPlanner.instance = new TaskPlanner();
    }
    return TaskPlanner.instance;
  }
  
  /**
   * Create a goal from user input
   * @param title Goal title
   * @param description Goal description
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @param priority Goal priority (optional)
   * @param deadline Goal deadline (optional)
   * @returns Created goal
   */
  public async createGoal(
    title: string,
    description: string,
    sessionId: string,
    userId?: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    deadline?: Date
  ): Promise<Goal> {
    try {
      const now = new Date();
      const goalId = `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const goal: Goal = {
        id: goalId,
        title,
        description,
        createdAt: now,
        updatedAt: now,
        status: 'active',
        priority,
        deadline,
        tasks: [],
        sessionId,
        userId,
        progress: 0,
        notes: []
      };
      
      // Cache the goal
      this.goalsCache.set(goalId, goal);
      
      // Persist to storage
      if (storage && typeof storage.saveGoal === 'function') {
        await storage.saveGoal(goal);
      }
      
      // Start goal decomposition process
      await this.decomposeGoal(goal);
      
      return goal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }
  
  /**
   * Get a goal by ID
   * @param goalId Goal ID
   * @returns Goal or null if not found
   */
  public async getGoal(goalId: string): Promise<Goal | null> {
    try {
      // Check cache first
      if (this.goalsCache.has(goalId)) {
        return this.goalsCache.get(goalId)!;
      }
      
      // Try to get from storage
      if (storage && typeof storage.getGoal === 'function') {
        const goal = await storage.getGoal(goalId);
        
        if (goal) {
          // Update cache
          this.goalsCache.set(goalId, goal);
          return goal;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting goal:', error);
      return null;
    }
  }
  
  /**
   * Get goals by session ID
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @param includeArchived Whether to include archived goals (default: false)
   * @returns Array of goals
   */
  public async getGoalsBySession(
    sessionId: string,
    userId?: string,
    includeArchived: boolean = false
  ): Promise<Goal[]> {
    try {
      let goals: Goal[] = [];
      
      // Try to get from storage
      if (storage && typeof storage.getGoalsBySession === 'function') {
        goals = await storage.getGoalsBySession(sessionId, userId);
        
        // Update cache
        for (const goal of goals) {
          this.goalsCache.set(goal.id, goal);
        }
      }
      
      // Filter out archived goals if requested
      if (!includeArchived) {
        goals = goals.filter(goal => goal.status !== 'archived');
      }
      
      return goals;
    } catch (error) {
      console.error('Error getting goals by session:', error);
      return [];
    }
  }
  
  /**
   * Update a goal
   * @param goalId Goal ID
   * @param updates Goal updates
   * @returns Updated goal or null if not found
   */
  public async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      // Get current goal
      const goal = await this.getGoal(goalId);
      
      if (!goal) {
        return null;
      }
      
      // Apply updates
      const updatedGoal: Goal = {
        ...goal,
        ...updates,
        id: goal.id, // Ensure ID doesn't change
        updatedAt: new Date()
      };
      
      // Update cache
      this.goalsCache.set(goalId, updatedGoal);
      
      // Persist to storage
      if (storage && typeof storage.updateGoal === 'function') {
        await storage.updateGoal(goalId, updatedGoal);
      }
      
      // Check if the goal is completed
      if (updatedGoal.status === 'completed' && !updatedGoal.completedAt) {
        updatedGoal.completedAt = new Date();
        
        // Persist completion date
        if (storage && typeof storage.updateGoal === 'function') {
          await storage.updateGoal(goalId, updatedGoal);
        }
      }
      
      return updatedGoal;
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  }
  
  /**
   * Decompose a goal into tasks
   * @param goal Goal to decompose
   * @returns Array of created task IDs
   */
  public async decomposeGoal(goal: Goal): Promise<string[]> {
    try {
      console.log(`Decomposing goal: ${goal.title}`);
      
      // Check if goal already has tasks
      if (goal.tasks.length > 0) {
        // Get existing tasks
        const tasks = await Promise.all(
          goal.tasks.map(taskId => this.getTask(taskId))
        );
        
        // Filter out nulls
        const validTasks = tasks.filter(task => task !== null) as Task[];
        
        if (validTasks.length > 0) {
          console.log(`Goal already has ${validTasks.length} tasks. Skipping decomposition.`);
          return goal.tasks;
        }
      }
      
      // Use OpenAI to decompose the goal if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Get relevant conversation context
        let contextMemories = '';
        
        try {
          // Retrieve session memories related to the goal
          const memories = await conversationMemory.retrieveMemories({
            sessionId: goal.sessionId,
            limit: 5
          });
          
          if (memories.length > 0) {
            contextMemories = "Recent conversation context:\n" + 
              memories.map(m => `- ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n');
          }
        } catch (error) {
          console.error('Error retrieving context memories:', error);
        }
        
        const decompositionPrompt = `
          I need to decompose this goal into a set of manageable tasks:
          
          GOAL TITLE: ${goal.title}
          GOAL DESCRIPTION: ${goal.description}
          PRIORITY: ${goal.priority}
          ${goal.deadline ? `DEADLINE: ${goal.deadline.toISOString().split('T')[0]}` : ''}
          
          ${contextMemories ? contextMemories : ''}
          
          Please break this goal down into a comprehensive set of tasks with these characteristics:
          1. Each task should be specific and actionable
          2. Include task type (research, analysis, creation, decision, integration, verification)
          3. Include priority level (low, medium, high, critical)
          4. Include dependencies between tasks if applicable
          5. Include estimated duration in minutes if possible
          6. Further decompose complex tasks into subtasks
          
          Return the decomposition as a JSON array of tasks, with each task having these properties:
          {
            "title": "Task title",
            "description": "Detailed description of what needs to be done",
            "type": "research|analysis|creation|decision|integration|verification",
            "priority": "low|medium|high|critical",
            "estimatedDuration": number of minutes (optional),
            "dependencies": ["title of dependency 1", "title of dependency 2"] (optional),
            "subtasks": [
              {
                "title": "Subtask title",
                "description": "Subtask description",
                "type": "research|analysis|creation|decision|integration|verification",
                "priority": "low|medium|high|critical",
                "estimatedDuration": number (optional)
              }
            ] (optional)
          }
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: decompositionPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const decompositionResult = JSON.parse(openaiResponse.choices[0].message.content);
            const tasks = Array.isArray(decompositionResult.tasks) ? decompositionResult.tasks : [];
            
            if (tasks.length === 0) {
              console.error('No tasks returned from decomposition');
              return this.createDefaultTasks(goal);
            }
            
            // Process the decomposition to create tasks
            return this.createTasksFromDecomposition(tasks, goal);
          }
        } catch (error) {
          console.error('Error decomposing goal with OpenAI:', error);
        }
      }
      
      // Fallback: Create default tasks if OpenAI is unavailable or failed
      return this.createDefaultTasks(goal);
    } catch (error) {
      console.error('Error decomposing goal:', error);
      return this.createDefaultTasks(goal);
    }
  }
  
  /**
   * Create tasks from a goal decomposition
   * @param decomposition Task decomposition results
   * @param goal Parent goal
   * @returns Array of created task IDs
   */
  private async createTasksFromDecomposition(
    decomposition: TaskDecomposition[],
    goal: Goal
  ): Promise<string[]> {
    try {
      const taskIds: string[] = [];
      const taskTitleToIdMap = new Map<string, string>();
      
      // First pass: Create all tasks without dependencies
      for (const taskData of decomposition) {
        const taskId = await this.createTask(
          taskData.title,
          taskData.description,
          taskData.type,
          goal.id,
          goal.sessionId,
          goal.userId,
          taskData.priority,
          taskData.estimatedDuration
        );
        
        taskIds.push(taskId);
        taskTitleToIdMap.set(taskData.title, taskId);
        
        // Create subtasks if any
        if (taskData.subtasks && taskData.subtasks.length > 0) {
          const subtaskIds: string[] = [];
          
          for (const subtaskData of taskData.subtasks) {
            const subtaskId = await this.createTask(
              subtaskData.title,
              subtaskData.description,
              subtaskData.type,
              goal.id,
              goal.sessionId,
              goal.userId,
              subtaskData.priority,
              subtaskData.estimatedDuration,
              taskId // Parent task ID
            );
            
            subtaskIds.push(subtaskId);
          }
          
          // Update parent task with subtasks
          const parentTask = await this.getTask(taskId);
          if (parentTask) {
            await this.updateTask(taskId, {
              subtasks: subtaskIds
            });
          }
        }
      }
      
      // Second pass: Update tasks with dependencies
      for (const taskData of decomposition) {
        if (taskData.dependencies && taskData.dependencies.length > 0) {
          const taskId = taskTitleToIdMap.get(taskData.title);
          
          if (taskId) {
            const dependencyIds = taskData.dependencies
              .map(depTitle => taskTitleToIdMap.get(depTitle))
              .filter(id => id !== undefined) as string[];
            
            if (dependencyIds.length > 0) {
              await this.updateTask(taskId, {
                dependencies: dependencyIds
              });
            }
          }
        }
      }
      
      // Update goal with tasks
      await this.updateGoal(goal.id, {
        tasks: taskIds
      });
      
      // Analyze the plan
      await this.analyzePlan(goal.id);
      
      return taskIds;
    } catch (error) {
      console.error('Error creating tasks from decomposition:', error);
      return [];
    }
  }
  
  /**
   * Create default tasks for a goal (fallback if decomposition fails)
   * @param goal Parent goal
   * @returns Array of created task IDs
   */
  private async createDefaultTasks(goal: Goal): Promise<string[]> {
    try {
      const taskIds: string[] = [];
      
      // Create basic research task
      const researchTaskId = await this.createTask(
        `Research for ${goal.title}`,
        `Gather information and resources needed to accomplish ${goal.title}`,
        TaskType.RESEARCH,
        goal.id,
        goal.sessionId,
        goal.userId,
        TaskPriority.HIGH
      );
      
      taskIds.push(researchTaskId);
      
      // Create analysis task
      const analysisTaskId = await this.createTask(
        `Analyze requirements for ${goal.title}`,
        `Analyze the requirements and constraints for ${goal.title}`,
        TaskType.ANALYSIS,
        goal.id,
        goal.sessionId,
        goal.userId,
        TaskPriority.HIGH,
        undefined,
        researchTaskId // Depends on research
      );
      
      taskIds.push(analysisTaskId);
      
      // Create implementation task
      const implementationTaskId = await this.createTask(
        `Implement ${goal.title}`,
        `Execute the main work required to accomplish ${goal.title}`,
        TaskType.CREATION,
        goal.id,
        goal.sessionId,
        goal.userId,
        TaskPriority.HIGH,
        undefined,
        analysisTaskId // Depends on analysis
      );
      
      taskIds.push(implementationTaskId);
      
      // Create verification task
      const verificationTaskId = await this.createTask(
        `Verify ${goal.title}`,
        `Verify that ${goal.title} has been accomplished successfully`,
        TaskType.VERIFICATION,
        goal.id,
        goal.sessionId,
        goal.userId,
        TaskPriority.MEDIUM,
        undefined,
        implementationTaskId // Depends on implementation
      );
      
      taskIds.push(verificationTaskId);
      
      // Update goal with tasks
      await this.updateGoal(goal.id, {
        tasks: taskIds
      });
      
      return taskIds;
    } catch (error) {
      console.error('Error creating default tasks:', error);
      return [];
    }
  }
  
  /**
   * Create a new task
   * @param title Task title
   * @param description Task description
   * @param type Task type
   * @param goalId Parent goal ID
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @param priority Task priority (optional)
   * @param estimatedDuration Estimated duration in minutes (optional)
   * @param parentTaskId Parent task ID for subtasks (optional)
   * @param dependencies Task dependencies (optional)
   * @returns Task ID
   */
  public async createTask(
    title: string,
    description: string,
    type: TaskType,
    goalId: string,
    sessionId: string,
    userId?: string,
    priority: TaskPriority = TaskPriority.MEDIUM,
    estimatedDuration?: number,
    parentTaskId?: string,
    dependencies?: string[]
  ): Promise<string> {
    try {
      const now = new Date();
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      const task: Task = {
        id: taskId,
        title,
        description,
        type,
        status: TaskStatus.PENDING,
        priority,
        createdAt: now,
        updatedAt: now,
        goalId,
        sessionId,
        userId,
        progress: 0,
        notes: [],
        estimatedDuration,
        parentTaskId,
        dependencies
      };
      
      // Cache the task
      this.tasksCache.set(taskId, task);
      
      // Persist to storage
      if (storage && typeof storage.saveTask === 'function') {
        await storage.saveTask(task);
      }
      
      // If this is a subtask, update the parent task
      if (parentTaskId) {
        const parentTask = await this.getTask(parentTaskId);
        
        if (parentTask) {
          const subtasks = parentTask.subtasks || [];
          subtasks.push(taskId);
          
          await this.updateTask(parentTaskId, {
            subtasks
          });
        }
      }
      
      return taskId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
  
  /**
   * Get a task by ID
   * @param taskId Task ID
   * @returns Task or null if not found
   */
  public async getTask(taskId: string): Promise<Task | null> {
    try {
      // Check cache first
      if (this.tasksCache.has(taskId)) {
        return this.tasksCache.get(taskId)!;
      }
      
      // Try to get from storage
      if (storage && typeof storage.getTask === 'function') {
        const task = await storage.getTask(taskId);
        
        if (task) {
          // Update cache
          this.tasksCache.set(taskId, task);
          return task;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting task:', error);
      return null;
    }
  }
  
  /**
   * Get tasks by goal ID
   * @param goalId Goal ID
   * @returns Array of tasks
   */
  public async getTasksByGoal(goalId: string): Promise<Task[]> {
    try {
      // Try to get from storage
      if (storage && typeof storage.getTasksByGoal === 'function') {
        const tasks = await storage.getTasksByGoal(goalId);
        
        // Update cache
        for (const task of tasks) {
          this.tasksCache.set(task.id, task);
        }
        
        return tasks;
      }
      
      // Fallback: Get goal and its task IDs, then get tasks
      const goal = await this.getGoal(goalId);
      
      if (goal && goal.tasks.length > 0) {
        const tasks = await Promise.all(
          goal.tasks.map(taskId => this.getTask(taskId))
        );
        
        // Filter out nulls
        return tasks.filter(task => task !== null) as Task[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting tasks by goal:', error);
      return [];
    }
  }
  
  /**
   * Update a task
   * @param taskId Task ID
   * @param updates Task updates
   * @returns Updated task or null if not found
   */
  public async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      // Get current task
      const task = await this.getTask(taskId);
      
      if (!task) {
        return null;
      }
      
      const prevStatus = task.status;
      const prevProgress = task.progress;
      
      // Apply updates
      const updatedTask: Task = {
        ...task,
        ...updates,
        id: task.id, // Ensure ID doesn't change
        updatedAt: new Date()
      };
      
      // Handle status changes
      if (updates.status && updates.status !== prevStatus) {
        // If task is completed, set completedAt
        if (updates.status === TaskStatus.COMPLETED && !updatedTask.completedAt) {
          updatedTask.completedAt = new Date();
          updatedTask.progress = 100;
        }
        
        // If task is cancelled, ensure progress is 0
        if (updates.status === TaskStatus.CANCELLED) {
          updatedTask.progress = 0;
        }
      }
      
      // Update cache
      this.tasksCache.set(taskId, updatedTask);
      
      // Persist to storage
      if (storage && typeof storage.updateTask === 'function') {
        await storage.updateTask(taskId, updatedTask);
      }
      
      // If status or progress changed, update parent goal progress
      if (updates.status || (updates.progress !== undefined && updates.progress !== prevProgress)) {
        await this.updateGoalProgress(updatedTask.goalId);
      }
      
      // If task is completed or blocked, check impact on dependent tasks
      if (updates.status === TaskStatus.COMPLETED || updates.status === TaskStatus.BLOCKED) {
        await this.updateDependentTasks(taskId, updatedTask.status);
      }
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      return null;
    }
  }
  
  /**
   * Update the progress of a goal based on its tasks
   * @param goalId Goal ID
   * @returns Updated goal or null if not found
   */
  private async updateGoalProgress(goalId: string): Promise<Goal | null> {
    try {
      // Get goal
      const goal = await this.getGoal(goalId);
      
      if (!goal) {
        return null;
      }
      
      // Get goal tasks
      const tasks = await this.getTasksByGoal(goalId);
      
      if (tasks.length === 0) {
        return goal;
      }
      
      // Calculate overall progress
      let totalProgress = 0;
      let completedTasks = 0;
      
      for (const task of tasks) {
        totalProgress += task.progress;
        
        if (task.status === TaskStatus.COMPLETED) {
          completedTasks++;
        }
      }
      
      const averageProgress = Math.round(totalProgress / tasks.length);
      
      // Update goal progress
      const updatedGoal = await this.updateGoal(goalId, {
        progress: averageProgress
      });
      
      // If all tasks are completed, mark goal as completed
      if (completedTasks === tasks.length && tasks.length > 0) {
        return this.updateGoal(goalId, {
          status: 'completed',
          completedAt: new Date()
        });
      }
      
      return updatedGoal;
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }
  }
  
  /**
   * Update tasks that depend on a completed or blocked task
   * @param taskId Completed or blocked task ID
   * @param status New status of the dependency
   */
  private async updateDependentTasks(taskId: string, status: TaskStatus): Promise<void> {
    try {
      // Find tasks that depend on this task
      let dependentTasks: Task[] = [];
      
      if (storage && typeof storage.getTasksWithDependency === 'function') {
        // Efficient storage query if available
        dependentTasks = await storage.getTasksWithDependency(taskId);
      } else {
        // Fallback: Get all tasks from cache and filter
        dependentTasks = Array.from(this.tasksCache.values())
          .filter(task => task.dependencies && task.dependencies.includes(taskId));
      }
      
      // Process each dependent task
      for (const task of dependentTasks) {
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.BLOCKED) {
          if (status === TaskStatus.COMPLETED) {
            // Check if all dependencies are completed
            const allDependenciesCompleted = await this.areAllDependenciesCompleted(task);
            
            if (allDependenciesCompleted) {
              // Unblock task if all dependencies are completed
              await this.updateTask(task.id, {
                status: TaskStatus.PENDING
              });
            }
          } else if (status === TaskStatus.BLOCKED) {
            // Block dependent task if dependency is blocked
            await this.updateTask(task.id, {
              status: TaskStatus.BLOCKED,
              notes: [...(task.notes || []), `Blocked because dependency ${taskId} is blocked`]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating dependent tasks:', error);
    }
  }
  
  /**
   * Check if all dependencies of a task are completed
   * @param task Task to check
   * @returns Whether all dependencies are completed
   */
  private async areAllDependenciesCompleted(task: Task): Promise<boolean> {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    
    // Get all dependencies
    const dependencies = await Promise.all(
      task.dependencies.map(depId => this.getTask(depId))
    );
    
    // Filter out nulls
    const validDependencies = dependencies.filter(dep => dep !== null) as Task[];
    
    // Check if all dependencies are completed
    return validDependencies.every(dep => dep.status === TaskStatus.COMPLETED);
  }
  
  /**
   * Analyze a task plan for a goal
   * @param goalId Goal ID
   * @returns Plan analysis
   */
  public async analyzePlan(goalId: string): Promise<PlanAnalysis | null> {
    try {
      // Get goal
      const goal = await this.getGoal(goalId);
      
      if (!goal) {
        return null;
      }
      
      // Get tasks
      const tasks = await this.getTasksByGoal(goalId);
      
      if (tasks.length === 0) {
        return null;
      }
      
      // Use OpenAI for sophisticated analysis if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Format tasks for the prompt
        const tasksData = tasks.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          status: task.status,
          dependencies: task.dependencies || [],
          estimatedDuration: task.estimatedDuration
        }));
        
        const analysisPrompt = `
          Please analyze this task plan for the goal "${goal.title}":
          
          ${JSON.stringify(tasksData, null, 2)}
          
          Provide a critical analysis of the plan with these components:
          1. Strengths of the plan
          2. Weaknesses or potential issues
          3. Uncertainties or dependencies that could affect success
          4. Recommendations for improving the plan
          5. The critical path (sequence of tasks that must be completed on time)
          6. Estimated total duration (sum of tasks on the critical path)
          
          Return the analysis as JSON with these properties:
          {
            "strengths": ["strength 1", "strength 2", ...],
            "weaknesses": ["weakness 1", "weakness 2", ...],
            "uncertainties": ["uncertainty 1", "uncertainty 2", ...],
            "recommendations": ["recommendation 1", "recommendation 2", ...],
            "criticalPath": ["task-id-1", "task-id-2", ...],
            "estimatedTotalDuration": number (in minutes)
          }
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: analysisPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const analysisResult = JSON.parse(openaiResponse.choices[0].message.content);
            
            // Store analysis in reasoning history
            this.reasoningHistory.set(goalId, [
              ...(this.reasoningHistory.get(goalId) || []),
              {
                type: 'plan_analysis',
                timestamp: new Date(),
                analysis: analysisResult
              }
            ]);
            
            // Store plan analysis in goal metadata
            await this.updateGoal(goalId, {
              metadata: {
                ...(goal.metadata || {}),
                planAnalysis: analysisResult
              }
            });
            
            return analysisResult;
          }
        } catch (error) {
          console.error('Error analyzing plan with OpenAI:', error);
        }
      }
      
      // Fallback: Simple analysis
      return this.simpleAnalyzePlan(goal, tasks);
    } catch (error) {
      console.error('Error analyzing plan:', error);
      return null;
    }
  }
  
  /**
   * Perform a simple analysis of a task plan (fallback)
   * @param goal Goal
   * @param tasks Tasks
   * @returns Simple plan analysis
   */
  private simpleAnalyzePlan(goal: Goal, tasks: Task[]): PlanAnalysis {
    // Calculate basic stats
    const highPriorityTasks = tasks.filter(task => task.priority === TaskPriority.HIGH || task.priority === TaskPriority.CRITICAL);
    const tasksWithDependencies = tasks.filter(task => task.dependencies && task.dependencies.length > 0);
    const tasksWithDuration = tasks.filter(task => task.estimatedDuration !== undefined);
    
    // Identify critical path (simplified)
    const criticalPath = highPriorityTasks
      .sort((a, b) => {
        // Sort by dependency relationship if possible
        if (a.dependencies?.includes(b.id)) return 1;
        if (b.dependencies?.includes(a.id)) return -1;
        return 0;
      })
      .map(task => task.id);
    
    // Calculate total duration
    const totalDuration = tasksWithDuration.reduce(
      (sum, task) => sum + (task.estimatedDuration || 0),
      0
    );
    
    // Generate analysis
    const analysis: PlanAnalysis = {
      strengths: [
        `Plan includes ${tasks.length} distinct tasks to achieve the goal`,
        highPriorityTasks.length > 0 ? `${highPriorityTasks.length} high-priority tasks identified` : 'Tasks have appropriate priorities'
      ],
      weaknesses: [
        tasksWithDependencies.length === 0 ? 'No dependencies defined between tasks' : '',
        tasksWithDuration.length === 0 ? 'No duration estimates for tasks' : ''
      ].filter(w => w !== ''),
      uncertainties: [
        'Task durations may vary based on complexity',
        'External dependencies not accounted for'
      ],
      recommendations: [
        'Review task dependencies to ensure proper sequencing',
        'Add more detailed time estimates for better planning'
      ],
      criticalPath,
      estimatedTotalDuration: totalDuration
    };
    
    // Store analysis in reasoning history
    this.reasoningHistory.set(goal.id, [
      ...(this.reasoningHistory.get(goal.id) || []),
      {
        type: 'simple_plan_analysis',
        timestamp: new Date(),
        analysis
      }
    ]);
    
    return analysis;
  }
  
  /**
   * Generate a progress report for a goal
   * @param goalId Goal ID
   * @returns Progress report text
   */
  public async generateProgressReport(goalId: string): Promise<string> {
    try {
      // Get goal
      const goal = await this.getGoal(goalId);
      
      if (!goal) {
        return 'Goal not found';
      }
      
      // Get tasks
      const tasks = await this.getTasksByGoal(goalId);
      
      if (tasks.length === 0) {
        return `No tasks found for goal "${goal.title}"`;
      }
      
      // Group tasks by status
      const tasksByStatus = {
        [TaskStatus.COMPLETED]: tasks.filter(t => t.status === TaskStatus.COMPLETED),
        [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        [TaskStatus.PENDING]: tasks.filter(t => t.status === TaskStatus.PENDING),
        [TaskStatus.BLOCKED]: tasks.filter(t => t.status === TaskStatus.BLOCKED),
        [TaskStatus.CANCELLED]: tasks.filter(t => t.status === TaskStatus.CANCELLED)
      };
      
      // Use OpenAI for a well-formed report if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Format tasks for the prompt
        const tasksData = tasks.map(task => ({
          title: task.title,
          status: task.status,
          progress: task.progress,
          priority: task.priority,
          completedAt: task.completedAt
        }));
        
        // Get latest reasoning for context
        const reasoning = this.reasoningHistory.get(goalId) || [];
        const latestAnalysis = reasoning.length > 0 ? 
          reasoning[reasoning.length - 1] : null;
        
        const reportPrompt = `
          Generate a concise progress report for this goal:
          
          GOAL: ${goal.title}
          DESCRIPTION: ${goal.description}
          OVERALL PROGRESS: ${goal.progress}%
          STATUS: ${goal.status}
          
          TASKS:
          ${JSON.stringify(tasksData, null, 2)}
          
          ${latestAnalysis ? `LATEST ANALYSIS:\n${JSON.stringify(latestAnalysis.analysis, null, 2)}` : ''}
          
          The report should include:
          1. A brief summary of overall progress
          2. Key accomplishments (completed tasks)
          3. Current work in progress
          4. Upcoming work
          5. Any blockers or issues
          6. Next steps recommendation
          
          Make the report concise, factual, and actionable.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: reportPrompt }],
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            return openaiResponse.choices[0].message.content;
          }
        } catch (error) {
          console.error('Error generating progress report with OpenAI:', error);
        }
      }
      
      // Fallback: Generate a simple report
      const report = [
        `# Progress Report: ${goal.title}`,
        `Overall Progress: ${goal.progress}%`,
        `Status: ${goal.status}`,
        '',
        '## Completed Tasks',
        tasksByStatus[TaskStatus.COMPLETED].length === 0 ? 
          '- No tasks completed yet' : 
          tasksByStatus[TaskStatus.COMPLETED].map(t => `- ${t.title}`).join('\n'),
        '',
        '## In Progress',
        tasksByStatus[TaskStatus.IN_PROGRESS].length === 0 ? 
          '- No tasks in progress' : 
          tasksByStatus[TaskStatus.IN_PROGRESS].map(t => `- ${t.title} (${t.progress}%)`).join('\n'),
        '',
        '## Pending Tasks',
        tasksByStatus[TaskStatus.PENDING].length === 0 ? 
          '- No pending tasks' : 
          tasksByStatus[TaskStatus.PENDING].map(t => `- ${t.title}`).join('\n'),
        '',
        '## Blocked Tasks',
        tasksByStatus[TaskStatus.BLOCKED].length === 0 ? 
          '- No blocked tasks' : 
          tasksByStatus[TaskStatus.BLOCKED].map(t => `- ${t.title}`).join('\n'),
        '',
        '## Next Steps',
        '- Continue working on in-progress tasks',
        tasksByStatus[TaskStatus.BLOCKED].length > 0 ? '- Address blocked tasks' : '',
        tasksByStatus[TaskStatus.PENDING].length > 0 ? '- Start pending tasks' : ''
      ].filter(line => line !== '').join('\n');
      
      return report;
    } catch (error) {
      console.error('Error generating progress report:', error);
      return 'Error generating progress report';
    }
  }
  
  /**
   * Search for goals and tasks using natural language
   * @param query Search query
   * @param sessionId Session ID to search within
   * @param userId User ID to search within (optional)
   * @returns Search results
   */
  public async search(
    query: string,
    sessionId: string,
    userId?: string
  ): Promise<{
    goals: Goal[];
    tasks: Task[];
  }> {
    try {
      // Get all goals for the session
      const goals = await this.getGoalsBySession(sessionId, userId, true);
      
      // Get all tasks for these goals
      const allTasks: Task[] = [];
      for (const goal of goals) {
        const goalTasks = await this.getTasksByGoal(goal.id);
        allTasks.push(...goalTasks);
      }
      
      // Use OpenAI for semantic search if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        try {
          // Generate embedding for the query
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
            encoding_format: "float"
          });
          
          if (embeddingResponse.data && embeddingResponse.data.length > 0) {
            const queryEmbedding = embeddingResponse.data[0].embedding;
            
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: embeddingResponse.usage?.total_tokens || 0,
              model: "text-embedding-3-small"
            });
            
            // Get or generate embeddings for goals and tasks
            // In a real implementation, these would be stored in the database
            
            // For this simplified example, we'll just do a direct search
            const searchPrompt = `
              I have a user who is searching for goals or tasks with this query:
              "${query}"
              
              Please analyze these goals and tasks and determine which ones match the search query.
              Return IDs of matching items as JSON with these arrays:
              {
                "goalIds": ["id1", "id2", ...],
                "taskIds": ["id1", "id2", ...]
              }
              
              GOALS:
              ${goals.map(g => `${g.id}: ${g.title} - ${g.description}`).join('\n')}
              
              TASKS:
              ${allTasks.map(t => `${t.id}: ${t.title} - ${t.description}`).join('\n')}
              
              Analyze semantic meaning, not just keywords. Return at most 5 goals and 10 tasks.
            `;
            
            const openaiResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: searchPrompt }],
              response_format: { type: "json_object" },
              temperature: 0.3,
            });
            
            if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
              // Track API usage
              apiQuotaManager.trackUsage(ApiService.OPENAI, {
                tokens: openaiResponse.usage?.total_tokens || 0,
                model: "gpt-4o"
              });
              
              const searchResults = JSON.parse(openaiResponse.choices[0].message.content);
              
              // Get matching goals and tasks
              const matchingGoals = goals.filter(g => searchResults.goalIds.includes(g.id));
              const matchingTasks = allTasks.filter(t => searchResults.taskIds.includes(t.id));
              
              return {
                goals: matchingGoals,
                tasks: matchingTasks
              };
            }
          }
        } catch (error) {
          console.error('Error searching with OpenAI:', error);
        }
      }
      
      // Fallback: Simple keyword search
      const keywords = query.toLowerCase().split(/\s+/);
      
      const matchingGoals = goals.filter(goal => {
        const text = `${goal.title} ${goal.description}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      
      const matchingTasks = allTasks.filter(task => {
        const text = `${task.title} ${task.description}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
      
      return {
        goals: matchingGoals,
        tasks: matchingTasks
      };
    } catch (error) {
      console.error('Error searching goals and tasks:', error);
      return {
        goals: [],
        tasks: []
      };
    }
  }
  
  /**
   * Perform chain-of-thought reasoning about a task or goal
   * @param id Task or goal ID
   * @param question Question to reason about
   * @returns Reasoning result
   */
  public async performReasoning(id: string, question: string): Promise<string> {
    try {
      // Determine if this is a task or goal
      let itemType: 'task' | 'goal' = 'task';
      let item: Task | Goal | null = await this.getTask(id);
      
      if (!item) {
        item = await this.getGoal(id);
        if (item) {
          itemType = 'goal';
        } else {
          return `Item with ID ${id} not found`;
        }
      }
      
      // Get related items
      let relatedItems: (Task | Goal)[] = [];
      
      if (itemType === 'task') {
        // Get parent goal
        const parentGoal = await this.getGoal((item as Task).goalId);
        if (parentGoal) {
          relatedItems.push(parentGoal);
        }
        
        // Get dependent tasks
        if ((item as Task).dependencies && (item as Task).dependencies.length > 0) {
          const dependencyTasks = await Promise.all(
            (item as Task).dependencies.map(depId => this.getTask(depId))
          );
          
          relatedItems.push(...dependencyTasks.filter(t => t !== null) as Task[]);
        }
      } else {
        // Get tasks for this goal
        const goalTasks = await this.getTasksByGoal(id);
        relatedItems.push(...goalTasks);
      }
      
      // Get reasoning history
      const reasoningHistory = this.reasoningHistory.get(
        itemType === 'task' ? (item as Task).goalId : id
      ) || [];
      
      // Use OpenAI for reasoning if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const reasoningPrompt = `
          I'd like you to reason about this ${itemType}:
          
          ${JSON.stringify(item, null, 2)}
          
          Related items:
          ${JSON.stringify(relatedItems, null, 2)}
          
          Previous reasoning:
          ${reasoningHistory.length > 0 ? JSON.stringify(reasoningHistory, null, 2) : 'None'}
          
          Question: ${question}
          
          Please think through this step by step, considering:
          1. The current state and context of the ${itemType}
          2. Related dependencies and constraints
          3. Potential challenges or uncertainties
          4. Multiple perspectives and alternative approaches
          5. Tradeoffs involved in different decisions
          
          Provide your reasoning and a clear conclusion.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: reasoningPrompt }],
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const reasoningResult = openaiResponse.choices[0].message.content;
            
            // Store reasoning in history
            this.reasoningHistory.set(
              itemType === 'task' ? (item as Task).goalId : id,
              [
                ...reasoningHistory,
                {
                  type: 'question_reasoning',
                  timestamp: new Date(),
                  question,
                  reasoning: reasoningResult
                }
              ]
            );
            
            return reasoningResult;
          }
        } catch (error) {
          console.error('Error performing reasoning with OpenAI:', error);
        }
      }
      
      // Fallback: Simple reasoning
      return `Reasoning about ${itemType} "${item.title}": To answer the question "${question}", we need to consider the current status (${itemType === 'task' ? (item as Task).status : item.status}) and progress (${item.progress}%). Based on the available information, this ${itemType} appears to be ${item.progress < 50 ? 'in early stages' : 'progressing well'}. Without more specific information, it's difficult to provide detailed reasoning.`;
    } catch (error) {
      console.error('Error performing reasoning:', error);
      return 'Error performing reasoning';
    }
  }
}

// Export singleton instance
export const taskPlanner = TaskPlanner.getInstance();