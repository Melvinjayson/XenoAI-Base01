import OpenAI from "openai";
import { apiQuotaManager } from "./api-quota-manager";
import { KnowledgeGraph, GraphInsight, extractEntities, enhanceGraphWithAI } from "./knowledge-graph";
import { MindMap } from "./mind-map-manager";
import { DetectedContext, analyzeConversationContext, ActionType } from "./context-agent";
import { ChatMessage } from "./types";
import { ModelConfig } from "./model-selector";
import * as path from 'path';
import * as fs from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024

/**
 * AI Research Agent - Provides proactive oversight and automated research operations
 * across the system, including canvas elements, workbenches, and projects.
 */
export class AIResearchAgent {
  private static instance: AIResearchAgent;
  private projectUpdateQueue: Map<number, number> = new Map(); // projectId -> timestamp
  private graphUpdateQueue: Map<string, number> = new Map(); // graphId -> timestamp
  private canvasUpdateQueue: Map<string, number> = new Map(); // canvasId -> timestamp
  private isProcessing: boolean = false;
  private lastProcessingTime: number = 0;
  private processingInterval: number = 5 * 60 * 1000; // 5 minutes
  private userFeedbackRegistry: Map<string, UserFeedback[]> = new Map(); // resourceId -> feedback
  
  private constructor() {
    // Initialize agent and setup automatic processing
    setInterval(() => this.processQueues(), this.processingInterval);
  }
  
  public static getInstance(): AIResearchAgent {
    if (!AIResearchAgent.instance) {
      AIResearchAgent.instance = new AIResearchAgent();
    }
    return AIResearchAgent.instance;
  }
  
  /**
   * Register an entity for automated processing and updates
   * @param entityType Type of entity (project, graph, canvas, etc.)
   * @param entityId Unique identifier for the entity
   * @param priority Priority level (higher = processed sooner)
   */
  public registerEntity(
    entityType: 'project' | 'graph' | 'canvas' | 'mindmap',
    entityId: string | number,
    priority: number = 1
  ): void {
    const now = Date.now();
    const queueDelay = Math.max(1000, 60000 / priority); // Higher priority = less delay
    
    switch (entityType) {
      case 'project':
        this.projectUpdateQueue.set(Number(entityId), now + queueDelay);
        break;
      case 'graph':
        this.graphUpdateQueue.set(String(entityId), now + queueDelay);
        break;
      case 'canvas':
        this.canvasUpdateQueue.set(String(entityId), now + queueDelay);
        break;
      // Add other entity types as needed
    }
  }
  
  /**
   * Add user feedback for a specific resource (project, graph node, etc.)
   * @param resourceType Type of resource the feedback is for
   * @param resourceId Identifier for the resource
   * @param feedback User feedback data
   */
  public addUserFeedback(
    resourceType: 'project' | 'graph' | 'node' | 'insight' | 'canvas',
    resourceId: string | number,
    feedback: UserFeedback
  ): void {
    const id = `${resourceType}:${resourceId}`;
    
    if (!this.userFeedbackRegistry.has(id)) {
      this.userFeedbackRegistry.set(id, []);
    }
    
    const feedbackList = this.userFeedbackRegistry.get(id)!;
    feedbackList.push({
      ...feedback,
      timestamp: feedback.timestamp || Date.now()
    });
    
    // Limit feedback history to prevent memory bloat
    if (feedbackList.length > 20) {
      feedbackList.splice(0, feedbackList.length - 20);
    }
    
    this.userFeedbackRegistry.set(id, feedbackList);
    
    // Register the entity for processing based on feedback
    if (resourceType === 'project') {
      this.registerEntity('project', resourceId, 2); // Higher priority for user feedback
    } else if (resourceType === 'graph') {
      this.registerEntity('graph', resourceId, 2);
    } else if (resourceType === 'canvas') {
      this.registerEntity('canvas', resourceId, 2);
    }
  }
  
  /**
   * Process all queued entities and updates
   * Respects API rate limits and prioritizes recent user interactions
   */
  private async processQueues(): Promise<void> {
    // Avoid concurrent processing
    if (this.isProcessing) return;
    
    // Respect minimum interval between processing runs
    const now = Date.now();
    if (now - this.lastProcessingTime < this.processingInterval / 2) return;
    
    this.isProcessing = true;
    this.lastProcessingTime = now;
    
    try {
      // Process project updates
      for (const [projectId, timestamp] of this.projectUpdateQueue.entries()) {
        if (timestamp <= now) {
          await this.processProjectUpdate(projectId);
          this.projectUpdateQueue.delete(projectId);
        }
      }
      
      // Process graph updates
      for (const [graphId, timestamp] of this.graphUpdateQueue.entries()) {
        if (timestamp <= now) {
          await this.processGraphUpdate(graphId);
          this.graphUpdateQueue.delete(graphId);
        }
      }
      
      // Process canvas updates
      for (const [canvasId, timestamp] of this.canvasUpdateQueue.entries()) {
        if (timestamp <= now) {
          await this.processCanvasUpdate(canvasId);
          this.canvasUpdateQueue.delete(canvasId);
        }
      }
    } catch (error) {
      console.error("Error processing AI Research Agent queues:", error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process a project update, generating new insights, suggestions,
   * and potential connections to other research components
   */
  private async processProjectUpdate(projectId: number): Promise<void> {
    try {
      // Fetch project data (implement getProjectData in your storage layer)
      const project = await globalThis.storage?.getProject(projectId);
      if (!project) return;
      
      // Get relevant user feedback
      const feedbackKey = `project:${projectId}`;
      const feedback = this.userFeedbackRegistry.get(feedbackKey) || [];
      
      // Check API quota before proceeding
      const quotaCheck = apiQuotaManager.checkRateLimit('openai', 800);
      if (quotaCheck.isLimited) {
        console.log(`OpenAI API rate limited, delaying project update for project ${projectId}`);
        // Re-queue with delay
        this.projectUpdateQueue.set(projectId, Date.now() + 15 * 60 * 1000); // 15 min delay
        return;
      }
      
      // Generate and apply updates using AI
      await this.generateProjectInsights(project, feedback);
      
      // Record successful API usage
      apiQuotaManager.recordApiUsage('openai', 800); // Estimate token usage
      
    } catch (error) {
      console.error(`Error processing project update for project ${projectId}:`, error);
    }
  }
  
  /**
   * Generate new research insights for a project based on content and feedback
   */
  private async generateProjectInsights(
    project: any, // Use any instead of ProjectWithRelations
    feedback: UserFeedback[]
  ): Promise<void> {
    try {
      // Extract relevant information from project and tasks
      const projectSummary = `Project: ${project.title}\nDescription: ${project.description || 'No description'}\nStatus: ${project.status || 'In progress'}`;
      
      const taskSummary = project.tasks?.map(task => 
        `- ${task.title} (${task.status || 'Pending'}): ${task.description}`
      ).join('\n') || 'No tasks available';
      
      const insightSummary = project.insights?.map(insight => 
        `- ${insight.title} (Confidence: ${insight.confidence}): ${insight.content}`
      ).join('\n') || 'No insights available';
      
      const feedbackSummary = feedback.length > 0 
        ? feedback.map(f => `- ${f.type}: ${f.content} (${f.timestamp ? new Date(f.timestamp).toISOString() : 'unknown time'})`).join('\n')
        : 'No user feedback available';
      
      // Build AI prompt for insight generation
      const prompt = `You are an AI research assistant helping to enhance a research project by generating new insights and suggestions.

PROJECT INFORMATION:
${projectSummary}

CURRENT TASKS:
${taskSummary}

EXISTING INSIGHTS:
${insightSummary}

USER FEEDBACK:
${feedbackSummary}

Based on the above information, please:
1. Generate 2-3 new research insights that would be valuable for this project
2. Identify potential connections to explore between existing tasks and insights
3. Suggest 1-2 new research directions or tasks that should be considered

Format your response as a JSON object with the following structure:
{
  "newInsights": [
    {
      "title": "Insight title",
      "content": "Detailed explanation of the insight",
      "confidence": 0.8, // between 0 and 1
      "tags": ["tag1", "tag2"]
    }
  ],
  "connections": [
    {
      "from": "Element description (e.g., task or insight name)",
      "to": "Element description (e.g., task or insight name)",
      "relationship": "Brief description of the connection",
      "strength": 0.7 // between 0 and 1
    }
  ],
  "suggestedTasks": [
    {
      "title": "Task title",
      "description": "Detailed description of the task",
      "priority": "high" // high, medium, or low
    }
  ]
}`;

      // Make the API call
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      
      // Parse response
      const content = response.choices[0].message.content;
      if (!content) return;
      
      const result = JSON.parse(content);
      
      // Apply the generated insights and tasks to the project
      if (result.newInsights && Array.isArray(result.newInsights)) {
        for (const insight of result.newInsights) {
          if (insight.title && insight.content) {
            await globalThis.storage?.createResearchInsight({
              projectId: project.id,
              title: insight.title,
              content: insight.content,
              confidence: insight.confidence || 0.7,
              tags: insight.tags || [],
              source: 'AI Assistant',
              metadata: { generatedBy: 'ai-research-agent', timestamp: Date.now() }
            });
          }
        }
      }
      
      // Add suggested tasks to the project
      if (result.suggestedTasks && Array.isArray(result.suggestedTasks)) {
        for (const task of result.suggestedTasks) {
          if (task.title && task.description) {
            await globalThis.storage?.createTask({
              projectId: project.id,
              title: task.title,
              description: task.description,
              priority: task.priority || 'medium',
              status: 'pending',
              metadata: { generatedBy: 'ai-research-agent', timestamp: Date.now() }
            });
          }
        }
      }
      
    } catch (error) {
      console.error("Error generating project insights:", error);
    }
  }
  
  /**
   * Process a knowledge graph update, enhancing nodes, generating insights,
   * and suggesting new connections based on recent research
   */
  private async processGraphUpdate(graphId: string): Promise<void> {
    try {
      // Implement graph update logic based on user feedback and system state
      const graph = await globalThis.storage?.getKnowledgeGraph(graphId);
      if (!graph) return;
      
      // Get relevant user feedback
      const feedbackKey = `graph:${graphId}`;
      const feedback = this.userFeedbackRegistry.get(feedbackKey) || [];
      
      // Check API quota before proceeding
      const quotaCheck = apiQuotaManager.checkRateLimit('openai', 1000);
      if (quotaCheck.isLimited) {
        console.log(`OpenAI API rate limited, delaying graph update for graph ${graphId}`);
        // Re-queue with delay
        this.graphUpdateQueue.set(graphId, Date.now() + 20 * 60 * 1000); // 20 min delay
        return;
      }
      
      // Use the existing enhanceGraphWithAI function but with feedback integration
      const enhancedGraph = await enhanceGraphWithAI(graph, {
        userFeedback: feedback.map(f => ({
          type: f.type as 'positive' | 'negative' | 'correction',
          content: f.content,
          timestamp: f.timestamp
        }))
      });
      
      // Save the enhanced graph
      await globalThis.storage?.updateKnowledgeGraph(graphId, enhancedGraph);
      
      // Record successful API usage
      apiQuotaManager.recordApiUsage('openai', 1000); // Estimate token usage
      
    } catch (error) {
      console.error(`Error processing graph update for graph ${graphId}:`, error);
    }
  }
  
  /**
   * Process canvas update, organizing elements, suggesting connections,
   * and providing context-aware enhancements
   */
  private async processCanvasUpdate(canvasId: string): Promise<void> {
    try {
      // Implement canvas update logic
      const canvas = await globalThis.storage?.getCanvas(canvasId);
      if (!canvas) return;
      
      // Get all canvas elements
      const elements = await globalThis.storage?.getCanvasElements(canvasId);
      if (!elements || elements.length === 0) return;
      
      // Get relevant user feedback
      const feedbackKey = `canvas:${canvasId}`;
      const feedback = this.userFeedbackRegistry.get(feedbackKey) || [];
      
      // Check API quota before proceeding
      const quotaCheck = apiQuotaManager.checkRateLimit('openai', 800);
      if (quotaCheck.isLimited) {
        console.log(`OpenAI API rate limited, delaying canvas update for canvas ${canvasId}`);
        // Re-queue with delay
        this.canvasUpdateQueue.set(canvasId, Date.now() + 15 * 60 * 1000); // 15 min delay
        return;
      }
      
      // Generate suggestions for canvas organization and enhancement
      const suggestions = await this.generateCanvasSuggestions(canvas, elements, feedback);
      
      // Store the suggestions for later retrieval by the client
      await globalThis.storage?.saveCanvasSuggestions(canvasId, suggestions);
      
      // Record successful API usage
      apiQuotaManager.recordApiUsage('openai', 800); // Estimate token usage
      
    } catch (error) {
      console.error(`Error processing canvas update for canvas ${canvasId}:`, error);
    }
  }
  
  /**
   * Generate suggestions for canvas organization and content
   */
  private async generateCanvasSuggestions(
    canvas: any,
    elements: any[],
    feedback: UserFeedback[]
  ): Promise<CanvasSuggestion[]> {
    try {
      // Extract text content from elements
      const textElements = elements.filter(el => el.type === 'text' || el.type === 'note');
      const elementsSummary = textElements.map(el => 
        `- ${el.type}: "${el.content?.trim ? el.content.trim().substring(0, 100) : el.content}" (Position: x=${el.x}, y=${el.y})`
      ).join('\n');
      
      // Extract feedback summary
      const feedbackSummary = feedback.length > 0 
        ? feedback.map(f => `- ${f.type}: ${f.content}`).join('\n')
        : 'No user feedback available';
      
      // Build AI prompt for canvas suggestion generation
      const prompt = `As an AI research assistant, analyze this canvas and provide suggestions for organization and enhancement.

CANVAS INFORMATION:
Title: ${canvas.title || 'Untitled Canvas'}
Description: ${canvas.description || 'No description'}
Elements: ${elements.length} total elements (${textElements.length} text/note elements)

TEXT ELEMENT CONTENTS:
${elementsSummary}

USER FEEDBACK:
${feedbackSummary}

Please generate the following:
1. Suggestions for organizing the canvas elements into logical groups
2. Potential connections between elements that are conceptually related
3. Ideas for enhancing the canvas with additional elements or research
4. Identification of key concepts or themes in the canvas

Format your response as a JSON array of suggestion objects with this structure:
[
  {
    "type": "organization | connection | enhancement | theme",
    "title": "Brief title for the suggestion",
    "description": "Detailed description of the suggestion",
    "elements": ["element content or identifier"],
    "confidence": 0.8 // between 0 and 1
  }
]`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.6,
      });
      
      // Parse and validate response
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      const suggestions = JSON.parse(content);
      
      if (!Array.isArray(suggestions)) {
        return [];
      }
      
      // Map and validate suggestions
      return suggestions.map(suggestion => ({
        type: suggestion.type || 'enhancement',
        title: suggestion.title || 'Untitled Suggestion',
        description: suggestion.description || '',
        elements: Array.isArray(suggestion.elements) ? suggestion.elements : [],
        confidence: typeof suggestion.confidence === 'number' ? suggestion.confidence : 0.7,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error("Error generating canvas suggestions:", error);
      return [];
    }
  }
  
  /**
   * Analyze user behavior and research patterns to suggest
   * improvements to the workbench UI and research experience
   */
  public async analyzeUserBehavior(
    userId: string,
    sessions: any[],
    interactions: any[]
  ): Promise<UserBehaviorAnalysis> {
    try {
      // Check API quota
      const quotaCheck = apiQuotaManager.checkRateLimit('openai', 500);
      if (quotaCheck.isLimited) {
        return this.generateSimpleBehaviorAnalysis(sessions, interactions);
      }
      
      // Summarize sessions and interactions data
      const sessionsSummary = sessions.slice(-5).map(s => 
        `- Session ${s.id}: ${new Date(s.startTime).toLocaleString()} to ${new Date(s.endTime).toLocaleString()} (${Math.round((s.endTime - s.startTime) / 60000)} minutes)`
      ).join('\n');
      
      const interactionsSummary = interactions.slice(-20).map(i => 
        `- ${new Date(i.timestamp).toLocaleString()}: ${i.type} - ${i.target}`
      ).join('\n');
      
      // Build AI prompt
      const prompt = `Analyze the user's research behavior and suggest improvements to their experience.

RECENT SESSIONS:
${sessionsSummary}

RECENT INTERACTIONS:
${interactionsSummary}

Based on this data, please provide:
1. A summary of the user's research patterns and behaviors
2. Suggestions for improving their research workflow
3. Recommendations for features or content that might be valuable
4. Key optimization opportunities to save the user time or effort

Format your response as a JSON object with this structure:
{
  "patterns": ["Pattern 1", "Pattern 2", ...],
  "suggestions": ["Suggestion 1", "Suggestion 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "optimizations": ["Optimization 1", "Optimization 2", ...]
}`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      
      // Parse and validate response
      const content = response.choices[0].message.content;
      if (!content) {
        return this.generateSimpleBehaviorAnalysis(sessions, interactions);
      }
      
      const result = JSON.parse(content);
      
      // Record API usage
      apiQuotaManager.recordApiUsage('openai', 500);
      
      return {
        patterns: Array.isArray(result.patterns) ? result.patterns : [],
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        optimizations: Array.isArray(result.optimizations) ? result.optimizations : []
      };
      
    } catch (error) {
      console.error("Error analyzing user behavior:", error);
      return this.generateSimpleBehaviorAnalysis(sessions, interactions);
    }
  }
  
  /**
   * Generate a simple behavior analysis without using AI
   */
  private generateSimpleBehaviorAnalysis(
    sessions: any[],
    interactions: any[]
  ): UserBehaviorAnalysis {
    // Calculate average session length
    const avgSessionLength = sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.endTime - s.startTime), 0) / sessions.length / 60000
      : 0;
    
    // Count interaction types
    const interactionTypes = new Map<string, number>();
    for (const interaction of interactions) {
      const count = interactionTypes.get(interaction.type) || 0;
      interactionTypes.set(interaction.type, count + 1);
    }
    
    // Generate simple patterns
    const patterns = [
      `Average session length: ${Math.round(avgSessionLength)} minutes`,
      `Total sessions: ${sessions.length}`,
      `Most frequent interaction: ${
        [...interactionTypes.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `${type} (${count})`)
          .slice(0, 1)
          .join(', ') || 'None'
      }`
    ];
    
    // Generate simple suggestions
    const suggestions = [
      'Try using the knowledge graph feature to visualize connections',
      'Consider organizing your research into focused projects',
      'Regular session breaks can improve research productivity'
    ];
    
    return {
      patterns,
      suggestions,
      recommendations: [
        'Explore the mind mapping feature for brainstorming',
        'Leverage the AI assistant for summarizing complex topics'
      ],
      optimizations: [
        'Use keyboard shortcuts for common actions',
        'Save frequently accessed resources to your workspace'
      ]
    };
  }
  
  /**
   * Execute a specific research action based on the detected context
   * and desired action type.
   */
  public async executeResearchAction(
    action: ActionType,
    context: DetectedContext,
    params: Record<string, any> = {}
  ): Promise<ActionExecutionResult> {
    try {
      let result: ActionExecutionResult = {
        success: false,
        message: 'Action not implemented',
        data: null
      };
      
      switch (action) {
        case 'create_knowledge_graph':
          // Implement knowledge graph creation logic
          result = await this.executeCreateKnowledgeGraphAction(context, params);
          break;
          
        case 'create_mind_map':
          // Implement mind map creation logic
          result = await this.executeCreateMindMapAction(context, params);
          break;
          
        case 'create_project':
          // Implement project creation logic
          result = await this.executeCreateProjectAction(context, params);
          break;
          
        case 'add_research_insight':
          // Implement insight addition logic
          result = await this.executeAddResearchInsightAction(context, params);
          break;
          
        // Add more action implementations as needed
          
        default:
          result = {
            success: false,
            message: `Action '${action}' not implemented`,
            data: null
          };
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing research action '${action}':`, error);
      return {
        success: false,
        message: `Error executing action: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
  
  /**
   * Execute knowledge graph creation action
   */
  private async executeCreateKnowledgeGraphAction(
    context: DetectedContext,
    params: Record<string, any>
  ): Promise<ActionExecutionResult> {
    try {
      // Import the knowledge graph functionality
      const { createKnowledgeGraphFromSearch } = await import('./knowledge-graph');
      
      // Use the createKnowledgeGraphFromSearch function from knowledge-graph.ts
      const query = context.topic + (context.keywords.length > 0 ? ' ' + context.keywords.join(' ') : '');
      const graphResult = await createKnowledgeGraphFromSearch(query);
      
      return {
        success: true,
        message: 'Created knowledge graph based on context',
        data: graphResult
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create knowledge graph: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
  
  /**
   * Execute mind map creation action
   */
  private async executeCreateMindMapAction(
    context: DetectedContext,
    params: Record<string, any>
  ): Promise<ActionExecutionResult> {
    try {
      // Create a basic mind map structure without using the missing function
      const mindMap: any = {
        id: `mm_${Date.now()}`,
        centralTopic: context.topic,
        branches: context.keywords.map((keyword, index) => ({
          id: `branch_${index}`,
          text: keyword,
          children: []
        })),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      return {
        success: true,
        message: 'Created mind map',
        data: mindMap
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create mind map: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
  
  /**
   * Execute project creation action
   */
  private async executeCreateProjectAction(
    context: DetectedContext,
    params: Record<string, any>
  ): Promise<ActionExecutionResult> {
    try {
      // Create a project based on the context
      const project = await globalThis.storage?.createProject({
        title: params.title || `${context.topic} Research`,
        description: params.description || `Research project for exploring ${context.topic}`,
        status: 'active',
        color: params.color || '#6B4BFF',
        priority: params.priority || 'medium',
        userId: params.userId
      });
      
      if (!project) {
        throw new Error('Failed to create project');
      }
      
      // Create initial tasks based on context
      const tasks = [];
      
      // Add initial research task
      tasks.push(await globalThis.storage?.createTask({
        projectId: project.id,
        title: 'Initial Research',
        description: `Gather preliminary information about ${context.topic}`,
        priority: 'high',
        status: 'pending'
      }));
      
      // Add keyword exploration tasks
      for (const keyword of context.keywords.slice(0, 3)) {
        tasks.push(await globalThis.storage?.createTask({
          projectId: project.id,
          title: `Explore ${keyword}`,
          description: `Research the concept of ${keyword} in relation to ${context.topic}`,
          priority: 'medium',
          status: 'pending'
        }));
      }
      
      return {
        success: true,
        message: 'Created project with initial tasks',
        data: { project, tasks }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
  
  /**
   * Execute add research insight action
   */
  private async executeAddResearchInsightAction(
    context: DetectedContext,
    params: Record<string, any>
  ): Promise<ActionExecutionResult> {
    try {
      // Validate required parameters
      if (!params.projectId) {
        throw new Error('Project ID is required');
      }
      
      if (!params.title && !context.topic) {
        throw new Error('Insight title is required');
      }
      
      // Create the insight
      const insight = await globalThis.storage?.createResearchInsight({
        projectId: params.projectId,
        title: params.title || `Insight about ${context.topic}`,
        content: params.content || `This insight relates to ${context.topic} and may be connected to ${context.keywords.join(', ')}`,
        confidence: params.confidence || 0.7,
        tags: params.tags || context.keywords.slice(0, 3),
        source: params.source || 'AI Assistant',
      });
      
      if (!insight) {
        throw new Error('Failed to create insight');
      }
      
      return {
        success: true,
        message: 'Added research insight',
        data: insight
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to add research insight: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      };
    }
  }
}

/**
 * Interface for user feedback on research elements
 */
export interface UserFeedback {
  type: 'positive' | 'negative' | 'correction' | 'suggestion';
  content: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * Interface for canvas suggestions
 */
export interface CanvasSuggestion {
  type: 'organization' | 'connection' | 'enhancement' | 'theme';
  title: string;
  description: string;
  elements: string[];
  confidence: number;
  timestamp: number;
}

/**
 * Interface for user behavior analysis
 */
export interface UserBehaviorAnalysis {
  patterns: string[];
  suggestions: string[];
  recommendations: string[];
  optimizations: string[];
}

/**
 * Interface for action execution results
 */
export interface ActionExecutionResult {
  success: boolean;
  message: string;
  data: any;
}

// Export the singleton instance
export const aiResearchAgent = AIResearchAgent.getInstance();