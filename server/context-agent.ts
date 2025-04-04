import OpenAI from "openai";
import { ChatMessage } from "./types";
import { NodeType, KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge, GraphInsight } from "./knowledge-graph";
import { apiQuotaManager } from "./api-quota-manager";
import { webSearch } from "./search";
import { extractEntities } from "./knowledge-graph";
import { MindMap, MindMapTopic } from "./mind-map-manager";
import * as fs from 'fs';
import * as path from 'path';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Context types that the agent can identify and handle
 */
export type ContextType = 
  | 'research_topic'       // General research on a topic
  | 'project_planning'     // Planning a project
  | 'mind_mapping'         // Creating a mind map
  | 'literature_review'    // Reviewing literature or publications
  | 'knowledge_synthesis'  // Synthesizing knowledge from multiple sources
  | 'concept_exploration'  // Exploring a specific concept in depth
  | 'data_analysis'        // Analyzing data or statistics
  | 'problem_solving'      // Solving a specific problem
  | 'brainstorming'        // Brainstorming ideas
  | 'question_answering';  // Simple question answering

/**
 * Action types that the agent can recommend
 */
export type ActionType =
  | 'create_knowledge_graph'    // Create a knowledge graph from current context
  | 'update_knowledge_graph'    // Update an existing knowledge graph
  | 'expand_node'               // Expand a specific node in the graph
  | 'create_project'            // Create a new project
  | 'add_research_insight'      // Add a research insight to a project
  | 'create_mind_map'           // Create a mind map
  | 'search_related_topics'     // Search for related topics
  | 'summarize_conversation'    // Summarize the current conversation
  | 'suggest_next_steps'        // Suggest next research steps
  | 'export_findings'           // Export findings in a structured format
  | 'analyze_workbench'         // Analyze the current workbench state
  | 'manage_project_files'      // Manage and organize project files
  | 'generate_task_list'        // Generate a task list based on conversation
  | 'execute_system_command';   // Execute a system command from natural language

/**
 * Interface representing a detected context
 */
export interface DetectedContext {
  type: ContextType;
  confidence: number; // 0.0 to 1.0
  topic: string;
  keywords: string[];
  entities: Array<{ entity: string; type: NodeType; importance: number }>;
  action: ActionType;
  actionParams?: Record<string, any>;
}

/**
 * Interface for a research component that can be created
 */
export interface ResearchComponent {
  type: 'knowledge_graph' | 'mind_map' | 'project' | 'document' | 'summary';
  title: string;
  description: string;
  suggestedContent?: any;
}

/**
 * Function to analyze conversation and extract contextual understanding
 */
export async function analyzeConversationContext(
  messages: ChatMessage[],
  currentGraph?: KnowledgeGraph
): Promise<DetectedContext> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 1000);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified context analysis");
      return simplifiedContextAnalysis(messages);
    }

    // Extract the conversation content
    const conversationContent = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');
    
    // Build a comprehensive prompt
    const prompt = `You are an expert research assistant AI tasked with analyzing the conversation context to identify the user's research intentions and suggest appropriate actions.

CONVERSATION HISTORY:
${conversationContent}

CURRENT KNOWLEDGE GRAPH STATUS:
${currentGraph ? `The knowledge graph has ${currentGraph.nodes.length} nodes and ${currentGraph.edges.length} edges.` : 'No knowledge graph created yet.'}
${currentGraph && currentGraph.nodes.length > 0 ? `Main topics in the graph: ${currentGraph.nodes.slice(0, 5).map(n => n.label).join(', ')}` : ''}

Based on this conversation, identify:
1. The primary research context type
2. The main topic being discussed
3. Key keywords that should be tracked
4. Important entities (people, organizations, concepts, locations, etc.)
5. The most appropriate next action to take

Respond with a JSON object following this structure:
{
  "type": "One of: research_topic, project_planning, mind_mapping, literature_review, knowledge_synthesis, concept_exploration, data_analysis, problem_solving, brainstorming, question_answering",
  "confidence": "A number between 0 and 1 indicating confidence in this assessment",
  "topic": "The main topic or focus of the conversation",
  "keywords": ["list", "of", "important", "keywords"],
  "entities": [
    {"entity": "entity name", "type": "person|organization|location|concept|time|statistic", "importance": 0.1-1.0}
  ],
  "action": "One of: create_knowledge_graph, update_knowledge_graph, expand_node, create_project, add_research_insight, create_mind_map, search_related_topics, summarize_conversation, suggest_next_steps, export_findings",
  "actionParams": {
    // Parameters relevant to the action, such as:
    "nodeId": "If expand_node action, the ID of the node to expand",
    "query": "If search action, the query to search for",
    "projectId": "If project-related action, the project ID"
  }
}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using the most advanced model for best context understanding
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more precise analysis
    });

    // Parse and validate the response
    const content = response.choices[0].message.content || '';
    const parsedResponse = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Validate the response format
    return validateContextResponse(parsedResponse);
  } catch (error) {
    console.error("Error analyzing conversation context:", error);
    // Fall back to simplified analysis
    return simplifiedContextAnalysis(messages);
  }
}

/**
 * Simpler version of context analysis that doesn't use AI
 * Used as a fallback when API calls fail or rate limits are reached
 */
function simplifiedContextAnalysis(messages: ChatMessage[]): DetectedContext {
  // Extract the last few user messages
  const userMessages = messages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content)
    .join(' ');

  // Simple keyword extraction
  const keywords = extractKeywords(userMessages);

  // Simple entity detection - just use the keywords as entities of type 'concept'
  const entities = keywords.map(keyword => ({
    entity: keyword,
    type: 'concept' as NodeType,
    importance: 0.7
  }));

  // Determine topic (just use the most recent message)
  const latestMessage = messages.filter(m => m.role === 'user').pop();
  const topic = latestMessage?.content || 'General research';

  // Default to knowledge graph creation
  return {
    type: 'research_topic',
    confidence: 0.6,
    topic: topic.substring(0, 50), // Truncate to reasonable length
    keywords,
    entities,
    action: 'create_knowledge_graph'
  };
}

/**
 * Extract keywords from text using simple frequency analysis
 */
function extractKeywords(text: string): string[] {
  // Remove punctuation and convert to lowercase
  const cleanedText = text.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanedText.split(/\s+/);
  
  // Filter out common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'am', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 
    'about', 'against', 'between', 'into', 'through', 'during', 'before', 
    'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 
    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 
    'don', 'should', 'now', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 
    'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 
    'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 
    'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 
    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'would', 'could'
  ]);
  
  const filteredWords = words.filter(word => 
    word.length > 2 && !stopWords.has(word)
  );
  
  // Count frequency
  const frequency: Record<string, number> = {};
  for (const word of filteredWords) {
    frequency[word] = (frequency[word] || 0) + 1;
  }
  
  // Sort by frequency
  const sortedWords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sortedWords;
}

/**
 * Validate context response to ensure it has all required fields
 */
function validateContextResponse(response: any): DetectedContext {
  // Valid context types
  const validContextTypes: ContextType[] = [
    'research_topic', 'project_planning', 'mind_mapping', 
    'literature_review', 'knowledge_synthesis', 'concept_exploration', 
    'data_analysis', 'problem_solving', 'brainstorming', 'question_answering'
  ];

  // Valid action types
  const validActionTypes: ActionType[] = [
    'create_knowledge_graph', 'update_knowledge_graph', 'expand_node', 
    'create_project', 'add_research_insight', 'create_mind_map', 
    'search_related_topics', 'summarize_conversation', 
    'suggest_next_steps', 'export_findings', 'analyze_workbench',
    'manage_project_files', 'generate_task_list', 'execute_system_command'
  ];

  // Default to research_topic if invalid type
  const contextType = validContextTypes.includes(response.type as ContextType) 
    ? response.type as ContextType 
    : 'research_topic';

  // Default to create_knowledge_graph if invalid action
  const actionType = validActionTypes.includes(response.action as ActionType)
    ? response.action as ActionType
    : 'create_knowledge_graph';

  // Ensure confidence is a valid number between 0 and 1
  const confidence = typeof response.confidence === 'number' 
    ? Math.max(0, Math.min(1, response.confidence))
    : 0.7;

  // Ensure keywords is an array
  const keywords = Array.isArray(response.keywords) 
    ? response.keywords.slice(0, 10) // Limit to 10 keywords
    : [];

  // Ensure entities is an array with valid types
  const validEntityTypes: NodeType[] = [
    'person', 'organization', 'location', 'concept', 'time', 'statistic'
  ];
  
  const entities = Array.isArray(response.entities)
    ? response.entities
        .filter(e => e.entity && typeof e.entity === 'string')
        .map(e => ({
          entity: e.entity,
          type: validEntityTypes.includes(e.type as NodeType) ? e.type as NodeType : 'concept',
          importance: typeof e.importance === 'number' ? Math.max(0, Math.min(1, e.importance)) : 0.7
        }))
    : [];

  return {
    type: contextType,
    confidence,
    topic: response.topic || 'General research',
    keywords,
    entities,
    action: actionType,
    actionParams: response.actionParams || {}
  };
}

/**
 * Generate suggested research components based on the detected context
 */
export async function suggestResearchComponents(
  context: DetectedContext,
  currentGraph?: KnowledgeGraph
): Promise<ResearchComponent[]> {
  const suggestions: ResearchComponent[] = [];
  
  // Always suggest a knowledge graph if none exists
  if (!currentGraph || currentGraph.nodes.length === 0) {
    suggestions.push({
      type: 'knowledge_graph',
      title: `Knowledge Graph: ${context.topic}`,
      description: `A visual representation of key entities and concepts related to ${context.topic}`
    });
  }

  // Add mind map suggestion for brainstorming or concept exploration
  if (context.type === 'brainstorming' || context.type === 'concept_exploration' || context.type === 'mind_mapping') {
    suggestions.push({
      type: 'mind_map',
      title: `Mind Map: ${context.topic}`,
      description: 'A hierarchical visualization to explore related ideas and concepts',
      suggestedContent: {
        centralTopic: context.topic,
        branches: context.keywords.slice(0, 5).map(keyword => ({
          topic: keyword,
          subtopics: []
        }))
      }
    });
  }

  // Add project suggestion for project planning or research topics
  if (context.type === 'project_planning' || context.type === 'research_topic') {
    suggestions.push({
      type: 'project',
      title: `Research Project: ${context.topic}`,
      description: 'A structured project to organize your research on this topic',
      suggestedContent: {
        title: context.topic,
        description: `Comprehensive research on ${context.topic}`,
        milestones: [
          'Initial research and topic exploration',
          'Data collection and analysis',
          'Synthesis of findings',
          'Conclusion and recommendations'
        ]
      }
    });
  }
  
  // Add summary suggestion for literature review or knowledge synthesis
  if (context.type === 'literature_review' || context.type === 'knowledge_synthesis') {
    suggestions.push({
      type: 'summary',
      title: `Research Summary: ${context.topic}`,
      description: 'A concise summary of the current state of knowledge on this topic',
      suggestedContent: {
        topic: context.topic,
        sections: [
          'Key findings',
          'Main theories',
          'Controversies and debates',
          'Future research directions'
        ]
      }
    });
  }
  
  return suggestions;
}

/**
 * Generate a prompt to create a mind map based on the detected context
 */
export async function generateMindMapContent(
  context: DetectedContext
): Promise<any> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 600);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified mind map generation");
      return generateSimpleMindMap(context);
    }

    // Build the prompt
    const prompt = `Generate a comprehensive mind map structure for the topic "${context.topic}". 
The mind map should include 5-7 main branches, each with 3-5 sub-branches.

KEY ENTITIES TO INCLUDE:
${context.entities.map(e => `- ${e.entity} (${e.type})`).join('\n')}

KEY KEYWORDS:
${context.keywords.join(', ')}

Format your response as a JSON object with this structure:
{
  "centralTopic": "The main topic",
  "branches": [
    {
      "topic": "Main branch name",
      "subtopics": [
        {
          "topic": "Subtopic name",
          "subtopics": [] // Optional further nesting
        }
      ]
    }
  ]
}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7, // Higher temperature for more creative mind maps
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const mindMap = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    return mindMap;
  } catch (error) {
    console.error("Error generating mind map:", error);
    return generateSimpleMindMap(context);
  }
}

/**
 * Generate a simple mind map without using AI
 */
function generateSimpleMindMap(context: DetectedContext): any {
  // Create main branches from the keywords
  const branches = context.keywords.slice(0, 6).map(keyword => ({
    topic: keyword,
    subtopics: []
  }));

  // If we have entities, add them as subtopics to relevant branches
  if (context.entities.length > 0) {
    // Distribute entities among the branches
    context.entities.forEach((entity, index) => {
      const branchIndex = index % branches.length;
      if (branches[branchIndex]) {
        branches[branchIndex].subtopics.push({
          topic: entity.entity,
          subtopics: []
        });
      }
    });
  }

  return {
    centralTopic: context.topic,
    branches
  };
}

/**
 * Generate insights based on the current conversation and knowledge graph
 */
export async function generateResearchInsights(
  context: DetectedContext,
  graph?: KnowledgeGraph
): Promise<Array<{title: string, content: string, confidence: number, tags: string[]}>> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 800);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified insight generation");
      return generateSimpleInsights(context, graph);
    }

    // Build a prompt based on the context and graph
    let graphDescription = "No knowledge graph available.";
    if (graph && graph.nodes.length > 0) {
      const mainNodes = graph.nodes.slice(0, 10).map(node => 
        `- ${node.label} (${node.type})${node.description ? ': ' + node.description : ''}`
      ).join('\n');
      
      graphDescription = `Knowledge graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges.\n\nKey nodes:\n${mainNodes}`;
    }

    const prompt = `Generate 3-5 meaningful research insights about "${context.topic}" based on the available information.

CONTEXT TYPE: ${context.type}
KEY KEYWORDS: ${context.keywords.join(', ')}
KEY ENTITIES: ${context.entities.map(e => e.entity).join(', ')}

KNOWLEDGE GRAPH INFORMATION:
${graphDescription}

For each insight:
1. Provide a clear, concise title
2. Write 2-3 sentences of detailed explanation
3. Assign a confidence score (0.0-1.0) based on how well-supported the insight is
4. Suggest 2-4 relevant tags for categorization

Format your response as a JSON array with this structure:
[
  {
    "title": "Insight title",
    "content": "Detailed explanation of the insight",
    "confidence": 0.8, // between 0 and 1
    "tags": ["tag1", "tag2", "tag3"]
  }
]`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const insights = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Validate and return insights
    return Array.isArray(insights) ? insights.map(validateInsight) : [];
  } catch (error) {
    console.error("Error generating research insights:", error);
    return generateSimpleInsights(context, graph);
  }
}

/**
 * Validate a single insight object
 */
function validateInsight(insight: any): {title: string, content: string, confidence: number, tags: string[]} {
  return {
    title: insight.title || 'Research Insight',
    content: insight.content || 'No content provided',
    confidence: typeof insight.confidence === 'number' ? 
      Math.max(0, Math.min(1, insight.confidence)) : 0.7,
    tags: Array.isArray(insight.tags) ? insight.tags : []
  };
}

/**
 * Generate simple insights without using AI
 */
function generateSimpleInsights(
  context: DetectedContext,
  graph?: KnowledgeGraph
): Array<{title: string, content: string, confidence: number, tags: string[]}> {
  const insights = [];
  
  // Create an insight based on the context type
  insights.push({
    title: `${context.topic} - Key Areas of Focus`,
    content: `Research on ${context.topic} should focus on these key aspects: ${context.keywords.slice(0, 3).join(', ')}. Further exploration of these areas will yield valuable insights.`,
    confidence: 0.7,
    tags: context.keywords.slice(0, 3)
  });
  
  // If we have entities, create an insight about important entities
  if (context.entities.length > 0) {
    const topEntities = context.entities
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3);
    
    insights.push({
      title: `Key Entities in ${context.topic}`,
      content: `The most significant entities in this research area are: ${topEntities.map(e => e.entity).join(', ')}. Understanding these entities and their relationships is crucial for comprehensive analysis.`,
      confidence: 0.6,
      tags: ['entities', ...topEntities.map(e => e.entity)]
    });
  }
  
  // If we have a knowledge graph, create an insight about connections
  if (graph && graph.nodes.length > 3) {
    insights.push({
      title: 'Pattern Recognition in Research Data',
      content: `The knowledge graph reveals patterns and connections between key concepts. There are ${graph.edges.length} identified relationships that should be further explored to deepen understanding.`,
      confidence: 0.5,
      tags: ['connections', 'patterns', 'knowledge graph']
    });
  }
  
  return insights;
}

/**
 * Parse natural language commands to control the system
 */
export async function parseNaturalLanguageCommand(
  command: string,
  context: DetectedContext
): Promise<{
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
}> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 400);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified command parsing");
      return parseSimpleCommand(command);
    }

    // Build a prompt to interpret the command
    const prompt = `You are an AI research assistant that interprets natural language commands to control a research system.

The user's current research context is: ${context.type} focused on "${context.topic}"

Interpret this command: "${command}"

Parse it into a structured format that identifies:
1. The main action being requested
2. The target of that action (e.g., a specific node, the entire graph, a project)
3. Any additional parameters or specifications
4. How confident you are in this interpretation (0.0-1.0)

Format your response as a JSON object with this structure:
{
  "action": "One of: create, update, expand, search, summarize, export, visualize, connect, delete, or other appropriate verb",
  "target": "The object of the action, e.g., 'knowledge graph', 'node about AI', 'project', etc.",
  "parameters": {
    // Any additional parameters detected in the command
    // For example:
    // "depth": 2,
    // "focus": "machine learning",
    // "format": "PDF"
  },
  "confidence": 0.8 // Between 0 and 1
}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more precise parsing
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const parsedCommand = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Validate and return the parsed command
    return {
      action: parsedCommand.action || 'create',
      target: parsedCommand.target || 'knowledge graph',
      parameters: parsedCommand.parameters || {},
      confidence: typeof parsedCommand.confidence === 'number' ? 
        Math.max(0, Math.min(1, parsedCommand.confidence)) : 0.7
    };
  } catch (error) {
    console.error("Error parsing natural language command:", error);
    return parseSimpleCommand(command);
  }
}

/**
 * Advanced contextual understanding and system control functions
 */

/**
 * Interface for system command execution results
 */
export interface SystemCommandResult {
  success: boolean;
  output: string;
  command: string;
  commandType: 'file_management' | 'project_creation' | 'knowledge_graph' | 'mind_map' | 'workbench' | 'other';
}

/**
 * Interface for workbench analysis result
 */
export interface WorkbenchAnalysisResult {
  activeProjects: number;
  fileCount: number;
  knowledgeGraphs: number;
  mindMaps: number;
  recentActivities: string[];
  suggestedActions: string[];
  focusAreas: string[];
}

/**
 * Analyze conversation for natural language commands to control the system
 * This provides a higher level of abstraction than parseNaturalLanguageCommand
 * by interpreting user intent to control system components
 */
export async function analyzeConversationForSystemCommands(
  messages: ChatMessage[],
  context?: DetectedContext
): Promise<{
  hasSystemCommand: boolean;
  command?: string;
  action?: string;
  target?: string;
  parameters?: Record<string, any>;
  confidence: number;
}> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 500);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified command detection");
      return { hasSystemCommand: false, confidence: 0 };
    }

    // Extract the last 3 user messages for context
    const recentMessages = messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content)
      .join('\n');
    
    if (!recentMessages) {
      return { hasSystemCommand: false, confidence: 0 };
    }

    // Build a prompt to detect system commands
    const prompt = `Analyze this conversation excerpt to determine if the user is requesting a system action or command:

USER MESSAGES:
${recentMessages}

Determine if the user is asking the system to perform any of these actions:
1. Create or modify a knowledge graph
2. Create or modify a mind map
3. Create or manage a project
4. Organize or manage files
5. Analyze the current workspace/workbench
6. Execute a specific task or operation
7. Generate content based on the conversation

If a system command is detected, extract:
- The primary action requested
- The target of the action
- Any parameters or specifications
- Your confidence level in this interpretation (0.0-1.0)

Respond with a JSON object with this structure:
{
  "hasSystemCommand": true/false,
  "command": "The natural language command (if detected)",
  "action": "create/update/analyze/organize/etc",
  "target": "knowledge_graph/mind_map/project/files/workbench/etc",
  "parameters": {
    // Any detected parameters for the command
  },
  "confidence": 0.8 // Between 0 and 1
}

If no system command is detected, just return { "hasSystemCommand": false, "confidence": 0 }`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2, // Lower temperature for more precise detection
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const result = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Validate the result
    return {
      hasSystemCommand: !!result.hasSystemCommand,
      command: result.command,
      action: result.action,
      target: result.target,
      parameters: result.parameters || {},
      confidence: typeof result.confidence === 'number' ? 
        Math.max(0, Math.min(1, result.confidence)) : 0
    };
  } catch (error) {
    console.error("Error analyzing for system commands:", error);
    return { hasSystemCommand: false, confidence: 0 };
  }
}

/**
 * Analyze the current workbench state to provide context-aware suggestions
 */
export async function analyzeWorkbenchState(
  projects: any[] = [],
  knowledgeGraphs: KnowledgeGraph[] = [], 
  mindMaps: MindMap[] = [],
  files: any[] = [],
  context?: DetectedContext
): Promise<WorkbenchAnalysisResult> {
  try {
    // Check API quota
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 600);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified workbench analysis");
      return generateSimpleWorkbenchAnalysis(projects, knowledgeGraphs, mindMaps, files);
    }

    // Prepare workbench data summary
    const projectsSummary = projects.map(p => `- ${p.title || p.name}: ${p.status || 'Status unknown'}`).join('\n');
    const graphsSummary = knowledgeGraphs.map(g => 
      `- Graph with ${g.nodes.length} nodes and ${g.edges.length} edges. Main topics: ${g.nodes.slice(0, 3).map(n => n.label).join(', ')}`
    ).join('\n');
    const mapsSummary = mindMaps.map(m => `- ${m.title || 'Untitled'}: centered on "${m.centralTopic.text}"`).join('\n');
    const filesSummary = `${files.length} files in the workspace`;

    // Current research context
    const contextSummary = context ? 
      `User is focused on ${context.type} about "${context.topic}" with confidence ${context.confidence}` : 
      'No specific research context detected';

    // Build a comprehensive prompt
    const prompt = `Analyze this workbench state and provide insights and suggestions:

CURRENT RESEARCH CONTEXT:
${contextSummary}

PROJECTS (${projects.length}):
${projectsSummary || 'No projects found'}

KNOWLEDGE GRAPHS (${knowledgeGraphs.length}):
${graphsSummary || 'No knowledge graphs found'}

MIND MAPS (${mindMaps.length}):
${mapsSummary || 'No mind maps found'}

FILES:
${filesSummary}

Based on this workbench state, provide:
1. A count of active projects, files, knowledge graphs, and mind maps
2. A list of recent activities (inferred from the state)
3. A list of suggested actions the user might want to take next
4. Key focus areas that should receive attention

Format your response as a JSON object:
{
  "activeProjects": 3,
  "fileCount": 12,
  "knowledgeGraphs": 2,
  "mindMaps": 1,
  "recentActivities": ["List of inferred recent activities"],
  "suggestedActions": ["List of suggested next actions"],
  "focusAreas": ["List of areas that need attention"]
}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const result = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Return the analysis with validation
    return {
      activeProjects: result.activeProjects || projects.length,
      fileCount: result.fileCount || files.length,
      knowledgeGraphs: result.knowledgeGraphs || knowledgeGraphs.length,
      mindMaps: result.mindMaps || mindMaps.length,
      recentActivities: Array.isArray(result.recentActivities) ? result.recentActivities : [],
      suggestedActions: Array.isArray(result.suggestedActions) ? result.suggestedActions : [],
      focusAreas: Array.isArray(result.focusAreas) ? result.focusAreas : []
    };
  } catch (error) {
    console.error("Error analyzing workbench state:", error);
    return generateSimpleWorkbenchAnalysis(projects, knowledgeGraphs, mindMaps, files);
  }
}

/**
 * Generate a simple workbench analysis without using AI
 */
function generateSimpleWorkbenchAnalysis(
  projects: any[] = [],
  knowledgeGraphs: KnowledgeGraph[] = [], 
  mindMaps: MindMap[] = [],
  files: any[] = []
): WorkbenchAnalysisResult {
  const recentActivities = [];
  
  if (projects.length > 0) {
    recentActivities.push('Working on research projects');
  }
  
  if (knowledgeGraphs.length > 0) {
    recentActivities.push('Exploring knowledge graphs');
  }
  
  if (mindMaps.length > 0) {
    recentActivities.push('Creating mind maps');
  }
  
  if (files.length > 0) {
    recentActivities.push('Managing research files');
  }
  
  // Generate basic suggested actions
  const suggestedActions = [
    'Create a new research project',
    'Build a knowledge graph from conversation',
    'Explore concepts with a mind map',
    'Organize your research materials'
  ];
  
  // Generate basic focus areas
  const focusAreas = [
    'Research organization',
    'Knowledge synthesis',
    'Concept exploration'
  ];
  
  return {
    activeProjects: projects.length,
    fileCount: files.length,
    knowledgeGraphs: knowledgeGraphs.length,
    mindMaps: mindMaps.length,
    recentActivities,
    suggestedActions,
    focusAreas
  };
}

/**
 * Execute a system command based on natural language instruction
 */
export async function executeSystemCommand(
  command: string,
  context: DetectedContext
): Promise<SystemCommandResult> {
  try {
    // First parse the command to understand what the user wants
    const parsedCommand = await parseNaturalLanguageCommand(command, context);
    
    // Default result with failure status
    const defaultResult: SystemCommandResult = {
      success: false,
      output: "Could not execute command",
      command,
      commandType: 'other'
    };
    
    // Determine the command type
    let commandType: 'file_management' | 'project_creation' | 'knowledge_graph' | 'mind_map' | 'workbench' | 'other' = 'other';
    
    // Check for file management commands
    if (parsedCommand.action.includes('file') || 
        parsedCommand.action.includes('save') || 
        parsedCommand.action.includes('load') ||
        parsedCommand.action.includes('export')) {
      commandType = 'file_management';
      
      // Placeholder for file management logic
      // In a real implementation, this would interact with a file system API
      return {
        success: true,
        output: `File operation processed: ${parsedCommand.action} on ${parsedCommand.target}`,
        command,
        commandType
      };
    }
    
    // Check for knowledge graph commands
    if (parsedCommand.target.includes('knowledge') || 
        parsedCommand.target.includes('graph') || 
        parsedCommand.action.includes('expand')) {
      commandType = 'knowledge_graph';
      
      // Placeholder for knowledge graph operations
      return {
        success: true,
        output: `Knowledge graph operation: ${parsedCommand.action}`,
        command,
        commandType
      };
    }
    
    // Check for mind map commands
    if (parsedCommand.target.includes('mind') || parsedCommand.target.includes('map')) {
      commandType = 'mind_map';
      
      // Placeholder for mind map operations
      return {
        success: true,
        output: `Mind map operation: ${parsedCommand.action}`,
        command,
        commandType
      };
    }
    
    // Check for project creation commands
    if (parsedCommand.action.includes('create') && parsedCommand.target.includes('project')) {
      commandType = 'project_creation';
      
      // Placeholder for project creation
      return {
        success: true,
        output: `Project creation initiated: ${parsedCommand.parameters.title || 'New Project'}`,
        command,
        commandType
      };
    }
    
    // Check for workbench management commands
    if (parsedCommand.target.includes('workbench') || parsedCommand.action.includes('analyze')) {
      commandType = 'workbench';
      
      // Placeholder for workbench operations
      return {
        success: true,
        output: `Workbench operation: ${parsedCommand.action}`,
        command,
        commandType
      };
    }
    
    // If we couldn't determine the command type
    return defaultResult;
  } catch (error) {
    console.error("Error executing system command:", error);
    return {
      success: false,
      output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      command,
      commandType: 'other'
    };
  }
}

/**
 * Generate a task list based on conversation context
 */
export async function generateTaskListFromContext(
  context: DetectedContext,
  conversation: ChatMessage[]
): Promise<{ title: string, description: string, tasks: { title: string, description: string, priority: 'high' | 'medium' | 'low', estimatedHours?: number }[] }> {
  try {
    // Check API quota before proceeding
    const quotaCheck = apiQuotaManager.checkRateLimit('openai', 700);
    if (quotaCheck.isLimited) {
      console.log("OpenAI API rate limited, using simplified task list generation");
      return generateSimpleTaskList(context);
    }
    
    // Extract the conversation content
    const conversationContent = conversation
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => m.content)
      .join('\n\n');
    
    // Build a prompt to generate tasks
    const prompt = `Based on this conversation about "${context.topic}", create a comprehensive task list for a research or development project.

CONVERSATION EXCERPTS:
${conversationContent}

DETECTED CONTEXT TYPE: ${context.type}
MAIN TOPIC: ${context.topic}
KEY ENTITIES: ${context.entities.map(e => e.entity).join(', ')}

Create a task list that includes:
1. A project title and brief description
2. 5-8 specific tasks that would help accomplish the goals discussed
3. For each task, include a brief description, priority level (high/medium/low), and estimated hours

Format your response as a JSON object:
{
  "title": "Project Title",
  "description": "Brief project description",
  "tasks": [
    {
      "title": "Task Title",
      "description": "Task description",
      "priority": "high|medium|low",
      "estimatedHours": 2
    }
  ]
}`;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7, // Higher temperature for creative task generation
    });

    // Parse the response
    const content = response.choices[0].message.content || '';
    const taskList = JSON.parse(content);
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', response.usage?.total_tokens || 0);

    // Validate the task list
    if (!taskList.tasks || !Array.isArray(taskList.tasks)) {
      return generateSimpleTaskList(context);
    }
    
    return {
      title: taskList.title || `${context.topic} Project`,
      description: taskList.description || `Research project focused on ${context.topic}`,
      tasks: taskList.tasks.map((task: any) => ({
        title: task.title || 'Untitled Task',
        description: task.description || '',
        priority: ['high', 'medium', 'low'].includes(task.priority) ? 
          task.priority as 'high' | 'medium' | 'low' : 'medium',
        estimatedHours: typeof task.estimatedHours === 'number' ? task.estimatedHours : undefined
      }))
    };
  } catch (error) {
    console.error("Error generating task list:", error);
    return generateSimpleTaskList(context);
  }
}

/**
 * Generate a simple task list without using AI
 */
function generateSimpleTaskList(
  context: DetectedContext
): { title: string, description: string, tasks: { title: string, description: string, priority: 'high' | 'medium' | 'low' }[] } {
  const projectTitle = `${context.topic} Research`;
  const projectDescription = `A research project to explore ${context.topic}`;
  
  // Generate default tasks based on research type
  const tasks = [];
  
  // Add initial research task
  tasks.push({
    title: "Initial Research",
    description: `Gather preliminary information about ${context.topic}`,
    priority: 'high' as 'high' | 'medium' | 'low'
  });
  
  // Add tasks based on keywords
  for (let i = 0; i < Math.min(context.keywords.length, 3); i++) {
    const keyword = context.keywords[i];
    tasks.push({
      title: `Explore ${keyword}`,
      description: `Research the concept of ${keyword} in relation to ${context.topic}`,
      priority: 'medium' as 'high' | 'medium' | 'low'
    });
  }
  
  // Add tasks based on entities
  for (let i = 0; i < Math.min(context.entities.length, 2); i++) {
    const entity = context.entities[i];
    tasks.push({
      title: `Analyze ${entity.entity}`,
      description: `Examine the role of ${entity.entity} in the context of ${context.topic}`,
      priority: 'medium' as 'high' | 'medium' | 'low'
    });
  }
  
  // Add synthesis task
  tasks.push({
    title: "Synthesize Findings",
    description: "Combine research results into a cohesive understanding",
    priority: 'high' as 'high' | 'medium' | 'low'
  });
  
  // Add documentation task
  tasks.push({
    title: "Document Results",
    description: "Create comprehensive documentation of research findings",
    priority: 'medium' as 'high' | 'medium' | 'low'
  });
  
  return {
    title: projectTitle,
    description: projectDescription,
    tasks
  };
}

/**
 * Simplified command parsing without AI
 */
function parseSimpleCommand(command: string): {
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
} {
  // Convert to lowercase for easier matching
  const lowerCommand = command.toLowerCase();
  
  // Define simple action keywords
  const actionKeywords = {
    create: ['create', 'make', 'build', 'generate', 'start'],
    update: ['update', 'modify', 'change', 'edit', 'revise'],
    expand: ['expand', 'extend', 'enlarge', 'grow', 'develop'],
    search: ['search', 'find', 'look for', 'query', 'seek'],
    summarize: ['summarize', 'sum up', 'brief', 'synopsis', 'overview'],
    export: ['export', 'download', 'save', 'extract', 'output'],
    visualize: ['visualize', 'show', 'display', 'view', 'see'],
    connect: ['connect', 'link', 'join', 'relate', 'associate'],
    delete: ['delete', 'remove', 'eliminate', 'erase', 'clear']
  };
  
  // Define target keywords
  const targetKeywords = {
    'knowledge graph': ['knowledge graph', 'graph', 'network', 'connections'],
    'mind map': ['mind map', 'mindmap', 'map', 'concept map'],
    'project': ['project', 'research', 'study', 'investigation'],
    'node': ['node', 'entity', 'concept', 'item', 'element'],
    'insight': ['insight', 'finding', 'discovery', 'result']
  };
  
  // Find the first matching action
  let action = 'create'; // default
  for (const [act, keywords] of Object.entries(actionKeywords)) {
    if (keywords.some(keyword => lowerCommand.includes(keyword))) {
      action = act;
      break;
    }
  }
  
  // Find the first matching target
  let target = 'knowledge graph'; // default
  for (const [targ, keywords] of Object.entries(targetKeywords)) {
    if (keywords.some(keyword => lowerCommand.includes(keyword))) {
      target = targ;
      break;
    }
  }
  
  // Very basic parameter extraction
  const parameters: Record<string, any> = {};
  
  // Look for numbers as potential parameters
  const numbers = lowerCommand.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    parameters.value = parseInt(numbers[0], 10);
  }
  
  // Check for formats
  const formats = ['pdf', 'excel', 'csv', 'json', 'text'];
  for (const format of formats) {
    if (lowerCommand.includes(format)) {
      parameters.format = format.toUpperCase();
      break;
    }
  }
  
  return {
    action,
    target,
    parameters,
    confidence: 0.6 // Medium confidence for rule-based parsing
  };
}