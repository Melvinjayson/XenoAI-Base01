/**
 * Project Agent Module
 * 
 * Provides a higher-level project management layer that coordinates goals and tasks,
 * manages milestones, dependencies, and deliverables from conversation inputs.
 * This agent translates user intents into structured project plans and provides
 * oversight across multiple related goals.
 */

import { OpenAI } from "openai";
import { storage } from "./storage";
import { apiQuotaManager, ApiService } from "./api-quota-manager";
import { conversationMemory, MemoryType } from "./conversation-memory";
import { 
  taskPlanner, 
  Goal, 
  Task, 
  TaskPriority, 
  TaskStatus, 
  TaskType 
} from "./task-planner";

// Initialize OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Project types and interfaces
export interface Project {
  id: string;
  title: string;
  description: string;
  goalIds: string[]; // IDs of related goals
  milestoneIds: string[]; // IDs of milestones
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'completed' | 'archived';
  sessionId: string;
  userId?: string;
  progress: number; // 0-100
  stakeholders?: string[];
  collaborators?: string[];
  tags: string[];
  notes: string[];
  attachments?: string[]; // IDs of attached resources
  metadata?: Record<string, any>;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  goalIds: string[]; // IDs of related goals
  taskIds: string[]; // IDs of related tasks
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  targetDate?: Date;
  status: 'pending' | 'active' | 'completed' | 'missed';
  progress: number; // 0-100
  priority: TaskPriority;
  dependencies?: string[]; // IDs of milestones this depends on
  dependents?: string[]; // IDs of milestones that depend on this
  notes: string[];
  metadata?: Record<string, any>;
}

export interface ProjectSummary {
  project: Project;
  milestones: Milestone[];
  goals: {
    id: string;
    title: string;
    status: string;
    progress: number;
  }[];
  nextDeadlines: Array<{
    type: 'milestone' | 'goal';
    id: string;
    title: string;
    date: Date;
  }>;
  currentFocus: string[];
  risksAndBlockers: string[];
}

/**
 * Project Management Agent
 */
export class ProjectAgent {
  private static instance: ProjectAgent;
  
  // Cache for faster access
  private projectsCache: Map<string, Project> = new Map(); // Project ID -> Project
  private milestonesCache: Map<string, Milestone> = new Map(); // Milestone ID -> Milestone
  
  // Automatic planning intervals
  private planningIntervals: Map<string, NodeJS.Timeout> = new Map(); // Project ID -> Interval
  
  private constructor() {
    console.log('Project Agent initialized');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): ProjectAgent {
    if (!ProjectAgent.instance) {
      ProjectAgent.instance = new ProjectAgent();
    }
    return ProjectAgent.instance;
  }
  
  /**
   * Create a project from user conversation
   * @param conversationText Recent conversation text for context
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @returns Created project
   */
  public async createProjectFromConversation(
    conversationText: string,
    sessionId: string,
    userId?: string
  ): Promise<Project> {
    try {
      console.log('Creating project from conversation...');
      
      // Use OpenAI to extract project information if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Extract project details from conversation
        const extractionPrompt = `
          Extract information for a new project from this conversation:
          
          ${conversationText}
          
          Based on the conversation, provide structured project information with these properties:
          - title: A clear, concise project title
          - description: A comprehensive project description
          - goals: 3-5 main goals for this project
          - milestones: 2-4 key milestones with target dates if mentioned
          - stakeholders: Any mentioned stakeholders
          - tags: 2-6 relevant tags or categories
          
          Return the information as a JSON object with these properties. Make reasonable inferences
          but don't add information that isn't implied by the conversation.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: extractionPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const extractedInfo = JSON.parse(openaiResponse.choices[0].message.content);
            
            // Create project from extracted information
            return this.createProject(
              extractedInfo.title || 'New Project',
              extractedInfo.description || 'Project created from conversation',
              sessionId,
              userId,
              extractedInfo.tags || [],
              extractedInfo.stakeholders || [],
              extractedInfo.goals || [],
              extractedInfo.milestones || []
            );
          }
        } catch (error) {
          console.error('Error extracting project info with OpenAI:', error);
        }
      }
      
      // Fallback: Create a basic project
      return this.createProject(
        'New Project',
        'Project created from conversation',
        sessionId,
        userId
      );
    } catch (error) {
      console.error('Error creating project from conversation:', error);
      throw error;
    }
  }
  
  /**
   * Create a project with specified details
   * @param title Project title
   * @param description Project description
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @param tags Project tags (optional)
   * @param stakeholders Project stakeholders (optional)
   * @param goals Initial goals (optional)
   * @param milestones Initial milestones (optional)
   * @returns Created project
   */
  public async createProject(
    title: string,
    description: string,
    sessionId: string,
    userId?: string,
    tags: string[] = [],
    stakeholders: string[] = [],
    initialGoals: Array<{title: string; description: string}> = [],
    initialMilestones: Array<{title: string; description: string; targetDate?: string}> = []
  ): Promise<Project> {
    try {
      const now = new Date();
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create the project
      const project: Project = {
        id: projectId,
        title,
        description,
        goalIds: [],
        milestoneIds: [],
        createdAt: now,
        updatedAt: now,
        status: 'planning',
        sessionId,
        userId,
        progress: 0,
        stakeholders,
        tags,
        notes: []
      };
      
      // Cache the project
      this.projectsCache.set(projectId, project);
      
      // Persist to storage
      if (storage && typeof storage.saveProject === 'function') {
        await storage.saveProject(project);
      }
      
      // Create initial goals if provided
      if (initialGoals.length > 0) {
        const goalIds = await Promise.all(
          initialGoals.map(async goalInfo => {
            const goal = await taskPlanner.createGoal(
              goalInfo.title,
              goalInfo.description,
              sessionId,
              userId,
              TaskPriority.HIGH
            );
            return goal.id;
          })
        );
        
        // Update project with goal IDs
        project.goalIds = goalIds;
        
        // Update project in cache
        this.projectsCache.set(projectId, project);
        
        // Update in storage
        if (storage && typeof storage.updateProject === 'function') {
          await storage.updateProject(projectId, project);
        }
      }
      
      // Create initial milestones if provided
      if (initialMilestones.length > 0) {
        const milestoneIds = await Promise.all(
          initialMilestones.map(async milestoneInfo => {
            // Parse target date if provided
            let targetDate: Date | undefined;
            if (milestoneInfo.targetDate) {
              try {
                targetDate = new Date(milestoneInfo.targetDate);
              } catch (error) {
                console.error(`Invalid date format: ${milestoneInfo.targetDate}`);
              }
            }
            
            const milestone = await this.createMilestone(
              milestoneInfo.title,
              milestoneInfo.description,
              projectId,
              [],
              [],
              targetDate
            );
            return milestone.id;
          })
        );
        
        // Update project with milestone IDs
        project.milestoneIds = milestoneIds;
        
        // Update project in cache
        this.projectsCache.set(projectId, project);
        
        // Update in storage
        if (storage && typeof storage.updateProject === 'function') {
          await storage.updateProject(projectId, project);
        }
      }
      
      // Start planning interval for automated updates
      this.startProjectPlanning(projectId);
      
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }
  
  /**
   * Start automated planning for a project
   * @param projectId Project ID
   * @param intervalMs Interval in milliseconds (default: 1 hour)
   */
  private startProjectPlanning(projectId: string, intervalMs: number = 60 * 60 * 1000): void {
    // Clear any existing interval
    this.stopProjectPlanning(projectId);
    
    // Set new interval
    const interval = setInterval(async () => {
      await this.performProjectPlanning(projectId);
    }, intervalMs);
    
    // Store interval reference
    this.planningIntervals.set(projectId, interval);
  }
  
  /**
   * Stop automated planning for a project
   * @param projectId Project ID
   */
  private stopProjectPlanning(projectId: string): void {
    const interval = this.planningIntervals.get(projectId);
    
    if (interval) {
      clearInterval(interval);
      this.planningIntervals.delete(projectId);
    }
  }
  
  /**
   * Perform automated planning for a project
   * @param projectId Project ID
   */
  private async performProjectPlanning(projectId: string): Promise<void> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        console.error(`Project not found: ${projectId}`);
        return;
      }
      
      // Skip if project is completed or archived
      if (project.status === 'completed' || project.status === 'archived') {
        this.stopProjectPlanning(projectId);
        return;
      }
      
      console.log(`Performing automated planning for project: ${project.title}`);
      
      // Update project progress
      await this.updateProjectProgress(projectId);
      
      // Update milestone statuses
      await this.updateMilestoneStatuses(projectId);
      
      // Optionally suggest new goals or milestones
      if (project.progress > 30 && project.goals?.length < 3) {
        await this.suggestNewGoals(projectId);
      }
      
      // Analyze project for risks
      await this.analyzeProjectRisks(projectId);
      
      console.log(`Automated planning completed for project: ${project.title}`);
    } catch (error) {
      console.error(`Error performing project planning for ${projectId}:`, error);
    }
  }
  
  /**
   * Get a project by ID
   * @param projectId Project ID
   * @returns Project or null if not found
   */
  public async getProject(projectId: string): Promise<Project | null> {
    try {
      // Check cache first
      if (this.projectsCache.has(projectId)) {
        return this.projectsCache.get(projectId)!;
      }
      
      // Try to get from storage
      if (storage && typeof storage.getProject === 'function') {
        const project = await storage.getProject(projectId);
        
        if (project) {
          // Update cache
          this.projectsCache.set(projectId, project);
          return project;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }
  
  /**
   * Get projects by session ID
   * @param sessionId Session ID
   * @param userId User ID (optional)
   * @param includeArchived Whether to include archived projects (default: false)
   * @returns Array of projects
   */
  public async getProjectsBySession(
    sessionId: string,
    userId?: string,
    includeArchived: boolean = false
  ): Promise<Project[]> {
    try {
      let projects: Project[] = [];
      
      // Try to get from storage
      if (storage && typeof storage.getProjectsBySession === 'function') {
        projects = await storage.getProjectsBySession(sessionId, userId);
        
        // Update cache
        for (const project of projects) {
          this.projectsCache.set(project.id, project);
        }
      }
      
      // Filter out archived projects if requested
      if (!includeArchived) {
        projects = projects.filter(project => project.status !== 'archived');
      }
      
      return projects;
    } catch (error) {
      console.error('Error getting projects by session:', error);
      return [];
    }
  }
  
  /**
   * Update a project
   * @param projectId Project ID
   * @param updates Project updates
   * @returns Updated project or null if not found
   */
  public async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      // Get current project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      // Apply updates
      const updatedProject: Project = {
        ...project,
        ...updates,
        id: project.id, // Ensure ID doesn't change
        updatedAt: new Date()
      };
      
      // Update cache
      this.projectsCache.set(projectId, updatedProject);
      
      // Persist to storage
      if (storage && typeof storage.updateProject === 'function') {
        await storage.updateProject(projectId, updatedProject);
      }
      
      // Check if the project is completed
      if (updatedProject.status === 'completed' && !updatedProject.completedAt) {
        updatedProject.completedAt = new Date();
        
        // Stop automatic planning
        this.stopProjectPlanning(projectId);
        
        // Persist completion date
        if (storage && typeof storage.updateProject === 'function') {
          await storage.updateProject(projectId, updatedProject);
        }
      }
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      return null;
    }
  }
  
  /**
   * Create a milestone
   * @param title Milestone title
   * @param description Milestone description
   * @param projectId Project ID
   * @param goalIds Related goal IDs (optional)
   * @param taskIds Related task IDs (optional)
   * @param targetDate Target date (optional)
   * @param priority Priority (optional)
   * @param dependencies Dependency milestone IDs (optional)
   * @returns Created milestone
   */
  public async createMilestone(
    title: string,
    description: string,
    projectId: string,
    goalIds: string[] = [],
    taskIds: string[] = [],
    targetDate?: Date,
    priority: TaskPriority = TaskPriority.MEDIUM,
    dependencies: string[] = []
  ): Promise<Milestone> {
    try {
      const now = new Date();
      const milestoneId = `milestone-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create the milestone
      const milestone: Milestone = {
        id: milestoneId,
        title,
        description,
        projectId,
        goalIds,
        taskIds,
        createdAt: now,
        updatedAt: now,
        targetDate,
        status: 'pending',
        progress: 0,
        priority,
        dependencies,
        notes: []
      };
      
      // Cache the milestone
      this.milestonesCache.set(milestoneId, milestone);
      
      // Persist to storage
      if (storage && typeof storage.saveMilestone === 'function') {
        await storage.saveMilestone(milestone);
      }
      
      // Update project with milestone ID
      const project = await this.getProject(projectId);
      if (project) {
        const milestoneIds = [...(project.milestoneIds || []), milestoneId];
        await this.updateProject(projectId, { milestoneIds });
      }
      
      // Update dependent milestones
      for (const depId of dependencies) {
        const depMilestone = await this.getMilestone(depId);
        if (depMilestone) {
          const dependents = [...(depMilestone.dependents || []), milestoneId];
          await this.updateMilestone(depId, { dependents });
        }
      }
      
      return milestone;
    } catch (error) {
      console.error('Error creating milestone:', error);
      throw error;
    }
  }
  
  /**
   * Get a milestone by ID
   * @param milestoneId Milestone ID
   * @returns Milestone or null if not found
   */
  public async getMilestone(milestoneId: string): Promise<Milestone | null> {
    try {
      // Check cache first
      if (this.milestonesCache.has(milestoneId)) {
        return this.milestonesCache.get(milestoneId)!;
      }
      
      // Try to get from storage
      if (storage && typeof storage.getMilestone === 'function') {
        const milestone = await storage.getMilestone(milestoneId);
        
        if (milestone) {
          // Update cache
          this.milestonesCache.set(milestoneId, milestone);
          return milestone;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting milestone:', error);
      return null;
    }
  }
  
  /**
   * Get milestones by project ID
   * @param projectId Project ID
   * @returns Array of milestones
   */
  public async getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    try {
      // Try to get from storage
      if (storage && typeof storage.getMilestonesByProject === 'function') {
        const milestones = await storage.getMilestonesByProject(projectId);
        
        // Update cache
        for (const milestone of milestones) {
          this.milestonesCache.set(milestone.id, milestone);
        }
        
        return milestones;
      }
      
      // Fallback: Get project and its milestone IDs, then get milestones
      const project = await this.getProject(projectId);
      
      if (project && project.milestoneIds && project.milestoneIds.length > 0) {
        const milestones = await Promise.all(
          project.milestoneIds.map(id => this.getMilestone(id))
        );
        
        // Filter out nulls
        return milestones.filter(m => m !== null) as Milestone[];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting milestones by project:', error);
      return [];
    }
  }
  
  /**
   * Update a milestone
   * @param milestoneId Milestone ID
   * @param updates Milestone updates
   * @returns Updated milestone or null if not found
   */
  public async updateMilestone(milestoneId: string, updates: Partial<Milestone>): Promise<Milestone | null> {
    try {
      // Get current milestone
      const milestone = await this.getMilestone(milestoneId);
      
      if (!milestone) {
        return null;
      }
      
      // Apply updates
      const updatedMilestone: Milestone = {
        ...milestone,
        ...updates,
        id: milestone.id, // Ensure ID doesn't change
        updatedAt: new Date()
      };
      
      // Update cache
      this.milestonesCache.set(milestoneId, updatedMilestone);
      
      // Persist to storage
      if (storage && typeof storage.updateMilestone === 'function') {
        await storage.updateMilestone(milestoneId, updatedMilestone);
      }
      
      // Check if the milestone is completed
      if (updatedMilestone.status === 'completed' && !updatedMilestone.completedAt) {
        updatedMilestone.completedAt = new Date();
        
        // Persist completion date
        if (storage && typeof storage.updateMilestone === 'function') {
          await storage.updateMilestone(milestoneId, updatedMilestone);
        }
        
        // Update project progress
        await this.updateProjectProgress(updatedMilestone.projectId);
        
        // Update dependent milestones
        if (updatedMilestone.dependents && updatedMilestone.dependents.length > 0) {
          for (const depId of updatedMilestone.dependents) {
            await this.updateDependentMilestone(depId);
          }
        }
      }
      
      return updatedMilestone;
    } catch (error) {
      console.error('Error updating milestone:', error);
      return null;
    }
  }
  
  /**
   * Add a goal to a project
   * @param projectId Project ID
   * @param goalId Goal ID
   * @returns Updated project or null if not found
   */
  public async addGoalToProject(projectId: string, goalId: string): Promise<Project | null> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      // Add goal ID if not already present
      if (!project.goalIds.includes(goalId)) {
        const goalIds = [...project.goalIds, goalId];
        return this.updateProject(projectId, { goalIds });
      }
      
      return project;
    } catch (error) {
      console.error('Error adding goal to project:', error);
      return null;
    }
  }
  
  /**
   * Add a task to a milestone
   * @param milestoneId Milestone ID
   * @param taskId Task ID
   * @returns Updated milestone or null if not found
   */
  public async addTaskToMilestone(milestoneId: string, taskId: string): Promise<Milestone | null> {
    try {
      // Get milestone
      const milestone = await this.getMilestone(milestoneId);
      
      if (!milestone) {
        return null;
      }
      
      // Add task ID if not already present
      if (!milestone.taskIds.includes(taskId)) {
        const taskIds = [...milestone.taskIds, taskId];
        return this.updateMilestone(milestoneId, { taskIds });
      }
      
      return milestone;
    } catch (error) {
      console.error('Error adding task to milestone:', error);
      return null;
    }
  }
  
  /**
   * Update project progress based on goals and milestones
   * @param projectId Project ID
   * @returns Updated project or null if not found
   */
  public async updateProjectProgress(projectId: string): Promise<Project | null> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      // Get goals
      const goals: Goal[] = [];
      for (const goalId of project.goalIds) {
        const goal = await taskPlanner.getGoal(goalId);
        if (goal) {
          goals.push(goal);
        }
      }
      
      // Get milestones
      const milestones = await this.getMilestonesByProject(projectId);
      
      // Calculate progress based on goals
      let goalProgress = 0;
      if (goals.length > 0) {
        goalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;
      }
      
      // Calculate progress based on milestones
      let milestoneProgress = 0;
      if (milestones.length > 0) {
        milestoneProgress = milestones.reduce((sum, milestone) => sum + milestone.progress, 0) / milestones.length;
      }
      
      // Calculate overall progress (weighted average)
      const overallProgress = Math.round(
        (goalProgress * 0.6) + // Goals are 60% of progress
        (milestoneProgress * 0.4) // Milestones are 40% of progress
      );
      
      // Update project
      return this.updateProject(projectId, { progress: overallProgress });
    } catch (error) {
      console.error('Error updating project progress:', error);
      return null;
    }
  }
  
  /**
   * Update milestone progress based on tasks
   * @param milestoneId Milestone ID
   * @returns Updated milestone or null if not found
   */
  public async updateMilestoneProgress(milestoneId: string): Promise<Milestone | null> {
    try {
      // Get milestone
      const milestone = await this.getMilestone(milestoneId);
      
      if (!milestone) {
        return null;
      }
      
      // If no tasks, update based on goals
      if (!milestone.taskIds || milestone.taskIds.length === 0) {
        // Get goals
        const goals: Goal[] = [];
        for (const goalId of milestone.goalIds) {
          const goal = await taskPlanner.getGoal(goalId);
          if (goal) {
            goals.push(goal);
          }
        }
        
        // Calculate progress based on goals
        let progress = 0;
        if (goals.length > 0) {
          progress = Math.round(
            goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length
          );
        }
        
        // Update milestone
        return this.updateMilestone(milestoneId, { progress });
      }
      
      // Get tasks
      const tasks: Task[] = [];
      for (const taskId of milestone.taskIds) {
        const task = await taskPlanner.getTask(taskId);
        if (task) {
          tasks.push(task);
        }
      }
      
      // Calculate progress based on tasks
      let progress = 0;
      if (tasks.length > 0) {
        progress = Math.round(
          tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length
        );
      }
      
      // Update milestone status based on progress
      let status: 'pending' | 'active' | 'completed' | 'missed' = milestone.status;
      
      if (progress === 100) {
        status = 'completed';
      } else if (progress > 0) {
        status = 'active';
      } else if (
        milestone.targetDate && 
        new Date() > milestone.targetDate && 
        progress < 100
      ) {
        status = 'missed';
      }
      
      // Update milestone
      return this.updateMilestone(milestoneId, { progress, status });
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      return null;
    }
  }
  
  /**
   * Update milestone statuses for a project
   * @param projectId Project ID
   */
  public async updateMilestoneStatuses(projectId: string): Promise<void> {
    try {
      // Get milestones
      const milestones = await this.getMilestonesByProject(projectId);
      
      // Update each milestone
      for (const milestone of milestones) {
        // Skip completed or missed milestones
        if (milestone.status === 'completed' || milestone.status === 'missed') {
          continue;
        }
        
        // Update milestone progress
        await this.updateMilestoneProgress(milestone.id);
        
        // Check for missed deadlines
        if (
          milestone.targetDate && 
          new Date() > milestone.targetDate && 
          milestone.status !== 'completed'
        ) {
          await this.updateMilestone(milestone.id, { status: 'missed' });
        }
      }
    } catch (error) {
      console.error('Error updating milestone statuses:', error);
    }
  }
  
  /**
   * Update a dependent milestone when its dependency is completed
   * @param milestoneId Milestone ID
   * @returns Updated milestone or null if not found
   */
  private async updateDependentMilestone(milestoneId: string): Promise<Milestone | null> {
    try {
      // Get milestone
      const milestone = await this.getMilestone(milestoneId);
      
      if (!milestone) {
        return null;
      }
      
      // Check if dependencies are completed
      let allDependenciesCompleted = true;
      
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        for (const depId of milestone.dependencies) {
          const depMilestone = await this.getMilestone(depId);
          
          if (!depMilestone || depMilestone.status !== 'completed') {
            allDependenciesCompleted = false;
            break;
          }
        }
      }
      
      // If all dependencies are completed, update milestone status
      if (allDependenciesCompleted && milestone.status === 'pending') {
        return this.updateMilestone(milestoneId, { status: 'active' });
      }
      
      return milestone;
    } catch (error) {
      console.error('Error updating dependent milestone:', error);
      return null;
    }
  }
  
  /**
   * Generate project suggestions based on conversation
   * @param conversationText Recent conversation text
   * @param sessionId Session ID
   * @returns Project suggestions
   */
  public async generateProjectSuggestions(
    conversationText: string,
    sessionId: string
  ): Promise<Array<{title: string; description: string; type: string}>> {
    try {
      // Get existing projects for context
      const projects = await this.getProjectsBySession(sessionId);
      
      // Use OpenAI for suggestions if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Create prompt for suggestions
        const suggestionsPrompt = `
          Based on this conversation:
          
          ${conversationText}
          
          ${projects.length > 0 ? `And considering these existing projects:
          ${projects.map(p => `- ${p.title}: ${p.description}`).join('\n')}` : ''}
          
          Suggest 1-3 potential project ideas that would help the user. For each suggestion, include:
          - A clear, descriptive title
          - A concise description of the project
          - The type of project (e.g., "research", "development", "planning", etc.)
          
          Return suggestions as a JSON array with objects having "title", "description", and "type" properties.
          Only suggest projects that are directly relevant to the conversation.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: suggestionsPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const suggestionsResult = JSON.parse(openaiResponse.choices[0].message.content);
            return Array.isArray(suggestionsResult.suggestions) ? 
              suggestionsResult.suggestions : [];
          }
        } catch (error) {
          console.error('Error generating project suggestions with OpenAI:', error);
        }
      }
      
      // Simple fallback suggestion
      return [
        {
          title: 'New Project',
          description: 'A project based on your recent conversation',
          type: 'planning'
        }
      ];
    } catch (error) {
      console.error('Error generating project suggestions:', error);
      return [];
    }
  }
  
  /**
   * Suggest new goals for a project
   * @param projectId Project ID
   * @returns New goal IDs
   */
  private async suggestNewGoals(projectId: string): Promise<string[]> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return [];
      }
      
      // Get existing goals
      const existingGoals: Goal[] = [];
      for (const goalId of project.goalIds) {
        const goal = await taskPlanner.getGoal(goalId);
        if (goal) {
          existingGoals.push(goal);
        }
      }
      
      // Use OpenAI for goal suggestions if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Create prompt for suggestions
        const suggestionsPrompt = `
          Based on this project:
          
          PROJECT TITLE: ${project.title}
          PROJECT DESCRIPTION: ${project.description}
          CURRENT PROGRESS: ${project.progress}%
          TAGS: ${project.tags.join(', ')}
          
          And considering these existing goals:
          ${existingGoals.map(g => `- ${g.title}: ${g.description} (${g.progress}%)`).join('\n')}
          
          Suggest 1-2 additional goals that would enhance this project. For each suggestion, include:
          - A clear, specific goal title
          - A detailed description of the goal
          
          Return suggestions as a JSON array with objects having "title" and "description" properties.
          Ensure the goals are distinct from existing goals and add meaningful value to the project.
        `;
        
        try {
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: suggestionsPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          });
          
          if (openaiResponse.choices && openaiResponse.choices[0]?.message?.content) {
            // Track API usage
            apiQuotaManager.trackUsage(ApiService.OPENAI, {
              tokens: openaiResponse.usage?.total_tokens || 0,
              model: "gpt-4o"
            });
            
            const suggestionsResult = JSON.parse(openaiResponse.choices[0].message.content);
            const goalSuggestions = Array.isArray(suggestionsResult.goals) ? 
              suggestionsResult.goals : [];
            
            // Create suggested goals
            const newGoalIds: string[] = [];
            
            for (const goalSuggestion of goalSuggestions) {
              const goal = await taskPlanner.createGoal(
                goalSuggestion.title,
                goalSuggestion.description,
                project.sessionId,
                project.userId,
                TaskPriority.MEDIUM
              );
              
              newGoalIds.push(goal.id);
              
              // Add goal to project
              await this.addGoalToProject(projectId, goal.id);
              
              // Add note about suggested goal
              await this.updateProject(projectId, {
                notes: [
                  ...(project.notes || []),
                  `System suggested new goal: ${goalSuggestion.title}`
                ]
              });
            }
            
            return newGoalIds;
          }
        } catch (error) {
          console.error('Error suggesting new goals with OpenAI:', error);
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error suggesting new goals:', error);
      return [];
    }
  }
  
  /**
   * Analyze project for risks and blockers
   * @param projectId Project ID
   * @returns Risk analysis
   */
  private async analyzeProjectRisks(projectId: string): Promise<{
    risks: string[];
    blockers: string[];
    recommendations: string[];
  } | null> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      // Get goals
      const goals: Goal[] = [];
      for (const goalId of project.goalIds) {
        const goal = await taskPlanner.getGoal(goalId);
        if (goal) {
          goals.push(goal);
        }
      }
      
      // Get milestones
      const milestones = await this.getMilestonesByProject(projectId);
      
      // Use OpenAI for risk analysis if available
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        // Get tasks for each goal
        const allTasks: Task[] = [];
        
        for (const goal of goals) {
          const goalTasks = await taskPlanner.getTasksByGoal(goal.id);
          allTasks.push(...goalTasks);
        }
        
        // Count tasks by status
        const taskCounts = {
          pending: allTasks.filter(t => t.status === TaskStatus.PENDING).length,
          inProgress: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
          completed: allTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
          blocked: allTasks.filter(t => t.status === TaskStatus.BLOCKED).length,
          cancelled: allTasks.filter(t => t.status === TaskStatus.CANCELLED).length
        };
        
        // Create prompt for analysis
        const analysisPrompt = `
          Analyze this project for potential risks and blockers:
          
          PROJECT TITLE: ${project.title}
          PROJECT DESCRIPTION: ${project.description}
          PROGRESS: ${project.progress}%
          
          GOALS (${goals.length}):
          ${goals.map(g => `- ${g.title}: ${g.progress}% complete`).join('\n')}
          
          MILESTONES (${milestones.length}):
          ${milestones.map(m => `- ${m.title}: ${m.status} (${m.progress}%)`).join('\n')}
          
          TASK SUMMARY:
          - Pending: ${taskCounts.pending}
          - In Progress: ${taskCounts.inProgress}
          - Completed: ${taskCounts.completed}
          - Blocked: ${taskCounts.blocked}
          - Cancelled: ${taskCounts.cancelled}
          
          Identify potential risks, current blockers, and provide recommendations using the available information.
          Return analysis as a JSON object with these arrays: "risks", "blockers", and "recommendations".
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
            
            // Update project metadata with analysis
            await this.updateProject(projectId, {
              metadata: {
                ...(project.metadata || {}),
                riskAnalysis: {
                  risks: analysisResult.risks || [],
                  blockers: analysisResult.blockers || [],
                  recommendations: analysisResult.recommendations || [],
                  timestamp: new Date()
                }
              }
            });
            
            return {
              risks: analysisResult.risks || [],
              blockers: analysisResult.blockers || [],
              recommendations: analysisResult.recommendations || []
            };
          }
        } catch (error) {
          console.error('Error analyzing project risks with OpenAI:', error);
        }
      }
      
      // Simple fallback analysis
      const blockedMilestones = milestones.filter(m => m.status === 'blocked' || m.status === 'missed');
      const missedDeadlines = milestones.filter(m => m.status === 'missed');
      const lowProgressGoals = goals.filter(g => g.progress < 25 && g.status === 'active');
      
      const risks = [
        lowProgressGoals.length > 0 ? 'Some goals have low progress' : null,
        missedDeadlines.length > 0 ? 'Some milestones have missed deadlines' : null
      ].filter(r => r !== null) as string[];
      
      const blockers = [
        blockedMilestones.length > 0 ? 'Some milestones are blocked' : null
      ].filter(b => b !== null) as string[];
      
      const recommendations = [
        blockedMilestones.length > 0 ? 'Address blocked milestones to continue progress' : null,
        lowProgressGoals.length > 0 ? 'Focus on low-progress goals to maintain balanced development' : null
      ].filter(r => r !== null) as string[];
      
      // Update project metadata with analysis
      await this.updateProject(projectId, {
        metadata: {
          ...(project.metadata || {}),
          riskAnalysis: {
            risks,
            blockers,
            recommendations,
            timestamp: new Date()
          }
        }
      });
      
      return { risks, blockers, recommendations };
    } catch (error) {
      console.error('Error analyzing project risks:', error);
      return null;
    }
  }
  
  /**
   * Generate a project summary
   * @param projectId Project ID
   * @returns Project summary
   */
  public async generateProjectSummary(projectId: string): Promise<ProjectSummary | null> {
    try {
      // Get project
      const project = await this.getProject(projectId);
      
      if (!project) {
        return null;
      }
      
      // Get milestones
      const milestones = await this.getMilestonesByProject(projectId);
      
      // Get goals
      const goals: Array<{
        id: string;
        title: string;
        status: string;
        progress: number;
      }> = [];
      
      for (const goalId of project.goalIds) {
        const goal = await taskPlanner.getGoal(goalId);
        if (goal) {
          goals.push({
            id: goal.id,
            title: goal.title,
            status: goal.status,
            progress: goal.progress
          });
        }
      }
      
      // Get deadlines
      const nextDeadlines: Array<{
        type: 'milestone' | 'goal';
        id: string;
        title: string;
        date: Date;
      }> = [];
      
      // Add milestone deadlines
      for (const milestone of milestones) {
        if (milestone.targetDate && milestone.status !== 'completed') {
          nextDeadlines.push({
            type: 'milestone',
            id: milestone.id,
            title: milestone.title,
            date: milestone.targetDate
          });
        }
      }
      
      // Add goal deadlines
      for (const goalId of project.goalIds) {
        const goal = await taskPlanner.getGoal(goalId);
        if (goal && goal.deadline && goal.status !== 'completed') {
          nextDeadlines.push({
            type: 'goal',
            id: goal.id,
            title: goal.title,
            date: goal.deadline
          });
        }
      }
      
      // Sort deadlines by date
      nextDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Get current focus (in-progress items)
      const currentFocus: string[] = [];
      
      // Add in-progress milestones
      const activeMilestones = milestones.filter(m => m.status === 'active');
      for (const milestone of activeMilestones) {
        currentFocus.push(`Milestone: ${milestone.title}`);
      }
      
      // Add active goals with < 100% progress
      for (const goal of goals) {
        if (goal.status === 'active' && goal.progress < 100) {
          currentFocus.push(`Goal: ${goal.title}`);
        }
      }
      
      // Get risks and blockers
      let risksAndBlockers: string[] = [];
      
      // Check for risks in project metadata
      if (
        project.metadata?.riskAnalysis?.risks ||
        project.metadata?.riskAnalysis?.blockers
      ) {
        const { risks = [], blockers = [] } = project.metadata.riskAnalysis;
        risksAndBlockers = [...risks, ...blockers];
      } else {
        // Simple risk detection
        risksAndBlockers = [
          milestones.some(m => m.status === 'missed') ? 'Missed milestone deadlines' : null,
          project.progress < 25 && project.status === 'active' ? 'Low overall progress' : null
        ].filter(r => r !== null) as string[];
      }
      
      // Compile summary
      const summary: ProjectSummary = {
        project,
        milestones,
        goals,
        nextDeadlines,
        currentFocus,
        risksAndBlockers
      };
      
      return summary;
    } catch (error) {
      console.error('Error generating project summary:', error);
      return null;
    }
  }
}

// Export singleton instance
export const projectAgent = ProjectAgent.getInstance();