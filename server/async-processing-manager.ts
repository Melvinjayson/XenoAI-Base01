/**
 * Asynchronous Processing Manager
 * 
 * This module provides distributed, asynchronous processing capabilities for handling
 * large data volumes and complex operations without blocking the main thread:
 * - Task queue management
 * - Worker pool orchestration
 * - Progress tracking and reporting
 * - Resource allocation optimization
 * - Prioritization of critical tasks
 */

import { EventEmitter } from 'events';
import { errorRecoverySystem } from './error-recovery-system';

// Task status enumerations
export enum TaskStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

// Task priority levels
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Task definition interface
export interface Task {
  id: string;
  type: string;
  data: any;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  result?: any;
  error?: Error;
  startTime?: Date;
  endTime?: Date;
  sessionId?: string;
  userId?: string;
  dependencies?: string[];
}

// Task processor function signature
export type TaskProcessor = (task: Task) => Promise<any>;

// Task registry to hold processors
const taskProcessors: Map<string, TaskProcessor> = new Map();

// Task queue and active tasks
const taskQueue: Task[] = [];
const activeTasks: Map<string, Task> = new Map();
const completedTasks: Map<string, Task> = new Map();

// Maximum concurrent tasks and task history size
const MAX_CONCURRENT_TASKS = 5;
const MAX_TASK_HISTORY = 100;

// Event emitter for task events
const taskEvents = new EventEmitter();

/**
 * Register a task processor for a specific task type
 */
export function registerTaskProcessor(taskType: string, processor: TaskProcessor): void {
  if (taskProcessors.has(taskType)) {
    console.warn(`Overriding existing processor for task type: ${taskType}`);
  }
  taskProcessors.set(taskType, processor);
  console.log(`Registered processor for task type: ${taskType}`);
}

/**
 * Enqueue a new task for processing
 */
export function enqueueTask(
  type: string,
  data: any,
  options: {
    priority?: TaskPriority,
    sessionId?: string,
    userId?: string,
    dependencies?: string[]
  } = {}
): Task {
  
  // Default options
  const {
    priority = TaskPriority.NORMAL,
    sessionId,
    userId,
    dependencies = []
  } = options;
  
  // Create task object
  const task: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    data,
    priority,
    status: TaskStatus.QUEUED,
    progress: 0,
    sessionId,
    userId,
    dependencies
  };
  
  // Add to queue
  taskQueue.push(task);
  
  // Sort queue by priority (higher first) and then by submission time
  taskQueue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.id.localeCompare(b.id);
  });
  
  // Emit task queued event
  taskEvents.emit('task:queued', task);
  
  // Start processing queue if not already running
  processTaskQueue();
  
  return task;
}

/**
 * Process the next tasks in the queue
 */
async function processTaskQueue(): Promise<void> {
  // If already at max capacity, do nothing
  if (activeTasks.size >= MAX_CONCURRENT_TASKS) {
    return;
  }
  
  // Process as many tasks as we can up to the max concurrent limit
  while (taskQueue.length > 0 && activeTasks.size < MAX_CONCURRENT_TASKS) {
    // Get the highest priority task that's ready to run (dependencies satisfied)
    const nextTaskIndex = findNextExecutableTask();
    if (nextTaskIndex === -1) break;
    
    // Remove from queue and process
    const task = taskQueue.splice(nextTaskIndex, 1)[0];
    processTask(task);
  }
}

/**
 * Find the index of the next task that can be executed (all dependencies satisfied)
 */
function findNextExecutableTask(): number {
  for (let i = 0; i < taskQueue.length; i++) {
    const task = taskQueue[i];
    
    // Check if all dependencies are completed
    if (task.dependencies && task.dependencies.length > 0) {
      const allDependenciesMet = task.dependencies.every(depId => 
        completedTasks.has(depId) && 
        completedTasks.get(depId)!.status === TaskStatus.COMPLETED
      );
      
      if (!allDependenciesMet) continue;
    }
    
    return i;
  }
  return -1;
}

/**
 * Process a single task
 */
async function processTask(task: Task): Promise<void> {
  // Get the appropriate processor
  const processor = taskProcessors.get(task.type);
  if (!processor) {
    task.status = TaskStatus.FAILED;
    task.error = new Error(`No processor registered for task type: ${task.type}`);
    completeTask(task);
    return;
  }
  
  // Update task status and start tracking
  task.status = TaskStatus.RUNNING;
  task.startTime = new Date();
  activeTasks.set(task.id, task);
  
  // Emit task started event
  taskEvents.emit('task:started', task);
  
  try {
    // Execute the task processor
    task.result = await processor(task);
    task.status = TaskStatus.COMPLETED;
  } catch (error) {
    // Handle task failure
    task.status = TaskStatus.FAILED;
    task.error = error as Error;
    
    // Log error to recovery system
    errorRecoverySystem.logError({
      id: `task_error_${task.id}`,
      type: 'task_execution_error',
      message: `Error executing task of type ${task.type}: ${task.error.message}`,
      stack: task.error.stack,
      context: {
        taskId: task.id,
        taskType: task.type,
        taskData: task.data
      },
      timestamp: new Date(),
      severity: 'error'
    });
  }
  
  // Finalize task
  task.endTime = new Date();
  task.progress = 100;
  completeTask(task);
}

/**
 * Complete a task and process next tasks
 */
function completeTask(task: Task): void {
  // Remove from active tasks
  activeTasks.delete(task.id);
  
  // Add to completed tasks history
  completedTasks.set(task.id, task);
  
  // Trim history if needed
  if (completedTasks.size > MAX_TASK_HISTORY) {
    const oldestKey = Array.from(completedTasks.keys())[0];
    completedTasks.delete(oldestKey);
  }
  
  // Emit appropriate event
  if (task.status === TaskStatus.COMPLETED) {
    taskEvents.emit('task:completed', task);
  } else if (task.status === TaskStatus.FAILED) {
    taskEvents.emit('task:failed', task);
  }
  
  // Process next tasks in the queue
  processTaskQueue();
}

/**
 * Update the progress of a running task
 */
export function updateTaskProgress(taskId: string, progress: number, result?: any): boolean {
  const task = activeTasks.get(taskId);
  if (!task) return false;
  
  task.progress = Math.min(99, Math.max(0, progress)); // Keep between 0-99 until complete
  if (result !== undefined) {
    task.result = result;
  }
  
  // Emit progress event
  taskEvents.emit('task:progress', task);
  
  return true;
}

/**
 * Cancel a task by ID
 */
export function cancelTask(taskId: string): boolean {
  // Check if in queue
  const queueIndex = taskQueue.findIndex(t => t.id === taskId);
  if (queueIndex >= 0) {
    const task = taskQueue.splice(queueIndex, 1)[0];
    task.status = TaskStatus.CANCELED;
    task.endTime = new Date();
    completedTasks.set(task.id, task);
    taskEvents.emit('task:canceled', task);
    return true;
  }
  
  // Check if active
  const activeTask = activeTasks.get(taskId);
  if (activeTask) {
    // We can't truly cancel an in-progress task, but we can mark it as canceled
    // The task processor should check periodically if the task has been canceled
    activeTask.status = TaskStatus.CANCELED;
    activeTask.endTime = new Date();
    activeTasks.delete(taskId);
    completedTasks.set(activeTask.id, activeTask);
    taskEvents.emit('task:canceled', activeTask);
    return true;
  }
  
  return false;
}

/**
 * Get a task by ID
 */
export function getTask(taskId: string): Task | undefined {
  return (
    activeTasks.get(taskId) ||
    taskQueue.find(t => t.id === taskId) ||
    completedTasks.get(taskId)
  );
}

/**
 * Get all tasks for a session
 */
export function getSessionTasks(sessionId: string): Task[] {
  const tasks = [];
  
  // Check active tasks
  for (const task of activeTasks.values()) {
    if (task.sessionId === sessionId) {
      tasks.push(task);
    }
  }
  
  // Check queued tasks
  for (const task of taskQueue) {
    if (task.sessionId === sessionId) {
      tasks.push(task);
    }
  }
  
  // Check completed tasks
  for (const task of completedTasks.values()) {
    if (task.sessionId === sessionId) {
      tasks.push(task);
    }
  }
  
  return tasks;
}

/**
 * Get all tasks for a user
 */
export function getUserTasks(userId: string): Task[] {
  const tasks = [];
  
  // Check active tasks
  for (const task of activeTasks.values()) {
    if (task.userId === userId) {
      tasks.push(task);
    }
  }
  
  // Check queued tasks
  for (const task of taskQueue) {
    if (task.userId === userId) {
      tasks.push(task);
    }
  }
  
  // Check completed tasks
  for (const task of completedTasks.values()) {
    if (task.userId === userId) {
      tasks.push(task);
    }
  }
  
  return tasks;
}

/**
 * Get task statistics
 */
export function getTaskStats(): { 
  queued: number; 
  active: number; 
  completed: number; 
  failed: number;
  canceled: number;
  avgProcessingTime: number;
} {
  let completedCount = 0;
  let failedCount = 0;
  let canceledCount = 0;
  let totalProcessingTime = 0;
  let processedCount = 0;
  
  for (const task of completedTasks.values()) {
    if (task.status === TaskStatus.COMPLETED) {
      completedCount++;
    } else if (task.status === TaskStatus.FAILED) {
      failedCount++;
    } else if (task.status === TaskStatus.CANCELED) {
      canceledCount++;
    }
    
    if (task.startTime && task.endTime) {
      totalProcessingTime += task.endTime.getTime() - task.startTime.getTime();
      processedCount++;
    }
  }
  
  return {
    queued: taskQueue.length,
    active: activeTasks.size,
    completed: completedCount,
    failed: failedCount,
    canceled: canceledCount,
    avgProcessingTime: processedCount > 0 ? totalProcessingTime / processedCount : 0
  };
}

/**
 * Subscribe to task events
 */
export function subscribeToTaskEvents(
  event: 'task:queued' | 'task:started' | 'task:progress' | 'task:completed' | 'task:failed' | 'task:canceled',
  callback: (task: Task) => void
): () => void {
  taskEvents.on(event, callback);
  return () => taskEvents.off(event, callback);
}

/**
 * Initialize the asynchronous processing system
 */
export function initializeAsyncProcessing(): void {
  console.log('Initializing Asynchronous Processing System...');
  
  // Register built-in task processors
  registerTaskProcessor('data_extraction', async (task: Task) => {
    // Extract data from a source asynchronously
    console.log(`Processing data extraction task: ${task.id}`);
    // Implementation would go here
    return { status: 'success' };
  });
  
  registerTaskProcessor('data_transformation', async (task: Task) => {
    // Transform data asynchronously
    console.log(`Processing data transformation task: ${task.id}`);
    // Implementation would go here
    return { status: 'success' };
  });
  
  registerTaskProcessor('insight_generation', async (task: Task) => {
    // Generate insights asynchronously
    console.log(`Processing insight generation task: ${task.id}`);
    // Implementation would go here
    return { status: 'success' };
  });
  
  console.log('Asynchronous Processing System initialized');
}

// Export the system as a singleton
export const asyncProcessingManager = {
  initialize: initializeAsyncProcessing,
  registerProcessor: registerTaskProcessor,
  enqueueTask,
  updateProgress: updateTaskProgress,
  cancelTask,
  getTask,
  getSessionTasks,
  getUserTasks,
  getStats: getTaskStats,
  subscribeToEvents: subscribeToTaskEvents
};