/**
 * Autonomous Data Acquisition System
 * 
 * This module provides functionality for autonomous data gathering from various sources:
 * - Web scraping/crawling for online content
 * - External API integrations for structured data
 * - Automated validation and cleansing of acquired data
 * - Smart scheduling and prioritization of data acquisition tasks
 */

import { errorRecoverySystem } from './error-recovery-system';
import { enhancedMemoryManager } from './enhanced-memory-manager';
import { generateStructuredCompletion } from './ai-service';
import { v4 as uuidv4 } from 'uuid';

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

// Extraction rule interface
export interface ExtractionRule {
  id: string;
  name: string;
  selector: string; // CSS selector or JSON path
  attribute?: string; // For web scraping
  transformations?: Array<{
    type: 'replace' | 'regex' | 'trim' | 'lowercase' | 'uppercase' | 'custom';
    params?: Record<string, any>;
  }>;
  required: boolean;
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

/**
 * In-memory storage for this implementation
 */
class AutonomousDataStore {
  private dataSources: Map<string, DataSource>;
  private extractedData: Map<string, ExtractedData>;
  private tasks: Map<string, DataAcquisitionTask>;
  
  constructor() {
    this.dataSources = new Map();
    this.extractedData = new Map();
    this.tasks = new Map();
  }
  
  // Data sources
  public getDataSource(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }
  
  public getAllDataSources(): DataSource[] {
    return Array.from(this.dataSources.values());
  }
  
  public addDataSource(source: DataSource): DataSource {
    this.dataSources.set(source.id, source);
    return source;
  }
  
  public updateDataSource(id: string, data: Partial<DataSource>): DataSource | undefined {
    const source = this.dataSources.get(id);
    if (!source) return undefined;
    
    const updated = { ...source, ...data, updatedAt: new Date() };
    this.dataSources.set(id, updated);
    return updated;
  }
  
  public removeDataSource(id: string): boolean {
    return this.dataSources.delete(id);
  }
  
  // Extracted data
  public getExtractedData(id: string): ExtractedData | undefined {
    return this.extractedData.get(id);
  }
  
  public getExtractedDataBySource(sourceId: string): ExtractedData[] {
    return Array.from(this.extractedData.values())
      .filter(data => data.sourceId === sourceId);
  }
  
  public addExtractedData(data: ExtractedData): ExtractedData {
    this.extractedData.set(data.id, data);
    return data;
  }
  
  public removeExtractedData(id: string): boolean {
    return this.extractedData.delete(id);
  }
  
  // Tasks
  public getTask(id: string): DataAcquisitionTask | undefined {
    return this.tasks.get(id);
  }
  
  public getTasksByStatus(status: TaskStatus): DataAcquisitionTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status);
  }
  
  public getTasksBySource(sourceId: string): DataAcquisitionTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.sourceId === sourceId);
  }
  
  public addTask(task: DataAcquisitionTask): DataAcquisitionTask {
    this.tasks.set(task.id, task);
    return task;
  }
  
  public updateTask(id: string, data: Partial<DataAcquisitionTask>): DataAcquisitionTask | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updated = { ...task, ...data };
    this.tasks.set(id, updated);
    return updated;
  }
  
  public removeTask(id: string): boolean {
    return this.tasks.delete(id);
  }
}

/**
 * Main class for Autonomous Data Acquisition
 */
export class AutonomousDataAcquisition {
  private store: AutonomousDataStore;
  private taskQueue: DataAcquisitionTask[];
  private isProcessing: boolean;
  private taskProcessingInterval: NodeJS.Timeout | null;
  
  constructor() {
    this.store = new AutonomousDataStore();
    this.taskQueue = [];
    this.isProcessing = false;
    this.taskProcessingInterval = null;
    this.initialize();
  }
  
  /**
   * Initialize the system
   */
  private initialize(): void {
    // Start task processing scheduler
    this.taskProcessingInterval = setInterval(() => this.processNextTask(), 5000);
    
    console.log('Autonomous Data Acquisition system initialized');
  }
  
  /**
   * Register a new data source
   */
  public async registerDataSource(sourceDef: Omit<DataSource, 'id' | 'createdAt' | 'updatedAt' | 'lastFetched'>): Promise<DataSource> {
    try {
      // Create new data source
      const now = new Date();
      const newSource: DataSource = {
        ...sourceDef,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        lastFetched: null
      };
      
      // Validate the source configuration
      this.validateSourceConfiguration(newSource);
      
      // Add to store
      const source = this.store.addDataSource(newSource);
      
      // Create initial acquisition task if source is enabled
      if (source.enabled) {
        await this.scheduleAcquisitionTask(source.id, 'medium');
      }
      
      return source;
    } catch (error) {
      console.error('Error registering data source:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `data_source_register_error_${Date.now()}`,
        type: 'data_acquisition_error',
        message: `Error registering data source: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        severity: 'error'
      });
      
      throw error;
    }
  }
  
  /**
   * Validate source configuration
   */
  private validateSourceConfiguration(source: DataSource): void {
    // Check required fields
    if (!source.url) {
      throw new Error('URL is required for data source');
    }
    
    if (!source.type) {
      throw new Error('Type is required for data source');
    }
    
    // Check type-specific requirements
    if (source.type === 'api' && !source.credentials) {
      throw new Error('API credentials are required for API data sources');
    }
    
    // Set default configuration values if not specified
    if (!source.configuration.validationLevel) {
      source.configuration.validationLevel = 'standard';
    }
    
    if (!source.configuration.timeout) {
      source.configuration.timeout = 30; // 30 seconds default
    }
    
    if (source.configuration.timeout > 300) {
      throw new Error('Timeout cannot exceed 300 seconds (5 minutes)');
    }
  }
  
  /**
   * Schedule a data acquisition task
   */
  public async scheduleAcquisitionTask(
    sourceId: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    scheduledTime: Date = new Date()
  ): Promise<DataAcquisitionTask> {
    try {
      // Get the data source
      const source = this.store.getDataSource(sourceId);
      if (!source) {
        throw new Error(`Data source not found: ${sourceId}`);
      }
      
      // Create task
      const task: DataAcquisitionTask = {
        id: uuidv4(),
        sourceId,
        status: 'scheduled',
        priority,
        created: new Date(),
        scheduled: scheduledTime,
        started: null,
        completed: null,
        metadata: {
          sourceName: source.name,
          sourceType: source.type
        }
      };
      
      // Add to store and queue
      const addedTask = this.store.addTask(task);
      this.taskQueue.push(addedTask);
      
      // Sort queue by priority and scheduled time
      this.sortTaskQueue();
      
      return addedTask;
    } catch (error) {
      console.error('Error scheduling acquisition task:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `task_schedule_error_${Date.now()}`,
        type: 'data_acquisition_error',
        message: `Error scheduling acquisition task: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { sourceId },
        timestamp: new Date(),
        severity: 'error'
      });
      
      throw error;
    }
  }
  
  /**
   * Sort the task queue by priority and scheduled time
   */
  private sortTaskQueue(): void {
    const priorityWeight = {
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    this.taskQueue.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by scheduled time
      return a.scheduled.getTime() - b.scheduled.getTime();
    });
  }
  
  /**
   * Process the next task in the queue
   */
  private async processNextTask(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get the next task
      const task = this.taskQueue.shift();
      if (!task) {
        this.isProcessing = false;
        return;
      }
      
      // Update task status
      task.status = 'in_progress';
      task.started = new Date();
      this.store.updateTask(task.id, { status: task.status, started: task.started });
      
      // Get the data source
      const source = this.store.getDataSource(task.sourceId);
      if (!source) {
        throw new Error(`Data source not found: ${task.sourceId}`);
      }
      
      console.log(`Processing data acquisition task for source: ${source.name}`);
      
      // Acquire data based on source type
      let extractedItems: ExtractedData[] = [];
      
      switch (source.type) {
        case 'web':
          extractedItems = await this.scrapeWebContent(source);
          break;
        case 'api':
          extractedItems = await this.fetchFromApi(source);
          break;
        case 'rss':
          extractedItems = await this.fetchFromRss(source);
          break;
        default:
          throw new Error(`Unsupported data source type: ${source.type}`);
      }
      
      // Validate the extracted data
      const validatedItems = await this.validateExtractedData(extractedItems, source);
      
      // Store the validated data
      const storedItems = await this.storeExtractedData(validatedItems);
      
      // Update the task as completed
      const result = {
        itemsExtracted: extractedItems.length,
        itemsValid: validatedItems.length,
        itemsStored: storedItems.length
      };
      
      task.status = 'completed';
      task.completed = new Date();
      task.result = result;
      
      this.store.updateTask(task.id, {
        status: task.status,
        completed: task.completed,
        result
      });
      
      // Update the data source lastFetched timestamp
      this.store.updateDataSource(source.id, {
        lastFetched: new Date()
      });
      
      // If the source has a schedule, create the next task
      if (source.configuration.scheduleFrequency) {
        const nextRunTime = this.calculateNextRunTime(source);
        await this.scheduleAcquisitionTask(
          source.id,
          source.configuration.priority,
          nextRunTime
        );
      }
      
      console.log(`Completed data acquisition task for source: ${source.name}`);
      console.log(`Extracted: ${result.itemsExtracted}, Valid: ${result.itemsValid}, Stored: ${result.itemsStored}`);
    } catch (error) {
      console.error('Error processing acquisition task:', error);
      
      // Log the error
      errorRecoverySystem.logError({
        id: `task_processing_error_${Date.now()}`,
        type: 'data_acquisition_error',
        message: `Error processing acquisition task: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        severity: 'error'
      });
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Calculate the next run time based on source schedule
   */
  private calculateNextRunTime(source: DataSource): Date {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (source.configuration.scheduleFrequency) {
      case 'hourly':
        nextRun.setHours(now.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        break;
      case 'custom':
        if (source.configuration.customInterval) {
          nextRun.setMinutes(now.getMinutes() + source.configuration.customInterval);
        } else {
          // Default to daily if custom interval not specified
          nextRun.setDate(now.getDate() + 1);
        }
        break;
      default:
        // Default to daily
        nextRun.setDate(now.getDate() + 1);
    }
    
    return nextRun;
  }
  
  /**
   * Scrape content from a web page
   */
  private async scrapeWebContent(source: DataSource): Promise<ExtractedData[]> {
    console.log(`Simulating web scraping for: ${source.url}`);
    
    // In a real implementation, this would use a library like Puppeteer, Cheerio, or Playwright
    // For this demonstration, we'll create a simulated result
    
    const extractedItems: ExtractedData[] = [];
    
    // Simulate extracting a few items
    const numItems = Math.floor(Math.random() * 5) + 1;
    
    for (let i = 0; i < numItems; i++) {
      const item: ExtractedData = {
        id: uuidv4(),
        sourceId: source.id,
        url: `${source.url}/${i}`,
        timestamp: new Date(),
        content: {
          title: `Extracted content ${i + 1} from ${source.name}`,
          body: `This is simulated content ${i + 1} extracted from ${source.name}. In a real implementation, this would contain actual scraped content.`,
          metadata: {
            category: source.tags[0] || 'general',
            author: 'Autonomous System'
          }
        },
        metadata: {
          title: `Extracted content ${i + 1}`,
          author: 'System',
          publishDate: new Date(),
          categories: source.tags,
          language: 'en',
          confidence: 0.85
        },
        validationResult: {
          valid: true
        },
        processingStage: 'raw'
      };
      
      extractedItems.push(item);
    }
    
    return extractedItems;
  }
  
  /**
   * Fetch data from an API
   */
  private async fetchFromApi(source: DataSource): Promise<ExtractedData[]> {
    console.log(`Simulating API fetch for: ${source.url}`);
    
    // In a real implementation, this would use fetch or axios to call the API
    // For this demonstration, we'll create a simulated result
    
    const extractedItems: ExtractedData[] = [];
    
    // Simulate extracting data from API response
    const numItems = Math.floor(Math.random() * 8) + 2;
    
    for (let i = 0; i < numItems; i++) {
      const item: ExtractedData = {
        id: uuidv4(),
        sourceId: source.id,
        url: source.url,
        timestamp: new Date(),
        content: {
          id: `item_${i + 1}`,
          title: `API data item ${i + 1}`,
          description: `This is simulated API data item ${i + 1} from ${source.name}.`,
          attributes: {
            type: 'article',
            score: Math.random() * 100,
            tags: source.tags
          }
        },
        metadata: {
          title: `API data item ${i + 1}`,
          publishDate: new Date(),
          categories: source.tags,
          language: 'en',
          confidence: 0.95
        },
        validationResult: {
          valid: true
        },
        processingStage: 'raw'
      };
      
      extractedItems.push(item);
    }
    
    return extractedItems;
  }
  
  /**
   * Fetch data from an RSS feed
   */
  private async fetchFromRss(source: DataSource): Promise<ExtractedData[]> {
    console.log(`Simulating RSS feed fetch for: ${source.url}`);
    
    // In a real implementation, this would use a library to parse the RSS feed
    // For this demonstration, we'll create a simulated result
    
    const extractedItems: ExtractedData[] = [];
    
    // Simulate extracting items from an RSS feed
    const numItems = Math.floor(Math.random() * 10) + 5;
    
    for (let i = 0; i < numItems; i++) {
      const pubDate = new Date();
      pubDate.setHours(pubDate.getHours() - Math.floor(Math.random() * 24));
      
      const item: ExtractedData = {
        id: uuidv4(),
        sourceId: source.id,
        url: `${source.url}/item/${i + 1}`,
        timestamp: new Date(),
        content: {
          title: `RSS item ${i + 1} from ${source.name}`,
          description: `This is simulated RSS item ${i + 1} description from ${source.name}.`,
          content: `This is the full content of RSS item ${i + 1} from ${source.name}. In a real implementation, this would contain the full content of the RSS item.`,
          link: `${source.url}/item/${i + 1}`,
          pubDate: pubDate.toISOString()
        },
        metadata: {
          title: `RSS item ${i + 1}`,
          publishDate: pubDate,
          categories: source.tags,
          language: 'en',
          confidence: 0.9
        },
        validationResult: {
          valid: true
        },
        processingStage: 'raw'
      };
      
      extractedItems.push(item);
    }
    
    return extractedItems;
  }
  
  /**
   * Validate extracted data
   */
  private async validateExtractedData(
    items: ExtractedData[],
    source: DataSource
  ): Promise<ExtractedData[]> {
    console.log(`Validating ${items.length} items from source: ${source.name}`);
    
    const validatedItems: ExtractedData[] = [];
    
    for (const item of items) {
      try {
        // Basic validation
        if (!item.content) {
          item.validationResult = {
            valid: false,
            errors: ['Empty content']
          };
          continue;
        }
        
        // Apply validation rules based on validation level
        const validationResult = await this.applyValidationRules(item, source.configuration.validationLevel);
        item.validationResult = validationResult;
        
        if (validationResult.valid) {
          item.processingStage = 'validated';
          validatedItems.push(item);
        }
      } catch (error) {
        console.error(`Error validating item ${item.id}:`, error);
        
        item.validationResult = {
          valid: false,
          errors: [error instanceof Error ? error.message : String(error)]
        };
      }
    }
    
    return validatedItems;
  }
  
  /**
   * Apply validation rules to an item
   */
  private async applyValidationRules(
    item: ExtractedData,
    level: ValidationLevel
  ): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation (all levels)
    if (!item.url) {
      errors.push('Missing URL');
    }
    
    if (!item.content) {
      errors.push('Missing content');
    }
    
    // Standard and strict validation
    if (level === 'standard' || level === 'strict') {
      // Check for empty strings or null values in content
      for (const key in item.content) {
        if (item.content[key] === '' || item.content[key] === null) {
          warnings.push(`Empty value for content field: ${key}`);
        }
      }
      
      // Metadata validations
      if (!item.metadata.title) {
        warnings.push('Missing metadata title');
      }
    }
    
    // Strict validation only
    if (level === 'strict') {
      // Content size validation
      const contentStr = JSON.stringify(item.content);
      if (contentStr.length < 50) {
        warnings.push('Content is too short, might be low quality');
      }
      
      // Duplicate detection could be added here
      // In a real implementation, this would check for duplicates in existing data
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Store extracted data in memory and add to memory manager
   */
  private async storeExtractedData(items: ExtractedData[]): Promise<ExtractedData[]> {
    console.log(`Storing ${items.length} validated items`);
    
    const storedItems: ExtractedData[] = [];
    
    for (const item of items) {
      try {
        // Store in memory
        item.processingStage = 'stored';
        this.store.addExtractedData(item);
        
        // Add to memory manager for integration with the rest of the system
        await this.addToMemoryManager(item);
        
        storedItems.push(item);
      } catch (error) {
        console.error(`Error storing item ${item.id}:`, error);
        
        // Log the error
        errorRecoverySystem.logError({
          id: `data_storage_error_${Date.now()}`,
          type: 'data_acquisition_error',
          message: `Error storing extracted data: ${error instanceof Error ? error.message : String(error)}`,
          stack: error instanceof Error ? error.stack : undefined,
          context: { itemId: item.id },
          timestamp: new Date(),
          severity: 'error'
        });
      }
    }
    
    return storedItems;
  }
  
  /**
   * Add extracted data to memory manager
   */
  private async addToMemoryManager(item: ExtractedData): Promise<void> {
    // Extract title and content as a readable string
    const title = item.metadata.title || 'Untitled';
    
    // Create a readable string from content
    let contentStr = '';
    if (typeof item.content === 'string') {
      contentStr = item.content;
    } else {
      // For object content, transform to readable text
      if (item.content.title) {
        contentStr += `Title: ${item.content.title}\n`;
      }
      
      if (item.content.description) {
        contentStr += `Description: ${item.content.description}\n`;
      }
      
      if (item.content.body) {
        contentStr += `${item.content.body}\n`;
      }
      
      if (item.content.content) {
        contentStr += `${item.content.content}\n`;
      }
    }
    
    // Extract entities and topics
    const extractionResult = await this.extractEntitiesAndTopics(title, contentStr);
    
    // Create memory content
    const memoryContent = `${title}\n\n${contentStr}\n\nSource: ${item.url}`;
    
    // Add to memory manager
    await enhancedMemoryManager.addMemory(
      memoryContent,
      'autonomous-acquisition',
      'semantic', // Store as semantic memory for long-term knowledge
      extractionResult.entities,
      extractionResult.topics,
      0.7 // Importance - can be adjusted based on source priority
    );
  }
  
  /**
   * Extract entities and topics from content
   */
  private async extractEntitiesAndTopics(
    title: string,
    content: string
  ): Promise<{ entities: string[]; topics: string[] }> {
    try {
      // Use AI to extract entities and topics
      const prompt = `
        Extract entities (people, places, organizations, products) and topics from this content:
        
        Title: ${title}
        
        Content: ${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}
        
        Respond with JSON containing 'entities' and 'topics' arrays.
      `;
      
      return await generateStructuredCompletion<{ entities: string[]; topics: string[] }>(
        prompt,
        'gpt-4o',
        0.3,
        500
      );
    } catch (error) {
      console.error('Error extracting entities and topics:', error);
      
      // Return empty arrays on error
      return { entities: [], topics: [] };
    }
  }
  
  /**
   * Get all registered data sources
   */
  public getAllDataSources(): DataSource[] {
    return this.store.getAllDataSources();
  }
  
  /**
   * Get a specific data source
   */
  public getDataSource(id: string): DataSource | undefined {
    return this.store.getDataSource(id);
  }
  
  /**
   * Update a data source
   */
  public updateDataSource(id: string, data: Partial<DataSource>): DataSource | undefined {
    return this.store.updateDataSource(id, data);
  }
  
  /**
   * Enable a data source
   */
  public async enableDataSource(id: string): Promise<DataSource | undefined> {
    const updated = this.store.updateDataSource(id, { enabled: true });
    
    if (updated) {
      // Schedule a task if enabled
      await this.scheduleAcquisitionTask(id, updated.configuration.priority);
    }
    
    return updated;
  }
  
  /**
   * Disable a data source
   */
  public disableDataSource(id: string): DataSource | undefined {
    return this.store.updateDataSource(id, { enabled: false });
  }
  
  /**
   * Delete a data source
   */
  public deleteDataSource(id: string): boolean {
    return this.store.removeDataSource(id);
  }
  
  /**
   * Get all tasks for a data source
   */
  public getTasksForDataSource(sourceId: string): DataAcquisitionTask[] {
    return this.store.getTasksBySource(sourceId);
  }
  
  /**
   * Get all extracted data for a source
   */
  public getExtractedDataForSource(sourceId: string): ExtractedData[] {
    return this.store.getExtractedDataBySource(sourceId);
  }
  
  /**
   * Manually trigger data acquisition for a source
   */
  public async triggerAcquisition(sourceId: string): Promise<DataAcquisitionTask> {
    const source = this.store.getDataSource(sourceId);
    if (!source) {
      throw new Error(`Data source not found: ${sourceId}`);
    }
    
    return await this.scheduleAcquisitionTask(sourceId, 'high', new Date());
  }
  
  /**
   * Clean up resources on shutdown
   */
  public shutdown(): void {
    if (this.taskProcessingInterval) {
      clearInterval(this.taskProcessingInterval);
      this.taskProcessingInterval = null;
    }
    
    console.log('Autonomous Data Acquisition system shut down');
  }
}

// Export singleton instance
export const autonomousDataAcquisition = new AutonomousDataAcquisition();