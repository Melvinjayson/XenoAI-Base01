/**
 * OpenAI Integration
 * 
 * This module provides functionality for interacting with OpenAI services,
 * including text generation, image generation, and embedding computation.
 */

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import {
  ChatMessage,
  ProcessOptions,
  ProcessorResponse,
  Reference
} from './types';
import { apiQuotaManager, ApiService } from './api-quota-manager';
import { estimateTokenCount } from './model-selector';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

/**
 * Process a message using OpenAI
 * @param message User message
 * @param history Conversation history
 * @param model OpenAI model to use
 * @param options Processing options
 * @returns Processed response
 */
export async function processWithOpenAI(
  message: string,
  history: ChatMessage[] = [],
  model: string = 'gpt-4o',
  options: ProcessOptions = {}
): Promise<ProcessorResponse> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  
  // Check quota limits
  const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI);
  if (quotaCheck) {
    throw new Error(`Rate limit exceeded: ${quotaCheck}`);
  }
  
  try {
    console.log(`Processing with OpenAI (${model})`);
    
    // Start timing
    const startTime = Date.now();
    
    // Format messages for OpenAI API
    const messages: ChatCompletionMessageParam[] = [];
    
    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    // Add conversation history
    if (history && history.length > 0) {
      for (const historyItem of history) {
        messages.push({
          role: historyItem.role,
          content: historyItem.content
        });
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message
    });
    
    // Process with OpenAI
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: messages as any,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      top_p: options.topP || 1,
      frequency_penalty: options.frequencyPenalty || 0,
      presence_penalty: options.presencePenalty || 0
    });
    
    // End timing
    const endTime = Date.now();
    
    // Extract response
    const response = completion.choices[0].message.content || '';
    
    // Get usage statistics
    const promptTokens = completion.usage?.prompt_tokens || estimateTokenCount(messages.map(m => m.content).join(' '));
    const completionTokens = completion.usage?.completion_tokens || estimateTokenCount(response);
    const totalTokens = completion.usage?.total_tokens || (promptTokens + completionTokens);
    
    // Track API usage
    apiQuotaManager.trackUsage(ApiService.OPENAI, {
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      responseTimeMs: endTime - startTime
    });
    
    // Create response object
    const result: ProcessorResponse = {
      message: response,
      model,
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens
      },
      timing: {
        start: startTime,
        end: endTime,
        total: endTime - startTime
      }
    };
    
    return result;
  } catch (error: any) {
    console.error('Error processing with OpenAI:', error);
    
    // Track failure
    if (error.message && error.message.includes('rate limit')) {
      apiQuotaManager.trackFailure(ApiService.OPENAI, true);
    } else {
      apiQuotaManager.trackFailure(ApiService.OPENAI, false);
    }
    
    throw error;
  }
}

/**
 * Generate embeddings for text
 * @param text Text to embed
 * @returns Embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  
  // Check quota limits
  const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI_EMBEDDING);
  if (quotaCheck) {
    throw new Error(`Rate limit exceeded: ${quotaCheck}`);
  }
  
  try {
    const startTime = Date.now();
    
    // Truncate text if it's too long (max 8191 tokens for embedding models)
    const tokensEstimate = estimateTokenCount(text);
    if (tokensEstimate > 8000) {
      console.warn(`Text too long for embedding: ~${tokensEstimate} tokens. Truncating.`);
      text = text.substring(0, Math.floor(text.length * (8000 / tokensEstimate)));
    }
    
    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    
    const endTime = Date.now();
    
    // Track API usage
    apiQuotaManager.trackUsage(ApiService.OPENAI_EMBEDDING, {
      model: 'text-embedding-3-small',
      promptTokens: response.usage.prompt_tokens,
      totalTokens: response.usage.prompt_tokens,
      responseTimeMs: endTime - startTime,
      isEmbedding: true
    });
    
    return response.data[0].embedding;
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    
    // Track failure
    if (error.message && error.message.includes('rate limit')) {
      apiQuotaManager.trackFailure(ApiService.OPENAI_EMBEDDING, true);
    } else {
      apiQuotaManager.trackFailure(ApiService.OPENAI_EMBEDDING, false);
    }
    
    throw error;
  }
}

/**
 * Generate an image from a text prompt
 * @param prompt Text prompt for image generation
 * @returns Generated image URL
 */
export async function generateImage(prompt: string): Promise<string> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  
  // Check quota limits
  const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI_IMAGE);
  if (quotaCheck) {
    throw new Error(`Rate limit exceeded: ${quotaCheck}`);
  }
  
  try {
    const startTime = Date.now();
    
    // Generate image
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    });
    
    const endTime = Date.now();
    
    // Track API usage (for DALL-E, we count 1 image as 1000 tokens)
    apiQuotaManager.trackUsage(ApiService.OPENAI_IMAGE, {
      model: 'dall-e-3',
      promptTokens: 1000,
      totalTokens: 1000,
      responseTimeMs: endTime - startTime
    });
    
    return response.data[0].url;
  } catch (error: any) {
    console.error('Error generating image:', error);
    
    // Track failure
    if (error.message && error.message.includes('rate limit')) {
      apiQuotaManager.trackFailure(ApiService.OPENAI_IMAGE, true);
    } else {
      apiQuotaManager.trackFailure(ApiService.OPENAI_IMAGE, false);
    }
    
    throw error;
  }
}

/**
 * Transcribe audio to text
 * @param audioFile Audio file (as File object)
 * @returns Transcribed text
 */
export async function transcribeAudio(audioFile: File): Promise<string> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  
  // Check quota limits
  const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI_AUDIO);
  if (quotaCheck) {
    throw new Error(`Rate limit exceeded: ${quotaCheck}`);
  }
  
  try {
    const startTime = Date.now();
    
    // Transcribe audio
    const response = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      response_format: 'json'
    });
    
    const endTime = Date.now();
    
    // Track API usage (for audio, we estimate based on duration)
    // Assuming roughly 1000 tokens per minute of audio
    const tokensEstimate = Math.max(1000, Math.ceil((endTime - startTime) / 1000)); // At least 1000 tokens
    
    apiQuotaManager.trackUsage(ApiService.OPENAI_AUDIO, {
      model: 'whisper-1',
      promptTokens: tokensEstimate,
      totalTokens: tokensEstimate,
      responseTimeMs: endTime - startTime
    });
    
    return response.text;
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    
    // Track failure
    if (error.message && error.message.includes('rate limit')) {
      apiQuotaManager.trackFailure(ApiService.OPENAI_AUDIO, true);
    } else {
      apiQuotaManager.trackFailure(ApiService.OPENAI_AUDIO, false);
    }
    
    throw error;
  }
}

/**
 * Convert text to speech
 * @param text Text to convert to speech
 * @param voice Voice ID (default: alloy)
 * @returns Audio as ArrayBuffer
 */
export async function textToSpeech(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<ArrayBuffer> {
  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }
  
  // Check quota limits
  const quotaCheck = apiQuotaManager.checkRateLimit(ApiService.OPENAI_AUDIO);
  if (quotaCheck) {
    throw new Error(`Rate limit exceeded: ${quotaCheck}`);
  }
  
  try {
    const startTime = Date.now();
    
    // Generate speech
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed: 1.0
    });
    
    const buffer = await response.arrayBuffer();
    
    const endTime = Date.now();
    
    // Track API usage (estimate based on character count)
    // Approximately 1 token per 4 characters
    const tokensEstimate = Math.ceil(text.length / 4);
    
    apiQuotaManager.trackUsage(ApiService.OPENAI_AUDIO, {
      model: 'tts-1',
      promptTokens: tokensEstimate,
      totalTokens: tokensEstimate,
      responseTimeMs: endTime - startTime
    });
    
    return buffer;
  } catch (error: any) {
    console.error('Error generating speech:', error);
    
    // Track failure
    if (error.message && error.message.includes('rate limit')) {
      apiQuotaManager.trackFailure(ApiService.OPENAI_AUDIO, true);
    } else {
      apiQuotaManager.trackFailure(ApiService.OPENAI_AUDIO, false);
    }
    
    throw error;
  }
}