/**
 * Context-Aware Agent
 * 
 * This module analyzes conversation context to enhance decision-making
 * and provide intelligent suggestions throughout the application.
 */

import { ChatMessage } from './types';
import { ActionType, DetectedContext } from './types';

// Enum for different types of conversational contexts
export enum ContextType {
  RESEARCH = 'research',
  PROJECT_MANAGEMENT = 'project_management',
  KNOWLEDGE_GRAPH = 'knowledge_graph',
  MIND_MAP = 'mind_map',
  CODE_ANALYSIS = 'code_analysis',
  DATA_VISUALIZATION = 'data_visualization',
  GENERAL = 'general'
}

// Command categories for parsing user intent
export enum CommandCategory {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SEARCH = 'search',
  ANALYZE = 'analyze',
  ORGANIZE = 'organize',
  SHARE = 'share',
  VISUALIZE = 'visualize'
}

// Structure for commands detected in user messages
export interface DetectedCommand {
  category: CommandCategory;
  intent: string;
  confidence: number;
  parameters?: Record<string, any>;
  suggestedAction?: string;
}

// Structure for entities detected in user messages
export interface DetectedEntity {
  type: string;
  value: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// Full context information extracted from conversation
export interface ConversationContext {
  primaryType: ContextType;
  secondaryTypes: ContextType[];
  tokens: {
    contextIndicators: string[];
    entityIndicators: string[];
    commandIndicators: string[];
  };
  entities: DetectedEntity[];
  suggestedCommands: DetectedCommand[];
  confidence: number;
  recentMessages: number;
  overallTopic?: string;
  recentFocus?: string;
  userIntent?: string;
  timestamp: number;
}

/**
 * Simple rule-based context analysis function
 * Used when AI processing is unavailable or not needed
 */
function simpleContextAnalysis(messages: ChatMessage[]): ConversationContext {
  const keywordMap: Record<ContextType, string[]> = {
    [ContextType.RESEARCH]: ['research', 'study', 'papers', 'article', 'literature', 'references', 'sources', 'findings', 'evidence'],
    [ContextType.PROJECT_MANAGEMENT]: ['project', 'task', 'milestone', 'deadline', 'progress', 'status', 'assign', 'schedule', 'priority'],
    [ContextType.KNOWLEDGE_GRAPH]: ['graph', 'node', 'connection', 'relationship', 'entity', 'network', 'link', 'concept'],
    [ContextType.MIND_MAP]: ['mind map', 'brainstorm', 'idea', 'thought', 'branch', 'connect', 'topic', 'subtopic'],
    [ContextType.CODE_ANALYSIS]: ['code', 'function', 'method', 'variable', 'class', 'object', 'algorithm', 'syntax'],
    [ContextType.DATA_VISUALIZATION]: ['chart', 'graph', 'visualization', 'plot', 'dashboard', 'data', 'metrics', 'statistics'],
    [ContextType.GENERAL]: ['help', 'question', 'explain', 'summary', 'overview', 'general', 'info']
  };

  const commandKeywords: Record<CommandCategory, string[]> = {
    [CommandCategory.CREATE]: ['create', 'new', 'make', 'start', 'generate', 'build'],
    [CommandCategory.UPDATE]: ['update', 'change', 'modify', 'edit', 'revise', 'adjust'],
    [CommandCategory.DELETE]: ['delete', 'remove', 'erase', 'clear', 'drop'],
    [CommandCategory.SEARCH]: ['search', 'find', 'look for', 'query', 'locate'],
    [CommandCategory.ANALYZE]: ['analyze', 'examine', 'review', 'evaluate', 'assess'],
    [CommandCategory.ORGANIZE]: ['organize', 'arrange', 'group', 'categorize', 'classify'],
    [CommandCategory.SHARE]: ['share', 'export', 'publish', 'send', 'distribute'],
    [CommandCategory.VISUALIZE]: ['visualize', 'show', 'display', 'render', 'draw']
  };

  // Extract the last 5 messages or fewer
  const recentMessages = messages.slice(-5).map(msg => msg.content.toLowerCase());
  const combinedText = recentMessages.join(' ');
  
  // Count keyword occurrences
  const contextScores: Record<ContextType, number> = {
    [ContextType.RESEARCH]: 0,
    [ContextType.PROJECT_MANAGEMENT]: 0,
    [ContextType.KNOWLEDGE_GRAPH]: 0,
    [ContextType.MIND_MAP]: 0,
    [ContextType.CODE_ANALYSIS]: 0,
    [ContextType.DATA_VISUALIZATION]: 0,
    [ContextType.GENERAL]: 0
  };
  
  // Score each context type based on keyword matches
  Object.entries(keywordMap).forEach(([context, keywords]) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        contextScores[context as ContextType] += matches.length;
      }
    });
  });
  
  // Determine primary and secondary context types
  const sortedContexts = Object.entries(contextScores)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0] as ContextType);
  
  const primaryType = sortedContexts[0] || ContextType.GENERAL;
  const secondaryTypes = sortedContexts.slice(1, 3);
  
  // Find matching context indicator tokens
  const contextIndicators: string[] = [];
  Object.entries(keywordMap).forEach(([context, keywords]) => {
    keywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        contextIndicators.push(keyword);
      }
    });
  });
  
  // Detect command indicators
  const commandIndicators: string[] = [];
  Object.entries(commandKeywords).forEach(([command, keywords]) => {
    keywords.forEach(keyword => {
      if (combinedText.includes(keyword)) {
        commandIndicators.push(keyword);
      }
    });
  });
  
  // Extract simple entities using regex patterns
  const entities: DetectedEntity[] = [];
  
  // Look for project names (quoted text or specific patterns)
  const projectRegex = /"([^"]+)"\s*project|project\s*"([^"]+)"|project\s+named\s+([a-zA-Z0-9_\s]+)/gi;
  let projectMatch;
  const addedProjects = new Set();
  
  // Use RegExp.exec in a loop to find all matches
  while ((projectMatch = projectRegex.exec(combinedText)) !== null) {
    const projectName = projectMatch[1] || projectMatch[2] || projectMatch[3];
    if (projectName && !addedProjects.has(projectName)) {
      addedProjects.add(projectName);
      entities.push({
        type: 'project',
        value: projectName.trim(),
        confidence: 0.8
      });
    }
  }
  
  // Look for dates
  const dateRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?( \d{4})?|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\b\d{4}-\d{2}-\d{2}\b/gi;
  let dateMatch;
  
  while ((dateMatch = dateRegex.exec(combinedText)) !== null) {
    entities.push({
      type: 'date',
      value: dateMatch[0].trim(),
      confidence: 0.7
    });
  }
  
  // Look for URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  let urlMatch;
  
  while ((urlMatch = urlRegex.exec(combinedText)) !== null) {
    entities.push({
      type: 'url',
      value: urlMatch[0].trim(),
      confidence: 0.9
    });
  }
  
  // Detect suggested commands based on context and keywords
  const suggestedCommands: DetectedCommand[] = [];
  
  // Suggest commands based on detected context
  if (contextScores[ContextType.RESEARCH] > 1) {
    if (combinedText.includes('summarize') || combinedText.includes('summary')) {
      suggestedCommands.push({
        category: CommandCategory.ANALYZE,
        intent: 'summarize_research',
        confidence: 0.8,
        suggestedAction: 'Create a summary of the research findings'
      });
    }
    
    if (combinedText.includes('visual') || combinedText.includes('graph') || combinedText.includes('map')) {
      suggestedCommands.push({
        category: CommandCategory.VISUALIZE,
        intent: 'create_knowledge_graph',
        confidence: 0.7,
        suggestedAction: 'Create a knowledge graph from this research'
      });
    }
  }
  
  if (contextScores[ContextType.PROJECT_MANAGEMENT] > 1) {
    if (combinedText.includes('create') || combinedText.includes('new') || combinedText.includes('start')) {
      suggestedCommands.push({
        category: CommandCategory.CREATE,
        intent: 'create_project',
        confidence: 0.8,
        suggestedAction: 'Create a new project'
      });
    }
    
    if (combinedText.includes('update') || combinedText.includes('progress') || combinedText.includes('status')) {
      suggestedCommands.push({
        category: CommandCategory.UPDATE,
        intent: 'update_project_status',
        confidence: 0.75,
        suggestedAction: 'Update project status'
      });
    }
  }
  
  // Assemble the context object
  const context: ConversationContext = {
    primaryType,
    secondaryTypes,
    tokens: {
      contextIndicators: contextIndicators.slice(0, 10), // Limit to top 10
      entityIndicators: [], // Simple analysis doesn't do complex entity extraction
      commandIndicators: commandIndicators.slice(0, 5) // Limit to top 5
    },
    entities,
    suggestedCommands,
    confidence: contextScores[primaryType] > 3 ? 0.8 : 0.6, // Higher confidence with more keyword matches
    recentMessages: recentMessages.length,
    overallTopic: primaryType !== ContextType.GENERAL ? 
      keywordMap[primaryType][0].charAt(0).toUpperCase() + keywordMap[primaryType][0].slice(1) : 
      'General conversation',
    timestamp: Date.now()
  };
  
  return context;
}

/**
 * Analyze conversation context using AI
 * @param messages The conversation messages to analyze
 * @param useAI Whether to use AI for analysis (defaults to true)
 * @returns The extracted context information
 */
export async function analyzeConversationContext(
  messages: ChatMessage[],
  useAI: boolean = true
): Promise<ConversationContext> {
  // If AI analysis is disabled or there are too few messages, use simple analysis
  if (!useAI || messages.length < 2) {
    return simpleContextAnalysis(messages);
  }

  try {
    // Use dynamic import to avoid circular dependencies
    const { processUserMessage } = await import('./model-router');
    
    // Prepare the system prompt for context analysis
    const systemPrompt = `
      You are an expert context analyzer. Analyze the following conversation and extract:
      1. The primary conversation context type (research, project_management, knowledge_graph, mind_map, code_analysis, data_visualization, or general)
      2. Secondary context types
      3. Important entities mentioned (with type, value, and confidence)
      4. Detected command intentions
      5. Relevant context indicator tokens
      
      Return your analysis as structured JSON with these fields.
    `;
    
    // Prepare a summary of the conversation for analysis
    const conversationSummary = messages
      .slice(-5) // Take the most recent 5 messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    // Process with the AI model
    const aiResponse = await processUserMessage(
      `Analyze this conversation context:\n${conversationSummary}`,
      [],
      {
        systemPrompt,
        temperature: 0.2, // Low temperature for more consistent output
        useRag: false // No need for RAG for this task
      }
    );
    
    // Parse the JSON response
    let parsedContext: any;
    try {
      // The AI response might be wrapped in markdown code blocks - extract just the JSON
      const jsonMatch = aiResponse.message.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                        aiResponse.message.match(/{[\s\S]*}/);
      
      const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse.message;
      parsedContext = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Error parsing AI context analysis:", parseError);
      // Fall back to simple analysis on parsing failure
      return simpleContextAnalysis(messages);
    }
    
    // Map the AI output to our ConversationContext structure
    return {
      primaryType: parsedContext.primaryType || ContextType.GENERAL,
      secondaryTypes: parsedContext.secondaryTypes || [],
      tokens: {
        contextIndicators: parsedContext.contextIndicators || [],
        entityIndicators: parsedContext.entityIndicators || [],
        commandIndicators: parsedContext.commandIndicators || []
      },
      entities: parsedContext.entities || [],
      suggestedCommands: parsedContext.suggestedCommands || [],
      confidence: parsedContext.confidence || 0.7,
      recentMessages: messages.slice(-5).length,
      overallTopic: parsedContext.overallTopic || undefined,
      recentFocus: parsedContext.recentFocus || undefined,
      userIntent: parsedContext.userIntent || undefined,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("Error in AI context analysis:", error);
    // Fall back to simple analysis on any error
    return simpleContextAnalysis(messages);
  }
}

/**
 * Analyze conversation for potential system commands
 * @param messages The conversation messages
 * @param context Optional pre-analyzed context
 * @returns Analysis of potential commands
 */
export async function analyzeConversationForSystemCommands(
  messages: ChatMessage[],
  context?: ConversationContext
): Promise<DetectedCommand[]> {
  // Use the provided context or analyze it first
  const conversationContext = context || await analyzeConversationContext(messages);
  
  // Return the suggested commands from the context
  return conversationContext.suggestedCommands;
}

/**
 * Get component-specific context for UI components
 * @param context The conversation context
 * @param componentType The type of component requesting context
 * @returns Context-specific data for the component
 */
export function getComponentContext(
  context: ConversationContext,
  componentType: string
): Record<string, any> {
  // Default context data
  const baseContext = {
    entities: context.entities,
    userIntent: context.userIntent,
    overallTopic: context.overallTopic,
    confidence: context.confidence
  };
  
  // Return component-specific context
  switch (componentType) {
    case 'search-bar':
      return {
        ...baseContext,
        suggestedQueries: context.entities
          .filter(e => e.confidence > 0.7)
          .map(e => e.value),
        queryType: context.primaryType,
        recentFocus: context.recentFocus
      };
      
    case 'suggestion-panel':
      return {
        ...baseContext,
        suggestedCommands: context.suggestedCommands,
        primaryContext: context.primaryType,
        secondaryContexts: context.secondaryTypes
      };
      
    case 'knowledge-graph':
      return {
        ...baseContext,
        keyEntities: context.entities
          .filter(e => e.confidence > 0.6)
          .sort((a, b) => b.confidence - a.confidence),
        contextType: context.primaryType === ContextType.KNOWLEDGE_GRAPH ? 
          'primary' : (context.secondaryTypes.includes(ContextType.KNOWLEDGE_GRAPH) ? 'secondary' : 'unrelated')
      };
      
    case 'mind-map':
      return {
        ...baseContext,
        centralTopic: context.overallTopic,
        relatedTopics: context.entities
          .filter(e => e.type === 'topic' || e.type === 'concept')
          .map(e => e.value),
        contextType: context.primaryType === ContextType.MIND_MAP ? 
          'primary' : (context.secondaryTypes.includes(ContextType.MIND_MAP) ? 'secondary' : 'unrelated')
      };
      
    default:
      return baseContext;
  }
}