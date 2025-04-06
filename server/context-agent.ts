/**
 * Context-Aware Agent
 * 
 * This module provides contextual awareness to the AI system,
 * enabling it to understand user intent and provide more relevant responses.
 */

import * as natural from 'natural';
import { ChatMessage, ContextAnalysis, DetectedContext, Entity } from './types';
import { processMessage } from './model-router';
import { apiQuotaManager, ApiService } from './api-quota-manager';

// Initialize NLP tools
const tokenizer = natural.WordTokenizer ? new natural.WordTokenizer() : { tokenize: (text: string) => text.split(/\s+/) };
const stemmer = natural.PorterStemmer;
const sentimentAnalyzer = natural.SentimentAnalyzer ? 
  new natural.SentimentAnalyzer('English', stemmer, 'afinn') : 
  { getSentiment: (arr: string[]) => arr.length ? 0 : 0 };

// Enum for action types
export enum ActionType {
  CREATE_KNOWLEDGE_GRAPH = 'create_knowledge_graph',
  CREATE_MIND_MAP = 'create_mind_map',
  CREATE_PROJECT = 'create_project',
  ADD_RESEARCH_INSIGHT = 'add_research_insight',
  ANALYZE_SENTIMENT = 'analyze_sentiment',
  EXTRACT_ENTITIES = 'extract_entities',
  GENERATE_SUMMARY = 'generate_summary',
  SEARCH_WEB = 'search_web',
  SEARCH_FILES = 'search_files',
  GET_SYSTEM_INFO = 'get_system_info',
  FILE_MANAGEMENT = 'file_management'
}

/**
 * Extract entities from a message
 * @param message Text to analyze
 * @returns Array of extracted entities
 */
async function extractEntities(message: string): Promise<Entity[]> {
  // Simple NLP-based entity extraction for basic entities
  const entities: Entity[] = [];
  
  // Use pattern matching for dates
  const datePattern = /\b(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}|(?:january|february|march|april|may|june|july|august|september|october|november|december) \d{1,2}(?:st|nd|rd|th)?,? \d{4}|tomorrow|yesterday|today|next (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|last (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi;
  
  const dateMatches = message.match(datePattern) || [];
  dateMatches.forEach(match => {
    entities.push({
      type: 'date',
      value: match,
      position: {
        start: message.indexOf(match),
        end: message.indexOf(match) + match.length
      }
    });
  });
  
  // Use pattern matching for URLs
  const urlPattern = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  
  const urlMatches = message.match(urlPattern) || [];
  urlMatches.forEach(match => {
    entities.push({
      type: 'url',
      value: match,
      position: {
        start: message.indexOf(match),
        end: message.indexOf(match) + match.length
      }
    });
  });
  
  // Use pattern matching for email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  const emailMatches = message.match(emailPattern) || [];
  emailMatches.forEach(match => {
    entities.push({
      type: 'email',
      value: match,
      position: {
        start: message.indexOf(match),
        end: message.indexOf(match) + match.length
      }
    });
  });
  
  // For more complex entities (people, organizations, locations),
  // we would typically use NER (Named Entity Recognition)
  // For simplicity, we're using a simplified approach with advanced models
  
  // Only use advanced entity extraction for longer messages
  if (message.length > 50) {
    try {
      // Check if OpenAI API is available for entity extraction
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const entityPrompt = 
          `Extract named entities from the following text. Return a JSON array with objects containing "type" (person, organization, location, product, or other), "value" (the entity text), and "position" (start and end character indices).
          
          Text: ${message}
          
          JSON entities:`;
        
        // Use model router for consistent quota management
        const result = await processMessage(entityPrompt, [], { 
          systemPrompt: 'You are an expert in named entity recognition. Extract entities accurately and return only valid JSON.',
          forceAdvanced: false // Use basic model to conserve quota
        });
        
        try {
          const jsonStart = result.message.indexOf('[');
          const jsonEnd = result.message.lastIndexOf(']') + 1;
          
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = result.message.substring(jsonStart, jsonEnd);
            const extractedEntities = JSON.parse(jsonStr);
            
            // Add extracted entities to our collection
            extractedEntities.forEach((entity: any) => {
              if (entity.type && entity.value) {
                entities.push({
                  type: entity.type,
                  value: entity.value,
                  position: entity.position || {
                    start: message.indexOf(entity.value),
                    end: message.indexOf(entity.value) + entity.value.length
                  }
                });
              }
            });
          }
        } catch (parseError) {
          console.error('Error parsing entity extraction result:', parseError);
        }
      }
    } catch (error) {
      console.error('Error in advanced entity extraction:', error);
      // Fallback to basic extraction already done
    }
  }
  
  // Remove duplicates
  const uniqueEntities = entities.filter((entity, index, self) => 
    index === self.findIndex(e => e.type === entity.type && e.value === entity.value)
  );
  
  return uniqueEntities;
}

/**
 * Extract keywords from a message
 * @param message Text to analyze
 * @returns Array of keywords
 */
function extractKeywords(message: string): string[] {
  // Tokenize the message
  const tokens = tokenizer.tokenize(message) || [];
  
  // Remove stopwords (common words with little semantic meaning)
  const stopwords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
                    'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
                    'about', 'against', 'between', 'into', 'through', 'during', 'before',
                    'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over',
                    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
                    'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
                    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
                    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
                    'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain',
                    'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn',
                    'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren',
                    'won', 'wouldn', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
                    'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he',
                    'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its',
                    'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
                    'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'have',
                    'has', 'had', 'do', 'does', 'did', 'doing', 'would', 'should', 'could',
                    'ought', 'i\'m', 'you\'re', 'he\'s', 'she\'s', 'it\'s', 'we\'re',
                    'they\'re', 'i\'ve', 'you\'ve', 'we\'ve', 'they\'ve', 'i\'d', 'you\'d',
                    'he\'d', 'she\'d', 'we\'d', 'they\'d', 'i\'ll', 'you\'ll', 'he\'ll',
                    'she\'ll', 'we\'ll', 'they\'ll', 'isn\'t', 'aren\'t', 'wasn\'t',
                    'weren\'t', 'hasn\'t', 'haven\'t', 'hadn\'t', 'doesn\'t', 'don\'t',
                    'didn\'t', 'won\'t', 'wouldn\'t', 'shan\'t', 'shouldn\'t', 'can\'t',
                    'cannot', 'couldn\'t', 'mustn\'t', 'let\'s', 'that\'s', 'who\'s',
                    'what\'s', 'here\'s', 'there\'s', 'when\'s', 'where\'s', 'why\'s',
                    'how\'s'];
  
  const filteredTokens = tokens.filter(token => 
    !stopwords.includes(token.toLowerCase()) && token.length > 2
  );
  
  // Stem the tokens to get base forms
  const stemmedTokens = filteredTokens.map(token => 
    stemmer.stem(token.toLowerCase())
  );
  
  // Count token frequencies
  const tokenCounts: Record<string, number> = {};
  stemmedTokens.forEach(token => {
    tokenCounts[token] = (tokenCounts[token] || 0) + 1;
  });
  
  // Sort tokens by frequency
  const sortedTokens = Object.entries(tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Map back to original tokens (unstemmed) using the first occurrence
  const originalTokens = new Map<string, string>();
  tokens.forEach(token => {
    const stemmed = stemmer.stem(token.toLowerCase());
    if (!originalTokens.has(stemmed)) {
      originalTokens.set(stemmed, token);
    }
  });
  
  // Get top keywords (unstemmed)
  const keywords = sortedTokens
    .slice(0, 10)
    .map(stemmed => originalTokens.get(stemmed) || stemmed);
  
  return keywords;
}

/**
 * Analyze sentiment of a message
 * @param message Text to analyze
 * @returns Sentiment analysis results
 */
function analyzeSentiment(message: string): { score: number; label: 'positive' | 'negative' | 'neutral'; emotions: string[]; intensity: number } {
  // Tokenize the message
  const tokens = tokenizer.tokenize(message) || [];
  
  // Calculate sentiment score
  const score = sentimentAnalyzer.getSentiment(tokens);
  
  // Detect emotions
  const emotionKeywords = {
    joy: ['happy', 'excited', 'delighted', 'glad'],
    sadness: ['sad', 'upset', 'disappointed', 'unhappy'],
    anger: ['angry', 'frustrated', 'annoyed', 'mad'],
    fear: ['afraid', 'worried', 'scared', 'anxious'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked']
  };

  const detectedEmotions = [];
  const messageLower = message.toLowerCase();
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      detectedEmotions.push(emotion);
    }
  }

  // Calculate emotional intensity
  const intensity = Math.abs(score) * (detectedEmotions.length > 0 ? 1.5 : 1);
  
  // Map score to label
  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  }
  
  return { score, label, emotions: detectedEmotions, intensity };
}

/**
 * Analyze the context of a conversation
 * @param message Current message
 * @param history Previous conversation history
 * @returns Context analysis
 */
export async function analyzeContext(message: string, history: ChatMessage[] = []): Promise<ContextAnalysis> {
  console.log('Analyzing context for message:', message.substring(0, 50) + (message.length > 50 ? '...' : ''));
  
  // Extract entities
  const entities = await extractEntities(message);
  
  // Extract keywords
  const keywords = extractKeywords(message);
  
  // Analyze sentiment
  const sentiment = analyzeSentiment(message);
  
  // Determine intent (simple rule-based approach)
  const lowerMessage = message.toLowerCase();
  let intent = 'unknown';
  
  // Simple intent detection
  if (lowerMessage.includes('?') || lowerMessage.startsWith('what') || 
      lowerMessage.startsWith('how') || lowerMessage.startsWith('why') || 
      lowerMessage.startsWith('when') || lowerMessage.startsWith('where') || 
      lowerMessage.startsWith('who') || lowerMessage.startsWith('which') || 
      lowerMessage.startsWith('can you') || lowerMessage.startsWith('could you')) {
    intent = 'question';
  } else if (lowerMessage.startsWith('search') || lowerMessage.includes('find') || 
             lowerMessage.includes('look for') || lowerMessage.includes('look up')) {
    intent = 'search';
  } else if (lowerMessage.startsWith('create') || lowerMessage.startsWith('make') || 
             lowerMessage.startsWith('generate') || lowerMessage.startsWith('build')) {
    intent = 'creation';
  } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    intent = 'gratitude';
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi ') || 
             lowerMessage === 'hi' || lowerMessage.includes('hey') || 
             lowerMessage.includes('greetings')) {
    intent = 'greeting';
  } else if (sentiment.score > 0.5) {
    intent = 'positive_feedback';
  } else if (sentiment.score < -0.5) {
    intent = 'negative_feedback';
  } else if (message.length < 20) {
    intent = 'short_response';
  } else {
    intent = 'statement';
  }
  
  // Perform advanced context analysis for complex interactions
  let topics: string[] = [];
  let userGoal: string | null = null;
  let relatedTopics: string[] = [];
  
  // Only perform advanced analysis for longer messages or conversations with history
  if (message.length > 50 || history.length > 3) {
    try {
      // Check if OpenAI API is available for advanced analysis
      if (process.env.OPENAI_API_KEY && apiQuotaManager.getRemainingQuota(ApiService.OPENAI) > 0) {
        const contextPrompt = `
          Analyze the following conversation to determine:
          1. The main topics being discussed (max 3, comma-separated)
          2. The user's apparent goal or objective
          3. Related topics that might be relevant (max 3, comma-separated)
          
          ${history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}
          USER: ${message}
          
          Respond in this exact format:
          Topics: topic1, topic2, topic3
          User Goal: user's goal
          Related Topics: related1, related2, related3
        `;
        
        // Use model router for consistent quota management
        const result = await processMessage(contextPrompt, [], { 
          systemPrompt: 'You are an expert conversation analyst. Provide accurate and concise analysis.',
          forceAdvanced: false // Use basic model to conserve quota
        });
        
        // Parse the structured response
        const lines = result.message.split('\n');
        for (const line of lines) {
          if (line.startsWith('Topics:')) {
            topics = line.substring('Topics:'.length)
              .split(',')
              .map(topic => topic.trim())
              .filter(topic => topic.length > 0);
          } else if (line.startsWith('User Goal:')) {
            userGoal = line.substring('User Goal:'.length).trim();
            if (userGoal === 'None' || userGoal === 'Unknown' || userGoal === 'N/A') {
              userGoal = null;
            }
          } else if (line.startsWith('Related Topics:')) {
            relatedTopics = line.substring('Related Topics:'.length)
              .split(',')
              .map(topic => topic.trim())
              .filter(topic => topic.length > 0);
          }
        }
      }
    } catch (error) {
      console.error('Error in advanced context analysis:', error);
      // Fallback to basic keyword extraction for topics
      topics = keywords.slice(0, 3);
    }
  } else {
    // For simpler messages, use keywords as topics
    topics = keywords.slice(0, 3);
  }
  
  // Create and return the context analysis
  return {
    entities,
    keywords,
    sentiment,
    topics,
    intent,
    userGoal,
    relatedTopics,
    messageLength: message.length,
    historyLength: history.length
  };
}

/**
 * Detect context from a message and conversation history
 * @param message Current message
 * @param history Previous conversation history
 * @returns Detected context
 */
export async function detectContext(message: string, history: ChatMessage[] = []): Promise<DetectedContext> {
  // Analyze the message context
  const analysis = await analyzeContext(message, history);
  
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
    }
  };
  
  return context;
}

/**
 * Build a context-aware prompt for the AI assistant
 * @param context Detected context
 * @returns Customized system prompt
 */
export function buildContextAwarePrompt(context: DetectedContext): string {
  // Base prompt
  let prompt = 'You are Xeno AI, a helpful, respectful, and accurate assistant. ';
  
  // Add context-aware customization
  if (context.topic) {
    prompt += `The current topic appears to be ${context.topic}. `;
  }
  
  // Add intent-specific instructions
  switch (context.intent) {
    case 'question':
      prompt += 'Provide clear, direct answers to questions. If you\'re unsure, admit what you don\'t know rather than guessing. ';
      break;
    case 'search':
      prompt += 'Help find specific information efficiently. Organize your response to make it easy to scan. ';
      break;
    case 'creation':
      prompt += 'Provide creative, helpful content that meets the user\'s needs. Be detailed and thorough. ';
      break;
    case 'negative_feedback':
      prompt += 'Address concerns empathetically and provide constructive solutions. ';
      break;
  }
  
  // Add entity-specific context if available
  if (context.entities.length > 0) {
    prompt += 'The conversation involves ';
    
    const entityTypes = new Map<string, string[]>();
    context.entities.forEach(entity => {
      if (!entityTypes.has(entity.type)) {
        entityTypes.set(entity.type, []);
      }
      entityTypes.get(entity.type)?.push(entity.value);
    });
    
    const entityDescriptions = [];
    for (const [type, values] of entityTypes.entries()) {
      if (values.length > 0) {
        entityDescriptions.push(`${type}s: ${values.slice(0, 3).join(', ')}`);
      }
    }
    
    prompt += entityDescriptions.join('; ') + '. ';
  }
  
  // Add related topics if available
  if (context.relatedTopics && context.relatedTopics.length > 0) {
    prompt += `Related topics that may be relevant include: ${context.relatedTopics.join(', ')}. `;
  }
  
  // Add user goal if available
  if (context.userGoal) {
    prompt += `The user appears to be trying to: ${context.userGoal}. `;
  }
  
  // Add final instruction
  prompt += 'Respond in a helpful, concise manner that addresses the user\'s specific needs.';
  
  return prompt;
}

/**
 * Recommend actions based on context
 * @param context Detected context
 * @returns Recommended actions
 */
export function recommendActions(context: DetectedContext): ActionType[] {
  const actions: ActionType[] = [];
  
  // Analyze context to recommend appropriate actions
  
  // Context-based action recommendations
  if (context.entities.some(e => e.type === 'person' || e.type === 'organization' || e.type === 'concept')) {
    actions.push(ActionType.CREATE_KNOWLEDGE_GRAPH);
    actions.push(ActionType.EXTRACT_ENTITIES);
  }
  
  // Intent-based recommendations
  if (context.intent === 'creation') {
    if (context.userGoal && context.userGoal.includes('project')) {
      actions.push(ActionType.CREATE_PROJECT);
    } else {
      actions.push(ActionType.CREATE_MIND_MAP);
    }
  }
  
  // Keyword-based recommendations
  if (context.keywords.some(k => 
    ['sentiment', 'feeling', 'opinion', 'review', 'feedback'].includes(k.toLowerCase())
  )) {
    actions.push(ActionType.ANALYZE_SENTIMENT);
  }
  
  // Topic-based recommendations
  if (context.topic && ['news', 'current events', 'recent', 'latest'].some(t => 
    context.topic.toLowerCase().includes(t)
  )) {
    actions.push(ActionType.SEARCH_WEB);
  }
  
  // Entity-based recommendations
  if (context.entities.length > 5) {
    actions.push(ActionType.EXTRACT_ENTITIES);
    actions.push(ActionType.GENERATE_SUMMARY);
  }
  
  // Message length based recommendations
  if (context.metadata.messageLength > 500) {
    actions.push(ActionType.GENERATE_SUMMARY);
  }
  
  // File-related actions
  if (context.keywords.some(k => 
    ['file', 'document', 'read', 'write', 'save', 'load'].includes(k.toLowerCase())
  )) {
    actions.push(ActionType.FILE_MANAGEMENT);
    actions.push(ActionType.SEARCH_FILES);
  }
  
  // System-related actions
  if (context.keywords.some(k => 
    ['system', 'computer', 'laptop', 'desktop', 'device', 'hardware'].includes(k.toLowerCase())
  )) {
    actions.push(ActionType.GET_SYSTEM_INFO);
  }
  
  // Ensure we have at least one action
  if (actions.length === 0) {
    // Default actions based on intent
    if (context.intent === 'question') {
      actions.push(ActionType.SEARCH_WEB);
    } else {
      actions.push(ActionType.EXTRACT_ENTITIES);
    }
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
): Promise<{ 
  response: string; 
  context: DetectedContext; 
  recommendedActions: ActionType[];
}> {
  // Detect context
  const context = await detectContext(message, history);
  
  // Build context-aware system prompt
  const systemPrompt = buildContextAwarePrompt(context);
  
  // Get recommended actions
  const recommendedActions = recommendActions(context);
  
  // Process message with context-aware prompt
  const result = await processMessage(
    message,
    history,
    {
      systemPrompt,
      ...options,
      // Use advanced model for complex contexts
      forceAdvanced: options.forceAdvanced ?? 
        (context.metadata.messageLength > 100 || context.metadata.historyLength > 5)
    }
  );
  
  return {
    response: result.message,
    context,
    recommendedActions
  };
}