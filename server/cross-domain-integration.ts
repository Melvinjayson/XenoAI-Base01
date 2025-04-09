/**
 * Cross-Domain Integration System
 * 
 * This module provides capabilities to integrate data from external sources,
 * enrich the system's knowledge base, and synthesize insights:
 * - API integrations with various data providers
 * - Web scraping and content extraction
 * - Data transformation and filtering pipelines
 * - Knowledge base enrichment
 * - Automated insight generation
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';
import { generateStructuredCompletion } from './ai-service';
import * as errorRecovery from './error-recovery-system';
import { enhancedMemoryManager } from './enhanced-memory-manager';

// Supported external data source types
export enum DataSourceType {
  REST_API = 'rest_api',
  RSS_FEED = 'rss_feed',
  WEB_PAGE = 'web_page',
  JSON_ENDPOINT = 'json_endpoint',
  CSV_ENDPOINT = 'csv_endpoint',
  DATABASE = 'database'
}

// Data source configuration
export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  url: string;
  authType?: 'none' | 'api_key' | 'oauth' | 'basic';
  authConfig?: {
    apiKeyName?: string;
    apiKeyValue?: string;
    username?: string;
    password?: string;
    tokenUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
  dataPath?: string; // JSON path to extract data
  responseType?: 'json' | 'text' | 'xml' | 'html';
  transformFunction?: string; // Name of transformation function to apply
  schedule?: {
    frequency: 'once' | 'hourly' | 'daily' | 'weekly';
    lastRun?: Date;
    nextRun?: Date;
  };
  tags: string[];
  enabled: boolean;
}

// Data extraction result
export interface ExtractionResult {
  sourceId: string;
  sourceName: string;
  extractedAt: Date;
  data: any;
  metadata: {
    recordCount?: number;
    format: string;
    fields?: string[];
    sizeBytesApprox?: number;
  };
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

// Transformation pipeline step
interface TransformationStep {
  type: 'filter' | 'map' | 'sort' | 'group' | 'enrich' | 'validate' | 'deduplicate';
  config: any;
}

// Synthesis result containing insights
export interface SynthesisResult {
  id: string;
  timestamp: Date;
  sources: string[]; // Source IDs used
  insights: {
    type: 'trend' | 'anomaly' | 'correlation' | 'summary' | 'recommendation';
    title: string;
    description: string;
    confidence: number;
    supportingData?: any;
    tags: string[];
  }[];
  addedToKnowledgeBase: boolean;
}

// Registry of configured data sources
const dataSources: Map<string, DataSource> = new Map();

// Registry of extraction results
const extractionResults: Map<string, ExtractionResult[]> = new Map();

// Registry of transformation pipelines
const transformationPipelines: Map<string, TransformationStep[]> = new Map();

// Registry of synthesis results
const synthesisResults: SynthesisResult[] = [];

/**
 * Register a new data source
 */
export function registerDataSource(source: DataSource): DataSource {
  // Validate the data source
  if (!source.id || !source.name || !source.type || !source.url) {
    throw new Error('Data source must have id, name, type, and url properties');
  }
  
  // Generate an ID if not provided
  if (!source.id) {
    source.id = `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set default values
  if (!source.tags) source.tags = [];
  if (!source.responseType) {
    // Guess response type from URL or type
    if (source.url.endsWith('.json') || source.type === DataSourceType.JSON_ENDPOINT) {
      source.responseType = 'json';
    } else if (source.url.endsWith('.xml') || source.url.includes('rss')) {
      source.responseType = 'xml';
    } else if (source.url.endsWith('.csv') || source.type === DataSourceType.CSV_ENDPOINT) {
      source.responseType = 'text';
    } else {
      source.responseType = 'html';
    }
  }
  
  if (source.schedule && !source.schedule.lastRun) {
    source.schedule.lastRun = new Date(0); // Beginning of epoch time
    
    // Set next run based on frequency
    const now = new Date();
    switch (source.schedule.frequency) {
      case 'once':
        source.schedule.nextRun = now;
        break;
      case 'hourly':
        source.schedule.nextRun = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'daily':
        source.schedule.nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        source.schedule.nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
    }
  }
  
  // Store the source
  dataSources.set(source.id, source);
  console.log(`Registered data source: ${source.name} (${source.id})`);
  
  return source;
}

/**
 * Get a registered data source
 */
export function getDataSource(id: string): DataSource | undefined {
  return dataSources.get(id);
}

/**
 * List all registered data sources, optionally filtered by tags
 */
export function listDataSources(tags?: string[]): DataSource[] {
  let sources = Array.from(dataSources.values());
  
  if (tags && tags.length > 0) {
    sources = sources.filter(source => {
      return tags.some(tag => source.tags.includes(tag));
    });
  }
  
  return sources;
}

/**
 * Remove a data source
 */
export function removeDataSource(id: string): boolean {
  return dataSources.delete(id);
}

/**
 * Extract data from a data source
 */
export async function extractData(sourceId: string): Promise<ExtractionResult> {
  const source = dataSources.get(sourceId);
  if (!source) {
    throw new Error(`Data source with ID ${sourceId} not found`);
  }
  
  if (!source.enabled) {
    throw new Error(`Data source ${source.name} is disabled`);
  }
  
  console.log(`Extracting data from ${source.name} (${source.type})`);
  
  // Create a result object
  const result: ExtractionResult = {
    sourceId: source.id,
    sourceName: source.name,
    extractedAt: new Date(),
    data: null,
    metadata: {
      format: source.responseType || 'unknown',
      sizeBytesApprox: 0
    },
    status: 'failed'
  };
  
  try {
    // Configure request options
    const options: any = {
      method: 'GET',
      url: source.url,
      responseType: source.responseType || 'json',
      timeout: 30000 // 30 seconds timeout
    };
    
    // Add authentication if configured
    if (source.authType && source.authConfig) {
      switch (source.authType) {
        case 'api_key':
          if (source.authConfig.apiKeyName && source.authConfig.apiKeyValue) {
            // Check if it should be in header or query param (default to header)
            if (source.authConfig.apiKeyName.startsWith('Authorization')) {
              options.headers = {
                [source.authConfig.apiKeyName]: source.authConfig.apiKeyValue
              };
            } else {
              // Assume query parameter
              options.params = {
                [source.authConfig.apiKeyName]: source.authConfig.apiKeyValue
              };
            }
          }
          break;
          
        case 'basic':
          if (source.authConfig.username && source.authConfig.password) {
            options.auth = {
              username: source.authConfig.username,
              password: source.authConfig.password
            };
          }
          break;
          
        // OAuth would be more complex and require token management
        case 'oauth':
          // Simplified OAuth implementation (would need more complex logic in production)
          console.log('OAuth authentication not fully implemented');
          break;
      }
    }
    
    // Make the request
    const response = await errorRecovery.withErrorHandling(
      () => axios(options),
      'cross-domain-integration',
      `extract-data-${source.type}`
    )();
    
    // Process the response based on type
    switch (source.type) {
      case DataSourceType.REST_API:
      case DataSourceType.JSON_ENDPOINT:
        result.data = response.data;
        
        // Extract data using the specified path if provided
        if (source.dataPath) {
          result.data = extractNestedData(response.data, source.dataPath);
        }
        break;
        
      case DataSourceType.RSS_FEED:
        // Parse the RSS feed to extract items
        result.data = parseRssFeed(response.data);
        break;
        
      case DataSourceType.WEB_PAGE:
        // Extract content from the web page
        result.data = extractWebPageContent(response.data, source.url);
        break;
        
      case DataSourceType.CSV_ENDPOINT:
        // Parse CSV data
        result.data = parseCsvData(response.data);
        break;
        
      case DataSourceType.DATABASE:
        // Database connections would require more specific handling
        console.log('Database extraction not fully implemented');
        break;
    }
    
    // Apply transformation functions if specified
    if (source.transformFunction) {
      // Safer approach than using window[] which is not available in Node.js
      try {
        // Use a predefined set of transformation functions (implement these as needed)
        const transformFunctions: Record<string, (data: any) => any> = {
          'formatDates': (data: any) => data, // Implementation placeholder
          'normalizeFields': (data: any) => data, // Implementation placeholder
          'filterDuplicates': (data: any) => data, // Implementation placeholder
        };
        
        if (source.transformFunction in transformFunctions) {
          result.data = transformFunctions[source.transformFunction](result.data);
        }
      } catch (error) {
        console.error(`Error applying transformation function: ${error}`);
      }
    }
    
    // Update metadata
    if (Array.isArray(result.data)) {
      result.metadata.recordCount = result.data.length;
      if (result.data.length > 0 && typeof result.data[0] === 'object') {
        result.metadata.fields = Object.keys(result.data[0]);
      }
    } else if (result.data && typeof result.data === 'object') {
      result.metadata.fields = Object.keys(result.data);
    }
    
    result.metadata.sizeBytesApprox = JSON.stringify(result.data).length;
    result.status = 'success';
    
    // Store the result
    const previousResults = extractionResults.get(source.id) || [];
    extractionResults.set(source.id, [...previousResults, result]);
    
    // Update schedule if needed
    if (source.schedule) {
      source.schedule.lastRun = new Date();
      
      // Calculate next run
      const now = new Date();
      switch (source.schedule.frequency) {
        case 'once':
          source.schedule.nextRun = undefined; // Won't run again
          break;
        case 'hourly':
          source.schedule.nextRun = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'daily':
          source.schedule.nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          source.schedule.nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
      }
      
      // Update the source
      dataSources.set(source.id, source);
    }
    
    console.log(`Successfully extracted data from ${source.name} (${result.metadata.recordCount || 'unknown'} records)`);
    return result;
    
  } catch (error) {
    const errorMessage = `Error extracting data from ${source.name}: ${(error as Error).message}`;
    console.error(errorMessage);
    
    result.status = 'failed';
    result.error = errorMessage;
    
    // Store the failed result
    const previousResults = extractionResults.get(source.id) || [];
    extractionResults.set(source.id, [...previousResults, result]);
    
    throw error;
  }
}

/**
 * Helper function to extract nested data using a path string (e.g., "data.items.0.values")
 */
function extractNestedData(data: any, path: string): any {
  const parts = path.split('.');
  let result = data;
  
  for (const part of parts) {
    if (result === null || result === undefined) {
      return undefined;
    }
    
    // Handle array indices
    if (!isNaN(Number(part))) {
      const index = Number(part);
      if (Array.isArray(result) && index < result.length) {
        result = result[index];
      } else {
        return undefined;
      }
    } else {
      // Use safe indexing with type assertion
      result = (result as Record<string, any>)[part];
    }
  }
  
  return result;
}

/**
 * Helper function to parse RSS feeds
 */
function parseRssFeed(xmlData: string): any[] {
  try {
    // Basic RSS parsing using DOM (a more robust parser would be used in production)
    const dom = new JSDOM(xmlData, { contentType: 'text/xml' });
    const items = dom.window.document.querySelectorAll('item');
    
    const result = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry: any = {};
      
      // Extract common RSS fields
      const title = item.querySelector('title');
      if (title) entry.title = title.textContent;
      
      const link = item.querySelector('link');
      if (link) entry.link = link.textContent;
      
      const description = item.querySelector('description');
      if (description) entry.description = description.textContent;
      
      const pubDate = item.querySelector('pubDate');
      if (pubDate) entry.publishDate = new Date(pubDate.textContent || '');
      
      // Add other fields as needed
      result.push(entry);
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return [];
  }
}

/**
 * Helper function to extract content from web pages
 */
function extractWebPageContent(htmlData: string, url: string): any {
  try {
    const dom = new JSDOM(htmlData, { url });
    const document = dom.window.document;
    
    // Extract key content
    const title = document.querySelector('title')?.textContent || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    
    // Get main content (prioritize article or main tags)
    let mainContent = document.querySelector('article, main, #content, .content');
    if (!mainContent) {
      // Fallback to body
      mainContent = document.body;
    }
    
    // Extract headings
    const headings: {level: number; text: string}[] = [];
    const headingElements = mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headingElements.forEach((el: Element) => {
      const level = parseInt(el.tagName.substring(1));
      headings.push({
        level,
        text: el.textContent || ''
      });
    });
    
    // Extract paragraphs
    const paragraphs: string[] = [];
    const paragraphElements = mainContent.querySelectorAll('p');
    paragraphElements.forEach((el: Element) => {
      const text = el.textContent?.trim();
      if (text && text.length > 20) { // Skip short paragraphs
        paragraphs.push(text);
      }
    });
    
    // Extract links
    const links: {url: string; text: string}[] = [];
    const linkElements = mainContent.querySelectorAll('a');
    linkElements.forEach((el: Element) => {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push({
          url: new URL(href, url).href, // Resolve relative URLs
          text: el.textContent || ''
        });
      }
    });
    
    // Extract images
    const images: {url: string; alt: string}[] = [];
    const imageElements = mainContent.querySelectorAll('img');
    imageElements.forEach((el: Element) => {
      const src = el.getAttribute('src');
      if (src) {
        images.push({
          url: new URL(src, url).href, // Resolve relative URLs
          alt: el.getAttribute('alt') || ''
        });
      }
    });
    
    // Return structured content
    return {
      url,
      title,
      description: metaDescription,
      headings,
      paragraphs,
      links,
      images,
      extractedText: paragraphs.join('\n\n')
    };
  } catch (error) {
    console.error('Error extracting web page content:', error);
    return {
      url,
      error: String(error)
    };
  }
}

/**
 * Helper function to parse CSV data
 */
function parseCsvData(csvText: string): any[] {
  try {
    // Simple CSV parser (a more robust parser would be used in production)
    const lines = csvText.split('\n');
    if (lines.length === 0) return [];
    
    // Assume first line is header
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(v => v.trim());
      const record: any = {};
      
      headers.forEach((header, index) => {
        if (index < values.length) {
          record[header] = values[index];
        }
      });
      
      results.push(record);
    }
    
    return results;
  } catch (error) {
    console.error('Error parsing CSV data:', error);
    return [];
  }
}

/**
 * Create a transformation pipeline
 */
export function createTransformationPipeline(
  id: string,
  steps: TransformationStep[]
): string {
  if (!id) {
    id = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  transformationPipelines.set(id, steps);
  return id;
}

/**
 * Get a transformation pipeline
 */
export function getTransformationPipeline(id: string): TransformationStep[] | undefined {
  return transformationPipelines.get(id);
}

/**
 * Apply a transformation pipeline to data
 */
export function applyTransformation(
  pipelineId: string | null,
  data: any[],
  inlinePipeline?: TransformationStep[]
): any[] {
  let pipeline: TransformationStep[];
  
  if (inlinePipeline) {
    // Use the provided inline pipeline
    pipeline = inlinePipeline;
  } else if (pipelineId) {
    // Use a stored pipeline
    const storedPipeline = transformationPipelines.get(pipelineId);
    if (!storedPipeline) {
      throw new Error(`Transformation pipeline with ID ${pipelineId} not found`);
    }
    pipeline = storedPipeline;
  } else {
    throw new Error('Either a pipeline ID or an inline pipeline must be provided');
  }
  
  let result = [...data]; // Create a copy to avoid modifying the original
  
  // Apply each step in sequence
  for (const step of pipeline) {
    switch (step.type) {
      case 'filter':
        // Filter records based on criteria
        if (step.config.field && step.config.operator && step.config.value !== undefined) {
          result = result.filter(item => {
            const fieldValue = (item as Record<string, any>)[step.config.field];
            
            switch (step.config.operator) {
              case 'equals': return fieldValue === step.config.value;
              case 'notEquals': return fieldValue !== step.config.value;
              case 'contains': return String(fieldValue).includes(step.config.value);
              case 'startsWith': return String(fieldValue).startsWith(step.config.value);
              case 'endsWith': return String(fieldValue).endsWith(step.config.value);
              case 'greaterThan': return fieldValue > step.config.value;
              case 'lessThan': return fieldValue < step.config.value;
              case 'exists': return fieldValue !== undefined && fieldValue !== null;
              default: return true;
            }
          });
        }
        break;
        
      case 'map':
        // Transform each record
        if (step.config.mappings) {
          result = result.map(item => {
            const newItem: any = {};
            
            // Apply field mappings
            for (const [targetField, sourceField] of Object.entries(step.config.mappings)) {
              if (typeof sourceField === 'string') {
                // Simple mapping
                newItem[targetField] = (item as Record<string, any>)[sourceField as string];
              } else if (typeof sourceField === 'object' && sourceField !== null && 'function' in sourceField) {
                // Function mapping
                switch (sourceField.function) {
                  case 'concat':
                    if ('fields' in sourceField && Array.isArray(sourceField.fields)) {
                      newItem[targetField] = sourceField.fields
                        .map((f: string) => (item as Record<string, any>)[f])
                        .join(('separator' in sourceField) ? sourceField.separator as string : ' ');
                    }
                    break;
                  case 'dateFormat':
                    if ('field' in sourceField) {
                      newItem[targetField] = new Date((item as Record<string, any>)[sourceField.field as string]).toLocaleDateString();
                    }
                    break;
                  // Add more functions as needed
                }
              }
            }
            
            // Copy fields not in the mapping if specified
            if (step.config.preserveOtherFields) {
              for (const key of Object.keys(item)) {
                if (newItem[key] === undefined) {
                  newItem[key] = (item as Record<string, any>)[key];
                }
              }
            }
            
            return newItem;
          });
        }
        break;
        
      case 'sort':
        // Sort records
        if (step.config.field) {
          result.sort((a, b) => {
            let aVal = (a as Record<string, any>)[step.config.field];
            let bVal = (b as Record<string, any>)[step.config.field];
            
            // Handle string comparison
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              if (step.config.ignoreCase) {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
              }
              
              return step.config.descending
                ? bVal.localeCompare(aVal)
                : aVal.localeCompare(bVal);
            }
            
            // Handle numeric comparison
            return step.config.descending
              ? (bVal - aVal)
              : (aVal - bVal);
          });
        }
        break;
        
      case 'group':
        // Group records
        if (step.config.field) {
          const groups: {[key: string]: any[]} = {};
          
          // Group by the specified field
          for (const item of result) {
            const groupKey = String((item as Record<string, any>)[step.config.field]);
            if (!groups[groupKey]) {
              groups[groupKey] = [];
            }
            groups[groupKey].push(item);
          }
          
          // Transform into desired output format
          if (step.config.outputFormat === 'array') {
            // Array of groups with key and items
            result = Object.entries(groups).map(([key, items]) => ({
              key,
              count: items.length,
              items
            }));
          } else if (step.config.outputFormat === 'object') {
            // Object with keys mapping to item arrays
            // Cast the object to any[] for compatibility
            result = Object.values(groups).flat() as any[];
          }
        }
        break;
        
      case 'deduplicate':
        // Remove duplicates
        if (step.config.fields && step.config.fields.length > 0) {
          const seen = new Set();
          result = result.filter(item => {
            // Create a key based on specified fields
            const key = step.config.fields
              .map((field: string) => (item as Record<string, any>)[field])
              .join('|');
              
            if (seen.has(key)) {
              return false; // Duplicate
            }
            
            seen.add(key);
            return true;
          });
        }
        break;
        
      // Add more transformation types as needed
    }
  }
  
  return result;
}

/**
 * Synthesize insights from extracted data
 */
export async function synthesizeInsights(
  sourceIds: string[],
  options: {
    maxInsights?: number;
    confidenceThreshold?: number;
    addToKnowledgeBase?: boolean;
  } = {}
): Promise<SynthesisResult> {
  // Set default options
  const finalOptions = {
    maxInsights: options.maxInsights || 5,
    confidenceThreshold: options.confidenceThreshold || 0.7,
    addToKnowledgeBase: options.addToKnowledgeBase !== false
  };
  
  // Check if we have valid sources
  if (!sourceIds || sourceIds.length === 0) {
    throw new Error('At least one source ID is required');
  }
  
  // Collect data from sources
  const sourcesData: {sourceId: string; sourceName: string; data: any}[] = [];
  
  for (const sourceId of sourceIds) {
    const source = dataSources.get(sourceId);
    if (!source) {
      continue; // Skip invalid sources
    }
    
    const results = extractionResults.get(sourceId);
    if (!results || results.length === 0) {
      continue; // Skip sources with no results
    }
    
    // Get the most recent successful result
    const latestResult = results
      .filter(r => r.status === 'success')
      .sort((a, b) => b.extractedAt.getTime() - a.extractedAt.getTime())[0];
      
    if (latestResult) {
      sourcesData.push({
        sourceId,
        sourceName: source.name,
        data: latestResult.data
      });
    }
  }
  
  if (sourcesData.length === 0) {
    throw new Error('No valid data found for the specified sources');
  }
  
  // Create a synthesis result
  const synthesisResult: SynthesisResult = {
    id: `synthesis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    sources: sourceIds,
    insights: [],
    addedToKnowledgeBase: false
  };
  
  try {
    // Prepare data for AI analysis
    const dataForAnalysis = sourcesData.map(s => ({
      source: s.sourceName,
      data: s.data
    }));
    
    // Get insights through AI
    const insights = await generateInsightsFromData(dataForAnalysis);
    
    // Filter insights based on confidence threshold
    synthesisResult.insights = insights
      .filter(insight => insight.confidence >= finalOptions.confidenceThreshold)
      .slice(0, finalOptions.maxInsights);
    
    // Add insights to knowledge base if requested
    if (finalOptions.addToKnowledgeBase) {
      await addInsightsToKnowledgeBase(synthesisResult);
      synthesisResult.addedToKnowledgeBase = true;
    }
    
    // Store the synthesis result
    synthesisResults.push(synthesisResult);
    
    return synthesisResult;
  } catch (error) {
    console.error('Error synthesizing insights:', error);
    
    // Store even failed synthesis attempts
    synthesisResults.push(synthesisResult);
    
    throw error;
  }
}

/**
 * Generate insights from data using AI
 */
async function generateInsightsFromData(
  sourcesData: {source: string; data: any}[]
): Promise<SynthesisResult['insights']> {
  try {
    // Create a simplified version of each source's data for analysis
    const processedData = sourcesData.map(source => {
      let simplifiedData;
      
      if (Array.isArray(source.data)) {
        // If it's an array, include basic stats and a sample
        const sample = source.data.slice(0, 5);
        simplifiedData = {
          type: 'array',
          count: source.data.length,
          sample,
          fields: sample.length > 0 ? Object.keys(sample[0] || {}) : []
        };
      } else if (source.data && typeof source.data === 'object') {
        // If it's an object with extracted web content
        if (source.data.title && source.data.paragraphs) {
          simplifiedData = {
            type: 'web_content',
            title: source.data.title,
            description: source.data.description,
            paragraphs: source.data.paragraphs.slice(0, 3),
            headingCount: source.data.headings?.length || 0
          };
        } else {
          // Regular object
          simplifiedData = {
            type: 'object',
            fields: Object.keys(source.data),
            sample: source.data
          };
        }
      } else {
        // Other types
        simplifiedData = {
          type: typeof source.data,
          value: source.data
        };
      }
      
      return {
        source: source.source,
        data: simplifiedData
      };
    });
    
    // Prepare the prompt for the AI
    const prompt = `
      Generate insights from the following data sources:
      
      ${JSON.stringify(processedData, null, 2)}
      
      Identify trends, patterns, anomalies, correlations, or key takeaways from this data.
      Return a set of insights with confidence levels.
    `;
    
    // System message to guide the AI
    const systemMessage = `
      You are an expert data analyst tasked with finding insights in data.
      Analyze the provided data sources carefully and generate meaningful insights.
      For each insight:
      - Assign a specific type (trend, anomaly, correlation, summary, or recommendation)
      - Provide a clear title
      - Include a detailed description
      - Assign an appropriate confidence level (0-100)
      - Add relevant tags
      
      Only include insights that are directly supported by the data.
      Prioritize quality over quantity.
    `;
    
    let response;
    
    // Check for OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      // Use the AI service to generate insights
      response = await generateStructuredCompletion<{insights: any[]}>(
        prompt,
        'gpt-4o',
        0.7,
        1500,
        systemMessage
      );
    } else {
      // For testing: Generate sample insights without API call
      console.log('No OpenAI API key found, using sample insights for testing');
      response = {
        insights: [
          {
            type: 'summary',
            title: 'Data Overview',
            description: `Analyzed data from ${sourcesData.length} sources, containing structured information that can be used for further analysis.`,
            confidence: 95,
            tags: ['overview', 'data_summary']
          },
          {
            type: 'recommendation',
            title: 'Data Integration Opportunity',
            description: 'The data structure suggests opportunities for integration and correlation between multiple sources.',
            confidence: 80,
            tags: ['integration', 'opportunity']
          }
        ]
      };
    }
    
    // Process and refine the insights
    return response.insights.map(insight => ({
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence / 100, // Convert to 0-1 scale
      supportingData: insight.supportingData,
      tags: insight.tags || []
    }));
  } catch (error) {
    console.error('Error generating insights from data:', error);
    
    // Return a minimal fallback insight
    return [{
      type: 'summary',
      title: 'Data Summary (System Generated)',
      description: `Analyzed ${sourcesData.length} data sources. Unable to generate detailed insights due to an error.`,
      confidence: 0.5,
      tags: ['system_generated', 'fallback']
    }];
  }
}

/**
 * Add insights to the knowledge base
 */
async function addInsightsToKnowledgeBase(result: SynthesisResult): Promise<void> {
  try {
    // Generate a consolidated memory entry from the insights
    const memoryContent = result.insights.map(insight => 
      `${insight.type.toUpperCase()}: ${insight.title} - ${insight.description}`
    ).join('\n\n');
    
    // Generate a set of entities from the insights
    const entities = new Set<string>();
    result.insights.forEach(insight => {
      // Extract potential entities from title and description
      const text = `${insight.title} ${insight.description}`;
      const potentialEntities = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      potentialEntities.forEach(entity => entities.add(entity));
    });
    
    // Generate topics from the insight types and tags
    const topics = new Set<string>();
    result.insights.forEach(insight => {
      topics.add(insight.type);
      insight.tags.forEach(tag => topics.add(tag));
    });
    
    try {
      // Check if enhancedMemoryManager is available
      if (typeof enhancedMemoryManager !== 'undefined' && enhancedMemoryManager.addMemory) {
        // Add to the memory manager
        await enhancedMemoryManager.addMemory(
          memoryContent,
          result.id, // Use synthesis ID as session ID
          'semantic', // Store as semantic memory (long-term insights)
          Array.from(entities),
          Array.from(topics)
        );
      } else {
        // For testing: Log instead of storing
        console.log('Enhanced Memory Manager not available, logging insights instead:');
        console.log(`- Memory Content: ${memoryContent.substring(0, 150)}...`);
        console.log(`- Entities: ${Array.from(entities).join(', ')}`);
        console.log(`- Topics: ${Array.from(topics).join(', ')}`);
      }
    } catch (memError) {
      console.warn('Could not add to memory manager:', memError);
      // Continue without failing the whole operation
    }
    
    console.log(`Added ${result.insights.length} insights to knowledge base with ID ${result.id}`);
  } catch (error) {
    console.error('Error adding insights to knowledge base:', error);
    throw error;
  }
}

/**
 * Get all synthesis results
 */
export function getSynthesisResults(): SynthesisResult[] {
  return [...synthesisResults];
}

/**
 * Get recent extraction results for a data source
 */
export function getExtractionResults(sourceId: string, limit?: number): ExtractionResult[] {
  const results = extractionResults.get(sourceId) || [];
  
  // Sort by extracted date (newest first)
  const sorted = [...results].sort((a, b) => 
    b.extractedAt.getTime() - a.extractedAt.getTime()
  );
  
  // Limit if requested
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Initialize the cross-domain integration system
 */
export function initializeCrossDomainIntegration(): void {
  console.log('Initializing Cross-Domain Integration system...');
  
  // Register default pipelines
  createTransformationPipeline('basic_cleaning', [
    {
      type: 'filter',
      config: {
        field: 'title', 
        operator: 'exists'
      }
    },
    {
      type: 'deduplicate',
      config: {
        fields: ['title']
      }
    }
  ]);
  
  console.log('Cross-Domain Integration system initialized');
}