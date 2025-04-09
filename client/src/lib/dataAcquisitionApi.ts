/**
 * Data Acquisition API Client
 * 
 * This module provides functions for interacting with the autonomous data acquisition API.
 */

import { apiRequest } from './queryClient';

// Data source types
export type DataSourceType = 'web' | 'api' | 'rss' | 'document' | 'custom';

// Data acquisition task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'scheduled';

// Data validation level
export type ValidationLevel = 'minimal' | 'standard' | 'strict';

// Data source interface
export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  url: string;
  description: string;
  credentials?: {
    apiKey?: string;
    username?: string;
    token?: string;
  };
  configuration: {
    scheduleFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
    customInterval?: number; // in minutes
    priority: 'low' | 'medium' | 'high';
    validationLevel: ValidationLevel;
    extractionRules?: Record<string, string>; // CSS selectors or JSON paths
    allowJavaScript?: boolean;
    timeout?: number; // in seconds
    maxItems?: number;
    headers?: Record<string, string>;
  };
  tags: string[];
  lastFetched: Date | null;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
}

// Data acquisition task interface
export interface DataAcquisitionTask {
  id: string;
  sourceId: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  created: Date;
  scheduled: Date;
  started: Date | null;
  completed: Date | null;
  error?: {
    message: string;
    details: string;
    recoverable: boolean;
  };
  result?: {
    itemsExtracted: number;
    itemsValid: number;
    itemsStored: number;
  };
  metadata: Record<string, any>;
}

// Extracted data item interface
export interface ExtractedData {
  id: string;
  sourceId: string;
  url: string;
  timestamp: Date;
  content: Record<string, any>;
  metadata: {
    title?: string;
    author?: string;
    publishDate?: Date;
    categories?: string[];
    language?: string;
    confidence?: number;
  };
  validationResult: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  processingStage: 'raw' | 'validated' | 'transformed' | 'stored';
}

// New data source definition
export type NewDataSource = Omit<DataSource, 'id' | 'createdAt' | 'updatedAt' | 'lastFetched'>;

/**
 * Get all data sources
 */
export async function getAllDataSources(): Promise<DataSource[]> {
  const response = await apiRequest('GET', '/api/acquisition/sources');
  const data = await response.json();
  return data.sources;
}

/**
 * Get a specific data source
 */
export async function getDataSource(id: string): Promise<DataSource> {
  const response = await apiRequest('GET', `/api/acquisition/sources/${id}`);
  return await response.json();
}

/**
 * Register a new data source
 */
export async function registerDataSource(source: NewDataSource): Promise<DataSource> {
  const response = await apiRequest('POST', '/api/acquisition/sources', source);
  const data = await response.json();
  return data.source;
}

/**
 * Update a data source
 */
export async function updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
  const response = await apiRequest('PATCH', `/api/acquisition/sources/${id}`, updates);
  const data = await response.json();
  return data.source;
}

/**
 * Enable a data source
 */
export async function enableDataSource(id: string): Promise<DataSource> {
  const response = await apiRequest('POST', `/api/acquisition/sources/${id}/enable`);
  const data = await response.json();
  return data.source;
}

/**
 * Disable a data source
 */
export async function disableDataSource(id: string): Promise<DataSource> {
  const response = await apiRequest('POST', `/api/acquisition/sources/${id}/disable`);
  const data = await response.json();
  return data.source;
}

/**
 * Delete a data source
 */
export async function deleteDataSource(id: string): Promise<{ success: boolean }> {
  const response = await apiRequest('DELETE', `/api/acquisition/sources/${id}`);
  const data = await response.json();
  return { success: data.message.includes('success') };
}

/**
 * Trigger data acquisition for a source
 */
export async function triggerAcquisition(id: string): Promise<DataAcquisitionTask> {
  const response = await apiRequest('POST', `/api/acquisition/sources/${id}/acquire`);
  const data = await response.json();
  return data.task;
}

/**
 * Get tasks for a data source
 */
export async function getTasksForSource(id: string): Promise<DataAcquisitionTask[]> {
  const response = await apiRequest('GET', `/api/acquisition/sources/${id}/tasks`);
  const data = await response.json();
  return data.tasks;
}

/**
 * Get extracted data for a source
 */
export async function getExtractedData(id: string): Promise<ExtractedData[]> {
  const response = await apiRequest('GET', `/api/acquisition/sources/${id}/data`);
  const data = await response.json();
  return data.data;
}

// Export data acquisition API functions
export const dataAcquisitionApi = {
  getAllDataSources,
  getDataSource,
  registerDataSource,
  updateDataSource,
  enableDataSource,
  disableDataSource,
  deleteDataSource,
  triggerAcquisition,
  getTasksForSource,
  getExtractedData
};