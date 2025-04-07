/**
 * Model Transition API
 * 
 * This module provides client-side functions for interacting with the model transition API.
 * It allows for seamless transitions between local and cloud models, monitoring model usage,
 * and adjusting settings for complexity thresholds.
 */

import { apiRequest, queryClient } from './queryClient';
import { ProcessorResponse, type ChatMessage } from '../../../server/types';

// Model type enum
export enum ModelType {
  LOCAL = 'local',
  CLOUD = 'cloud'
}

// Settings for model transition
export interface ModelTransitionSettings {
  sessionId: string;
  complexityThreshold: number;
  currentModelType: ModelType;
  cloudModelsAvailable: boolean;
  timestamp: number;
  updated?: boolean;
}

// Options for optimal message processing
export interface OptimalChatOptions {
  sessionId?: string;
  contextLevel?: 'minimal' | 'standard' | 'detailed';
  preserveContext?: boolean;
  forceModel?: ModelType;
}

/**
 * Get current model transition settings
 * @param sessionId Session identifier
 * @returns Model transition settings
 */
export async function getModelTransitionSettings(sessionId: string = 'default-session'): Promise<ModelTransitionSettings> {
  try {
    const res = await apiRequest(`/api/model/transition?sessionId=${sessionId}`);
    const data = await res.json();
    return data as ModelTransitionSettings;
  } catch (error) {
    console.error('Error fetching model transition settings:', error);
    throw error;
  }
}

/**
 * Update model transition settings
 * @param settings Settings to update
 * @returns Updated model transition settings
 */
export async function updateModelTransitionSettings(
  settings: {
    sessionId?: string;
    threshold?: number;
    forceModel?: ModelType;
  }
): Promise<ModelTransitionSettings> {
  try {
    const res = await apiRequest('/api/model/transition', 'POST', settings);
    const data = await res.json();
    return data as ModelTransitionSettings;
  } catch (error) {
    console.error('Error updating model transition settings:', error);
    throw error;
  }
}

/**
 * Process a message with automatic model selection
 * @param message Message to process
 * @param history Chat history
 * @param options Processing options
 * @returns Processed response
 */
export async function processWithOptimalModel(
  message: string,
  history: ChatMessage[] = [],
  options: OptimalChatOptions = {}
): Promise<ProcessorResponse> {
  try {
    const res = await apiRequest('/api/chat/optimal', 'POST', {
      message,
      history,
      options
    });
    const data = await res.json();
    return data as ProcessorResponse;
  } catch (error) {
    console.error('Error processing with optimal model:', error);
    throw error;
  }
}

/**
 * Force using a specific model type for the session
 * @param sessionId Session identifier
 * @param modelType Model type to force
 * @returns Updated model transition settings
 */
export async function forceModelType(
  sessionId: string = 'default-session',
  modelType: ModelType
): Promise<ModelTransitionSettings> {
  return updateModelTransitionSettings({
    sessionId,
    forceModel: modelType
  });
}

/**
 * Set complexity threshold for model transition
 * @param sessionId Session identifier
 * @param threshold Complexity threshold (0-1)
 * @returns Updated model transition settings
 */
export async function setComplexityThreshold(
  sessionId: string = 'default-session',
  threshold: number
): Promise<ModelTransitionSettings> {
  return updateModelTransitionSettings({
    sessionId,
    threshold: Math.max(0, Math.min(1, threshold)) // Ensure value is between 0 and 1
  });
}

/**
 * Reset all model transition settings to defaults
 * @param sessionId Session identifier
 * @returns Updated model transition settings
 */
export async function resetModelTransitionSettings(
  sessionId: string = 'default-session'
): Promise<ModelTransitionSettings> {
  return updateModelTransitionSettings({
    sessionId,
    threshold: 0.7, // Default threshold
    forceModel: undefined // No forced model
  });
}

/**
 * Get complex description of model transition status
 * @param settings Model transition settings
 * @returns Human-readable description
 */
export function getModelTransitionDescription(settings: ModelTransitionSettings): string {
  const { complexityThreshold, currentModelType, cloudModelsAvailable } = settings;
  
  let description = '';
  
  if (currentModelType === ModelType.LOCAL) {
    description += 'Currently using local model. ';
    
    if (cloudModelsAvailable) {
      description += `Will switch to cloud model for requests with complexity > ${(complexityThreshold * 100).toFixed(0)}%.`;
    } else {
      description += 'Cloud models are currently unavailable (API quota exceeded or rate limited).';
    }
  } else {
    description += 'Currently using cloud model. ';
    description += `Will switch to local model for requests with complexity < ${((complexityThreshold - 0.1) * 100).toFixed(0)}%.`;
  }
  
  return description;
}