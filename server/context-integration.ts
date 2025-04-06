/**
 * Context Integration
 * 
 * This module integrates the enhanced memory manager with the context-aware agent
 * to provide more sophisticated context awareness for the AI system.
 */

import { 
  analyzeContext, 
  detectContext,
  ActionType
} from './context-agent';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { memoryManager, MemoryOptions } from './memory-manager';
import { 
  ChatMessage, 
  ContextAnalysis, 
  DetectedContext,
  Entity,
  ProcessorResponse
} from './types';
import { processMessage } from './model-router';
import { apiQuotaManager, ApiService } from './api-quota-manager';

/**
 * Enhanced context analysis that integrates sophisticated memory mechanisms
 * @param message Current message
 * @param history Conversation history
 * @param sessionId Session identifier
 * @returns Enhanced context analysis
 */
export async function enhancedContextAnalysis(
  message: string,
  history: ChatMessage[] = [],
  sessionId: string = 'anonymous-session'
): Promise<ContextAnalysis> {
  // First, perform standard context analysis
  const basicAnalysis = await analyzeContext(message, history);
  
  // Get enhanced context from memory manager
  const enhancedContext = await enhancedMemoryManager.getEnhancedContext(
    sessionId,
    message,
    { 
      recency: basicAnalysis.historyLength > 5 ? 'all' : 'recent',
      relevance: 'medium',
      memoryTypes: ['episodic', 'semantic', 'emotional']
    }
  );
  
  // If we have enhanced context, improve the analysis with it
  if (enhancedContext && enhancedContext.length > 0) {
    // Use the enhanced context to get better topic and intent detection
    try {
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const enhancedPrompt = `
          Analyze this user message in the context of their previous interactions.
          
          User message: "${message}"
          
          Previous context:
          ${enhancedContext}
          
          Provide an improved analysis with:
          1. The main topics being discussed (max 3, comma-separated)
          2. The user's apparent goal or objective
          3. The user's intent (question, search, creation, gratitude, greeting, positive_feedback, negative_feedback, statement)
          4. Related topics that might be relevant (max 3, comma-separated)
          
          Respond in this exact format:
          Topics: topic1, topic2, topic3
          User Goal: user's goal
          Intent: intent_type
          Related Topics: related1, related2, related3
        `;
        
        const result = await processMessage(enhancedPrompt, [], { 
          systemPrompt: 'You are an expert conversation analyst. Provide accurate and concise analysis.',
          forceAdvanced: false
        });
        
        // Parse the structured response
        const lines = result.message.split('\n');
        for (const line of lines) {
          if (line.startsWith('Topics:')) {
            const topics = line.substring('Topics:'.length)
              .split(',')
              .map(topic => topic.trim())
              .filter(topic => topic.length > 0);
              
            if (topics.length > 0) {
              basicAnalysis.topics = topics;
            }
          } else if (line.startsWith('User Goal:')) {
            const userGoal = line.substring('User Goal:'.length).trim();
            if (userGoal !== 'None' && userGoal !== 'Unknown' && userGoal !== 'N/A') {
              basicAnalysis.userGoal = userGoal;
            }
          } else if (line.startsWith('Intent:')) {
            const intent = line.substring('Intent:'.length).trim();
            if (intent.length > 0) {
              basicAnalysis.intent = intent;
            }
          } else if (line.startsWith('Related Topics:')) {
            const relatedTopics = line.substring('Related Topics:'.length)
              .split(',')
              .map(topic => topic.trim())
              .filter(topic => topic.length > 0);
              
            if (relatedTopics.length > 0) {
              basicAnalysis.relatedTopics = relatedTopics;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in enhanced context analysis:', error);
      // We'll fall back to the basic analysis results
    }
  }
  
  return basicAnalysis;
}

/**
 * Enhanced context detection that integrates sophisticated memory mechanisms
 * @param message Current message
 * @param history Conversation history
 * @param sessionId Session identifier
 * @returns Enhanced detected context
 */
export async function enhancedContextDetection(
  message: string,
  history: ChatMessage[] = [],
  sessionId: string = 'anonymous-session'
): Promise<DetectedContext> {
  // First, perform enhanced context analysis
  const analysis = await enhancedContextAnalysis(message, history, sessionId);
  
  // Then use that for context detection
  // Extract recent messages from history (last 5)
  const recentMessages = history.slice(-5);
  
  // Determine primary topic
  const primaryTopic = analysis.topics[0] || '';
  
  // Determine relevant entities
  const relevantEntities = analysis.entities.filter(entity => 
    ['person', 'organization', 'location', 'product', 'date'].includes(entity.type)
  );
  
  // Create the detected context
  const context: DetectedContext = {
    topic: primaryTopic,
    entities: relevantEntities,
    sentiment: analysis.sentiment,
    intent: analysis.intent,
    userGoal: analysis.userGoal,
    keywords: analysis.keywords,
    recentMessages,
    relatedTopics: analysis.relatedTopics,
    metadata: {
      messageLength: analysis.messageLength,
      historyLength: analysis.historyLength,
      timestamp: new Date().toISOString()
    },
    sessionId: sessionId,
    hasEnhancedMemory: true
  };
  
  return context;
}

/**
 * Process a message with enhanced context awareness
 * @param message Current message
 * @param history Conversation history
 * @param sessionId Session identifier
 * @returns Enhanced processor response
 */
export async function processWithEnhancedContext(
  message: string,
  history: ChatMessage[] = [],
  sessionId: string = 'anonymous-session',
  options: any = {}
): Promise<ProcessorResponse> {
  // First, detect context
  const context = await enhancedContextDetection(message, history, sessionId);
  
  // Get enhanced memory context
  const memoryContext = await enhancedMemoryManager.getEnhancedContext(
    sessionId,
    message
  );
  
  // Create a custom system prompt that includes the enhanced context
  let systemPrompt = options.systemPrompt || 
    'You are Xeno AI, a helpful, respectful, and accurate assistant. You provide clear, concise answers, making use of your context awareness to provide more relevant and personalized responses.';
  
  // Add memory context if available
  if (memoryContext && memoryContext.length > 0) {
    systemPrompt += `\n\nUser Context:\n${memoryContext}`;
  }
  
  // Add detected context information
  systemPrompt += `\n\nCurrent Context Information:
- Main topic: ${context.topic}
- User's apparent goal: ${context.userGoal || 'Not clearly identified'}
- User's sentiment: ${context.sentiment.label} (score: ${context.sentiment.score.toFixed(2)})
- Related topics: ${context.relatedTopics?.join(', ') || 'None identified'}`;

  // Process the message with the enhanced context
  const response = await processMessage(message, history, {
    ...options,
    systemPrompt
  });
  
  // After getting the response, update the memory
  if (response && response.message) {
    // Add user message to memory
    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    };
    
    // Add assistant response to memory
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.message
    };
    
    // Process both messages to update memory
    await enhancedMemoryManager.processMessage(
      userMessage,
      sessionId,
      context.entities,
      context.topics || []
    );
    
    await enhancedMemoryManager.processMessage(
      assistantMessage,
      sessionId,
      [], // No entities for assistant message
      context.topics || []
    );
  }
  
  return response;
}

/**
 * Get the context-enhanced prompt for a given context
 * @param context The detected context
 * @param basePrompt The base prompt to enhance
 * @returns Enhanced prompt
 */
export async function getContextEnhancedPrompt(
  context: DetectedContext,
  basePrompt: string
): Promise<string> {
  // Get session ID from context
  const sessionId = context.sessionId || 'anonymous-session';
  
  // Get enhanced memory context
  const memoryContext = await enhancedMemoryManager.getEnhancedContext(
    sessionId,
    basePrompt
  );
  
  // Start with the base prompt
  let enhancedPrompt = basePrompt;
  
  // Add memory context if available
  if (memoryContext && memoryContext.length > 0) {
    enhancedPrompt = `Given this context about the user and previous conversations:
${memoryContext}

${enhancedPrompt}`;
  }
  
  return enhancedPrompt;
}

/**
 * Plan next steps based on detected context and memory
 * @param context The detected context
 * @param sessionId Session identifier
 * @returns Suggested next actions
 */
export async function suggestNextActions(
  context: DetectedContext,
  sessionId: string = 'anonymous-session'
): Promise<{ 
  actionType: ActionType; 
  confidence: number; 
  description: string;
}[]> {
  // Get enhanced memory context
  const memoryContext = await enhancedMemoryManager.getEnhancedContext(
    sessionId,
    context.recentMessages.map(m => m.content).join(' '),
    {
      relevance: 'high',
      maxResults: 3
    }
  );
  
  // Start with empty suggestions
  const suggestions: { 
    actionType: ActionType; 
    confidence: number; 
    description: string;
  }[] = [];
  
  // Decide on next actions based on context and memory
  
  // If the context indicates a search intent
  if (context.intent === 'search' || context.intent === 'question') {
    suggestions.push({
      actionType: ActionType.SEARCH_WEB,
      confidence: 0.8,
      description: `Search for information about "${context.topic}"`
    });
  }
  
  // If there are multiple entities, suggest knowledge graph
  if (context.entities.length >= 3) {
    suggestions.push({
      actionType: ActionType.CREATE_KNOWLEDGE_GRAPH,
      confidence: 0.7,
      description: `Create a knowledge graph connecting ${context.entities.slice(0, 3).map(e => e.value).join(', ')}`
    });
  }
  
  // If we detect a complex concept, suggest mind map
  if (context.relatedTopics && context.relatedTopics.length >= 2) {
    suggestions.push({
      actionType: ActionType.CREATE_MIND_MAP,
      confidence: 0.6,
      description: `Create a mind map around "${context.topic}" including related concepts`
    });
  }
  
  // If the context indicates sentiment analysis would be valuable
  if (Math.abs(context.sentiment.score) > 0.5) {
    suggestions.push({
      actionType: ActionType.ANALYZE_SENTIMENT,
      confidence: 0.5,
      description: `Analyze sentiment in more detail to understand emotional context`
    });
  }
  
  // If we have enough context to start a research project
  if (context.topic && context.relatedTopics && context.relatedTopics.length > 0) {
    suggestions.push({
      actionType: ActionType.CREATE_PROJECT,
      confidence: 0.4,
      description: `Create a research project about "${context.topic}"`
    });
  }
  
  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);
  
  // Return top 3 suggestions
  return suggestions.slice(0, 3);
}

/**
 * Determine if a follow-up question would be appropriate
 * @param context The detected context
 * @param sessionId Session identifier
 * @returns Suggested follow-up question or null
 */
export async function suggestFollowUpQuestion(
  context: DetectedContext,
  sessionId: string = 'anonymous-session'
): Promise<string | null> {
  // If the context doesn't indicate a question would be appropriate
  if (['gratitude', 'greeting', 'negative_feedback'].includes(context.intent)) {
    return null;
  }
  
  // Get enhanced memory context to understand user better
  const memoryContext = await enhancedMemoryManager.getEnhancedContext(
    sessionId,
    context.recentMessages.map(m => m.content).join(' ')
  );
  
  try {
    // Use AI to generate a follow-up question if we have available quota
    if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
      const followUpPrompt = `
        Based on this conversation context and user information, suggest ONE natural follow-up question that would be helpful to ask the user.
        The question should:
        - Be directly related to their current topic "${context.topic}"
        - Help clarify their goal or expand their understanding
        - Be conversational and not too formal
        - Be specific (not generic like "How can I help you further?")
        
        ${memoryContext ? `User context:\n${memoryContext}\n\n` : ''}
        
        Recent messages:
        ${context.recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
        
        Respond with ONLY the follow-up question, no explanation or additional text.
      `;
      
      const response = await processMessage(followUpPrompt, [], {
        systemPrompt: 'You suggest helpful, natural follow-up questions.',
        forceAdvanced: false
      });
      
      let followUp = response.message.trim();
      
      // Clean up the response
      // Remove quotes if present
      if ((followUp.startsWith('"') && followUp.endsWith('"')) || 
          (followUp.startsWith("'") && followUp.endsWith("'"))) {
        followUp = followUp.substring(1, followUp.length - 1);
      }
      
      return followUp;
    }
    
    // Fallback to simple follow-up suggestions if we can't use AI
    return generateSimpleFollowUp(context);
  } catch (error) {
    console.error('Error suggesting follow-up question:', error);
    return generateSimpleFollowUp(context);
  }
}

/**
 * Generate a simple follow-up question based on context
 * @param context The detected context
 * @returns Simple follow-up question
 */
function generateSimpleFollowUp(context: DetectedContext): string {
  // Base questions on intent
  if (context.intent === 'question') {
    return `Is there anything specific about ${context.topic} that you'd like to explore further?`;
  }
  
  if (context.intent === 'search') {
    return `Would you like me to provide more information about ${context.topic}?`;
  }
  
  if (context.intent === 'creation') {
    return `What specific aspects of ${context.topic} would you like to focus on?`;
  }
  
  // Default follow-up
  return `Would you like to learn more about ${context.topic || 'this topic'}?`;
}