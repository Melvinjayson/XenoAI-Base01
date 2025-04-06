/**
 * OpenAI Integration
 * 
 * This module provides functions to interact with OpenAI's API
 * for advanced language model and image processing capabilities.
 */

import OpenAI from 'openai';
import { ChatMessage, ChatResponse, Embedding } from './types';
import { apiQuotaManager } from './api-quota-manager';

// Initialize OpenAI API client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Check if we have a valid OpenAI API key
let openaiApiKeyValid: boolean | null = null;

/**
 * Check if OpenAI API is available (valid API key)
 * @returns Promise that resolves to true if API is available
 */
export async function isOpenAIAvailable(): Promise<boolean> {
  // If we've already validated the API key, return the cached result
  if (openaiApiKeyValid !== null) {
    return openaiApiKeyValid;
  }
  
  // If no API key is set, return false
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key not set');
    openaiApiKeyValid = false;
    return false;
  }
  
  try {
    // Make a minimal API call to check if the key is valid
    const models = await openai.models.list();
    openaiApiKeyValid = true;
    return true;
  } catch (error) {
    console.error('Error validating OpenAI API key:', error);
    openaiApiKeyValid = false;
    return false;
  }
}

/**
 * Process a user message using OpenAI's API
 * @param modelId Model ID (e.g., 'gpt-4o')
 * @param userMessage User's message
 * @param history Conversation history
 * @param options Processing options
 * @returns ChatResponse with model's response
 */
export async function processWithOpenAI(
  modelId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  options: {
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<ChatResponse> {
  try {
    // Prepare messages format for OpenAI API
    const messages = [];
    
    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    // Add conversation history
    for (const msg of history.slice(-10)) { // Use last 10 messages to stay within context
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    // Add current user message if not already included in history
    if (!history.length || history[history.length - 1].role !== 'user') {
      messages.push({
        role: 'user',
        content: userMessage
      });
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: modelId, // Use the requested model (e.g., gpt-4o)
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
    });
    const endTime = Date.now();
    
    // Extract response data
    const completion = response.choices[0]?.message?.content || 'No response generated';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    // Record API usage
    apiQuotaManager.recordApiUsage('openai', usage.total_tokens, {
      model: modelId,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      responseTimeMs: endTime - startTime
    });
    
    // Return formatted response
    return {
      message: completion,
      modelInfo: `OpenAI (${modelId})`,
      tokens: {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      }
    };
    
  } catch (error) {
    console.error('Error in OpenAI processing:', error);
    apiQuotaManager.recordApiFailure('openai', `Processing failed: ${error}`);
    throw new Error(`OpenAI processing failed: ${error}`);
  }
}

/**
 * Process an image with OpenAI's vision capabilities
 * @param imageData Base64-encoded image or URL
 * @param prompt Text prompt for image analysis
 * @returns Text description/analysis of the image
 */
export async function processImage(imageData: string, prompt: string): Promise<string> {
  try {
    // Determine if input is a URL or base64 data
    const isUrl = imageData.startsWith('http');
    
    const imageContent = isUrl
      ? { url: imageData }
      : { url: `data:image/jpeg;base64,${imageData}` };
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: imageContent }
          ]
        }
      ],
      max_tokens: 1000
    });
    
    const description = response.choices[0]?.message?.content || 'No description generated';
    
    // Record API usage (estimate tokens as image processing is complex)
    apiQuotaManager.recordApiUsage('openai', 1000, {
      model: 'gpt-4o',
      isVisionRequest: true
    });
    
    return description;
    
  } catch (error) {
    console.error('Error in image processing:', error);
    apiQuotaManager.recordApiFailure('openai', `Vision processing failed: ${error}`);
    throw new Error(`Image processing failed: ${error}`);
  }
}

/**
 * Create embeddings for a text using OpenAI's embeddings API
 * @param text Text to embed
 * @returns Vector representation (embedding) of the text
 */
export async function createEmbedding(text: string): Promise<Embedding> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      encoding_format: 'float'
    });
    
    const embedding = response.data[0]?.embedding || [];
    
    // Record API usage
    const tokenCount = Math.ceil(text.length / 4); // Rough estimate
    apiQuotaManager.recordApiUsage('openai', tokenCount, {
      model: 'text-embedding-3-large',
      isEmbedding: true
    });
    
    return embedding;
    
  } catch (error) {
    console.error('Error creating embedding:', error);
    apiQuotaManager.recordApiFailure('openai', `Embedding creation failed: ${error}`);
    throw new Error(`Embedding creation failed: ${error}`);
  }
}