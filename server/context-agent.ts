/**
 * Context-Aware Agent
 * 
 * This module provides contextual awareness to the AI system,
 * enabling it to understand user intent and provide more relevant responses.
 */

import { ChatMessage, DetectedContext, Entity, ContextAnalysis, ActionType } from './types';
import { processUserMessage } from './model-router';
import { apiQuotaManager } from './api-quota-manager';

// Default system prompt for context analysis
const CONTEXT_ANALYSIS_PROMPT = `
You are a context analysis agent. Your task is to analyze a conversation history and extract:
1. The main topic or topics being discussed
2. The user's intent or goal
3. Key entities mentioned in the conversation
4. Related topics that might be relevant
5. Any specific constraints or preferences mentioned by the user

Return this information in a structured format that can be used to improve the relevance of AI responses.
`;

/**
 * Extract entities from a message
 * @param message Text to analyze
 * @returns Array of extracted entities
 */
async function extractEntities(message: string): Promise<Entity[]> {
  try {
    // Use a lightweight approach for entity extraction
    const entities: Entity[] = [];
    
    // Extract potential named entities (people, organizations, locations) with simple pattern matching
    // This is a simplified approach - in a real system you'd use NER models or APIs
    
    // Match potential people names (capitalized words)
    const nameRegex = /\b[A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]+\b/g;
    const names = message.match(nameRegex) || [];
    
    for (const name of names) {
      entities.push({
        name,
        type: 'PERSON',
        confidence: 0.7,
        startPosition: message.indexOf(name),
        endPosition: message.indexOf(name) + name.length
      });
    }
    
    // Match potential organizations (all caps words)
    const orgRegex = /\b[A-Z]{2,}\b/g;
    const orgs = message.match(orgRegex) || [];
    
    for (const org of orgs) {
      entities.push({
        name: org,
        type: 'ORGANIZATION',
        confidence: 0.6,
        startPosition: message.indexOf(org),
        endPosition: message.indexOf(org) + org.length
      });
    }
    
    // Match dates
    const dateRegex = /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}\b/g;
    const dates = message.match(dateRegex) || [];
    
    for (const date of dates) {
      entities.push({
        name: date,
        type: 'DATE',
        confidence: 0.9,
        startPosition: message.indexOf(date),
        endPosition: message.indexOf(date) + date.length
      });
    }
    
    return entities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    return [];
  }
}

/**
 * Extract keywords from a message
 * @param message Text to analyze
 * @returns Array of keywords
 */
function extractKeywords(message: string): string[] {
  // Simple keyword extraction - remove stopwords and keep important terms
  // In a real implementation, use TF-IDF or similar algorithms
  
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
    'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn',
    'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn',
    'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn'
  ]);
  
  // Tokenize and filter out stopwords
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => !stopwords.has(word) && word.length > 2);
  
  // Count occurrences of each word
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  // Sort by frequency and take top keywords
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Analyze sentiment of a message
 * @param message Text to analyze
 * @returns Sentiment analysis results
 */
function analyzeSentiment(message: string): { score: number; label: 'positive' | 'negative' | 'neutral' } {
  // Simple rule-based sentiment analysis
  // In a real implementation, use a proper sentiment analysis model
  
  const positiveWords = new Set([
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'terrific', 'outstanding', 'exceptional', 'superb', 'perfect',
    'happy', 'glad', 'pleased', 'delighted', 'satisfied', 'enjoy',
    'love', 'like', 'appreciate', 'impressive', 'awesome', 'brilliant',
    'helpful', 'useful', 'valuable', 'beneficial', 'effective', 'efficient'
  ]);
  
  const negativeWords = new Set([
    'bad', 'poor', 'terrible', 'horrible', 'awful', 'dreadful',
    'disappointing', 'frustrating', 'annoying', 'irritating', 'unpleasant',
    'sad', 'unhappy', 'upset', 'angry', 'furious', 'dislike',
    'hate', 'despise', 'resent', 'useless', 'worthless', 'ineffective',
    'inefficient', 'problematic', 'difficult', 'challenging', 'confusing'
  ]);
  
  // Count positive and negative words
  const words = message.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (positiveWords.has(word)) {
      positiveCount++;
    } else if (negativeWords.has(word)) {
      negativeCount++;
    }
  }
  
  // Calculate sentiment score (-1 to 1)
  const totalSentimentWords = positiveCount + negativeCount;
  const score = totalSentimentWords === 0 
    ? 0 
    : (positiveCount - negativeCount) / totalSentimentWords;
  
  // Determine sentiment label
  let label: 'positive' | 'negative' | 'neutral';
  if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  } else {
    label = 'neutral';
  }
  
  return { score, label };
}

/**
 * Analyze the context of a conversation
 * @param message Current message
 * @param history Previous conversation history
 * @returns Context analysis
 */
export async function analyzeContext(message: string, history: ChatMessage[] = []): Promise<ContextAnalysis> {
  try {
    // Extract entities from the current message
    const entities = await extractEntities(message);
    
    // Extract keywords from the entire conversation
    const allText = [
      ...history.map(msg => msg.content), 
      message
    ].join(' ');
    
    const keywords = extractKeywords(allText);
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(message);
    
    // Attempt to determine the user's intent (simplified approach)
    // In a production system, use an intent classifier model
    let intent = 'information_request'; // Default intent
    
    if (message.includes('?')) {
      intent = 'question';
    } else if (message.toLowerCase().includes('help')) {
      intent = 'help_request';
    } else if (message.toLowerCase().includes('thank')) {
      intent = 'gratitude';
    } else if (sentiment.label === 'negative') {
      intent = 'complaint';
    } else if (message.toLowerCase().match(/^(hi|hello|hey|greetings)/)) {
      intent = 'greeting';
    }
    
    // Determine the main topic (simplified approach)
    // In a production system, use topic modeling
    let topic = keywords.length > 0 ? keywords[0] : 'general';
    
    // Generate a summary (simplified approach)
    // In a production system, use a summarization model
    const summary = message.length > 100 
      ? message.substring(0, 100) + '...' 
      : message;
    
    return {
      topic,
      intent,
      entities,
      sentiment,
      keywords,
      summary,
      confidence: 0.7 // Confidence score for this analysis
    };
  } catch (error) {
    console.error('Error analyzing context:', error);
    
    // Return a minimal context analysis on error
    return {
      topic: 'general',
      intent: 'unknown',
      entities: [],
      sentiment: { score: 0, label: 'neutral' },
      keywords: [],
      summary: message.substring(0, 100),
      confidence: 0.1
    };
  }
}

/**
 * Detect context from a message and conversation history
 * @param message Current message
 * @param history Previous conversation history
 * @returns Detected context
 */
export async function detectContext(message: string, history: ChatMessage[] = []): Promise<DetectedContext> {
  try {
    // First do a lightweight analysis
    const analysis = await analyzeContext(message, history);
    
    // Prepare the context object
    const context: DetectedContext = {
      topic: analysis.topic,
      entities: analysis.entities,
      recentMessages: history.slice(-5), // Keep only the 5 most recent messages
      metadata: {}
    };
    
    // For more complex cases, we can use the AI model to analyze the context more deeply
    if (message.length > 50 || history.length > 3) {
      // Check API quota before making additional calls
      const quotaWarning = apiQuotaManager.checkRateLimit('openai');
      if (quotaWarning) {
        console.warn(`Skipping deep context analysis due to rate limits: ${quotaWarning}`);
        return context;
      }
      
      try {
        // Use the LLM to analyze the context more deeply
        const systemPrompt = CONTEXT_ANALYSIS_PROMPT;
        const contextMessage = `
        Please analyze this conversation and extract the key information:
        
        Conversation history:
        ${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
        
        Current message:
        ${message}
        `;
        
        const response = await processUserMessage(contextMessage, [], {
          systemPrompt,
          forceAdvanced: true,
          useRag: false
        });
        
        // Extract additional context from the response
        // Note: in a real implementation, have the model return structured JSON
        // For demo purposes, we'll just extract some simple patterns
        
        const topicMatch = response.message.match(/Topic: ([^\n]+)/);
        const goalMatch = response.message.match(/Goal: ([^\n]+)/);
        const relatedMatch = response.message.match(/Related topics: ([^\n]+)/);
        
        if (topicMatch && topicMatch[1]) {
          context.topic = topicMatch[1].trim();
        }
        
        if (goalMatch && goalMatch[1]) {
          context.userGoal = goalMatch[1].trim();
        }
        
        if (relatedMatch && relatedMatch[1]) {
          context.relatedTopics = relatedMatch[1].split(',').map(t => t.trim());
        }
      } catch (error) {
        console.error('Error in deep context analysis:', error);
        // Continue with the lightweight analysis results
      }
    }
    
    return context;
  } catch (error) {
    console.error('Error detecting context:', error);
    
    // Return a minimal context on error
    return {
      topic: 'general',
      entities: [],
      recentMessages: history.slice(-3)
    };
  }
}

/**
 * Build a context-aware prompt for the AI assistant
 * @param context Detected context
 * @returns Customized system prompt
 */
export function buildContextAwarePrompt(context: DetectedContext): string {
  let systemPrompt = `
  You are Xeno AI, an intelligent assistant focused on providing helpful, accurate responses.
  
  Current conversation topic: ${context.topic}
  `;
  
  if (context.userGoal) {
    systemPrompt += `\nUser's goal: ${context.userGoal}`;
  }
  
  if (context.entities.length > 0) {
    systemPrompt += `\n\nKey entities in the conversation:`;
    context.entities.slice(0, 5).forEach(entity => {
      systemPrompt += `\n- ${entity.name} (${entity.type})`;
    });
  }
  
  if (context.relatedTopics && context.relatedTopics.length > 0) {
    systemPrompt += `\n\nRelated topics: ${context.relatedTopics.join(', ')}`;
  }
  
  // Add special instructions based on detected context
  if (context.topic.toLowerCase().includes('research') || 
      context.topic.toLowerCase().includes('study') ||
      context.topic.toLowerCase().includes('learn')) {
    systemPrompt += `
    \n\nThe user appears to be conducting research or studying. Provide comprehensive, 
    educational responses that explain concepts clearly. Include relevant facts and 
    cite sources when possible. Organize information in a structured way that aids learning.
    `;
  } else if (context.topic.toLowerCase().includes('tech') || 
             context.topic.toLowerCase().includes('code') ||
             context.topic.toLowerCase().includes('programming')) {
    systemPrompt += `
    \n\nThe user appears to be discussing technology or programming. Provide technically 
    accurate information, with code examples when relevant. Be precise and thorough in your 
    explanations, assuming the user has technical background.
    `;
  }
  
  systemPrompt += `
  \n\nGeneral guidelines:
  - Be conversational and friendly, but focused on providing accurate information
  - Give concise answers unless the user asks for detailed explanations
  - If you're unsure about something, be transparent about your limitations
  - When appropriate, suggest related topics the user might be interested in
  `;
  
  return systemPrompt;
}

/**
 * Recommend actions based on context
 * @param context Detected context
 * @returns Recommended actions
 */
export function recommendActions(context: DetectedContext): ActionType[] {
  const actions: ActionType[] = [];
  
  // Recommend actions based on the topic and entities
  if (context.topic.toLowerCase().includes('research') || 
      context.entities.some(e => e.type === 'RESEARCH_TOPIC')) {
    actions.push(ActionType.CREATE_KNOWLEDGE_GRAPH);
    actions.push(ActionType.EXTRACT_ENTITIES);
  }
  
  if (context.topic.toLowerCase().includes('project') || 
      context.userGoal?.toLowerCase().includes('plan')) {
    actions.push(ActionType.CREATE_PROJECT);
    actions.push(ActionType.CREATE_MIND_MAP);
  }
  
  if (context.topic.toLowerCase().includes('analyze') || 
      context.topic.toLowerCase().includes('sentiment')) {
    actions.push(ActionType.ANALYZE_SENTIMENT);
  }
  
  if (context.topic.toLowerCase().includes('search') || 
      context.topic.toLowerCase().includes('find information')) {
    actions.push(ActionType.SEARCH_WEB);
  }
  
  // If no specific actions are recommended, suggest general ones
  if (actions.length === 0) {
    actions.push(ActionType.EXTRACT_ENTITIES);
    actions.push(ActionType.GENERATE_SUMMARY);
  }
  
  return actions;
}

/**
 * Process a message with context awareness
 * @param message User message
 * @param history Conversation history
 * @param options Processing options
 * @returns AI response
 */
export async function processWithContextAwareness(
  message: string,
  history: ChatMessage[] = [],
  options: any = {}
) {
  try {
    // Detect the context
    const context = await detectContext(message, history);
    
    // Build a context-aware system prompt
    const contextAwarePrompt = buildContextAwarePrompt(context);
    
    // Get the AI response with the context-aware prompt
    const response = await processUserMessage(
      message,
      history,
      {
        ...options,
        systemPrompt: contextAwarePrompt,
        useRag: true // Enable RAG for context-aware responses
      }
    );
    
    // Recommend actions based on the context
    const recommendedActions = recommendActions(context);
    
    // Return the enhanced response with context and recommendations
    return {
      ...response,
      context,
      recommendedActions
    };
  } catch (error) {
    console.error('Error in context-aware processing:', error);
    
    // Fall back to standard processing without context awareness
    return processUserMessage(message, history, options);
  }
}