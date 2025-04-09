/**
 * AI Service Module
 * 
 * Provides functions for interacting with AI services like OpenAI.
 */

import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Initialize OpenAI client
let openaiInstance: OpenAI | null = null;

/**
 * Gets an instance of the OpenAI API client
 */
export function getOpenAIApi(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required');
    }
    
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return openaiInstance;
}

/**
 * Generates a text completion using the OpenAI API
 */
export async function generateCompletion(
  prompt: string,
  model: string = 'gpt-4o',
  temperature: number = 0.7,
  maxTokens: number = 1000,
  systemPrompt: string = 'You are a helpful assistant.'
): Promise<string> {
  try {
    const openai = getOpenAIApi();
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    });
    
    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
}

/**
 * Generates a structured completion with specific format using the OpenAI API
 */
export async function generateStructuredCompletion<T>(
  prompt: string,
  model: string = 'gpt-4o',
  temperature: number = 0.7,
  maxTokens: number = 1000,
  systemPrompt: string = 'You are a helpful assistant that provides structured responses in JSON format.'
): Promise<T> {
  try {
    const openai = getOpenAIApi();
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as T;
  } catch (error) {
    console.error('Error generating structured completion:', error);
    throw error;
  }
}

/**
 * Generates an image using DALL-E 3
 */
export async function generateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  quality: 'standard' | 'hd' = 'standard'
): Promise<{ url: string }> {
  try {
    const openai = getOpenAIApi();
    
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality
    });
    
    return { url: response.data[0].url || '' };
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Formats a prompt for consistent AI interaction
 */
export function formatPrompt(instructions: string, context?: string, examples?: string): string {
  let formattedPrompt = instructions;
  
  if (context) {
    formattedPrompt += `\n\nContext:\n${context}`;
  }
  
  if (examples) {
    formattedPrompt += `\n\nExamples:\n${examples}`;
  }
  
  return formattedPrompt;
}