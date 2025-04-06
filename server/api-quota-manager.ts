/**
 * API Quota Manager
 * 
 * This module manages API quota usage and rate limiting for various AI services.
 * It tracks usage, enforces rate limits, and provides cost estimation.
 */

// Enum for services that require quota management
export enum ApiService {
  OPENAI = 'openai',
  OPENAI_EMBEDDING = 'openai_embedding',
  OPENAI_IMAGE = 'openai_image',
  OPENAI_AUDIO = 'openai_audio',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity'
}

// Interface for API usage tracking
interface ApiUsage {
  model: string;
  promptTokens: number;
  completionTokens?: number;
  totalTokens: number;
  responseTimeMs: number;
  isEmbedding?: boolean;
}

// Interface for quota limits
interface QuotaLimit {
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
  maxResponseTimeMs: number;
}

// Interface for quota usage
interface QuotaUsage {
  totalTokens: number;
  totalCost: number;
  usageHistory: {
    last1Min: number;
    last1Hour: number;
    last24Hours: number;
  };
  statusHistory: {
    rateLimited: number;
    errors: number;
    successful: number;
  };
  lastUsed: number;
}

// Class to manage API quotas
class ApiQuotaManager {
  private quotaLimits: Map<ApiService, QuotaLimit>;
  private quotaUsage: Map<ApiService, QuotaUsage>;
  private usageLog: Array<{
    service: ApiService;
    timestamp: number;
    tokens: number;
    model: string;
    cost: number;
  }>;
  
  constructor() {
    // Initialize quota limits
    this.quotaLimits = new Map<ApiService, QuotaLimit>([
      [ApiService.OPENAI, {
        tokensPerMinute: 10000,    // 10k tokens per minute
        tokensPerHour: 100000,     // 100k tokens per hour
        tokensPerDay: 1000000,     // 1M tokens per day
        maxResponseTimeMs: 20000   // 20 seconds max response time
      }],
      [ApiService.OPENAI_EMBEDDING, {
        tokensPerMinute: 30000,    // 30k tokens per minute
        tokensPerHour: 300000,     // 300k tokens per hour
        tokensPerDay: 3000000,     // 3M tokens per day
        maxResponseTimeMs: 10000   // 10 seconds max response time
      }],
      [ApiService.OPENAI_IMAGE, {
        tokensPerMinute: 20,       // 20 images per minute
        tokensPerHour: 200,        // 200 images per hour
        tokensPerDay: 2000,        // 2000 images per day
        maxResponseTimeMs: 30000   // 30 seconds max response time
      }],
      [ApiService.OPENAI_AUDIO, {
        tokensPerMinute: 10,       // 10 audio requests per minute
        tokensPerHour: 100,        // 100 audio requests per hour
        tokensPerDay: 1000,        // 1000 audio requests per day
        maxResponseTimeMs: 30000   // 30 seconds max response time
      }],
      [ApiService.ANTHROPIC, {
        tokensPerMinute: 10000,    // 10k tokens per minute
        tokensPerHour: 100000,     // 100k tokens per hour
        tokensPerDay: 1000000,     // 1M tokens per day
        maxResponseTimeMs: 20000   // 20 seconds max response time
      }],
      [ApiService.PERPLEXITY, {
        tokensPerMinute: 10000,    // 10k tokens per minute
        tokensPerHour: 100000,     // 100k tokens per hour
        tokensPerDay: 1000000,     // 1M tokens per day
        maxResponseTimeMs: 15000   // 15 seconds max response time
      }]
    ]);
    
    // Initialize usage tracking
    this.quotaUsage = new Map<ApiService, QuotaUsage>();
    for (const service of Object.values(ApiService)) {
      this.quotaUsage.set(service, {
        totalTokens: 0,
        totalCost: 0,
        usageHistory: {
          last1Min: 0,
          last1Hour: 0,
          last24Hours: 0
        },
        statusHistory: {
          rateLimited: 0,
          errors: 0,
          successful: 0
        },
        lastUsed: 0
      });
    }
    
    // Initialize usage log
    this.usageLog = [];
  }
  
  /**
   * Track API usage for a service
   * @param service API service used
   * @param usage Usage details
   */
  trackUsage(service: ApiService, usage: ApiUsage): void {
    const now = Date.now();
    const usageEntry = this.quotaUsage.get(service);
    
    if (!usageEntry) {
      console.error(`Unknown service: ${service}`);
      return;
    }
    
    // Calculate cost based on model and token usage
    const cost = this.calculateCost(service, usage.model, usage.promptTokens, usage.completionTokens || 0);
    
    // Update usage statistics
    usageEntry.totalTokens += usage.totalTokens;
    usageEntry.totalCost += cost;
    usageEntry.lastUsed = now;
    usageEntry.statusHistory.successful++;
    
    // Update usage history
    usageEntry.usageHistory.last1Min += usage.totalTokens;
    usageEntry.usageHistory.last1Hour += usage.totalTokens;
    usageEntry.usageHistory.last24Hours += usage.totalTokens;
    
    // Log usage
    this.usageLog.push({
      service,
      timestamp: now,
      tokens: usage.totalTokens,
      model: usage.model,
      cost
    });
    
    // Prune old usage data
    this.pruneUsageHistory();
  }
  
  /**
   * Track API failures
   * @param service API service that failed
   * @param isRateLimit Whether the failure was due to rate limiting
   */
  trackFailure(service: ApiService, isRateLimit: boolean = false): void {
    const usageEntry = this.quotaUsage.get(service);
    
    if (!usageEntry) {
      console.error(`Unknown service: ${service}`);
      return;
    }
    
    if (isRateLimit) {
      usageEntry.statusHistory.rateLimited++;
    } else {
      usageEntry.statusHistory.errors++;
    }
  }
  
  /**
   * Get the remaining quota for a service
   * @param service API service
   * @returns Remaining token quota or 0 if exceeded
   */
  getRemainingQuota(service: ApiService): number {
    const limits = this.quotaLimits.get(service);
    const usage = this.quotaUsage.get(service);
    
    if (!limits || !usage) {
      console.error(`Unknown service: ${service}`);
      return 0;
    }
    
    // Calculate remaining quota based on most restrictive limit
    const remainingPerMinute = Math.max(0, limits.tokensPerMinute - usage.usageHistory.last1Min);
    const remainingPerHour = Math.max(0, limits.tokensPerHour - usage.usageHistory.last1Hour);
    const remainingPerDay = Math.max(0, limits.tokensPerDay - usage.usageHistory.last24Hours);
    
    // Return the most restrictive remaining quota
    return Math.min(remainingPerMinute, remainingPerHour, remainingPerDay);
  }
  
  /**
   * Check if we've hit rate limits for a service
   * @param service API service to check
   * @returns Null if not rate limited, or a string describing the limit hit
   */
  checkRateLimit(service: ApiService): string | null {
    const limits = this.quotaLimits.get(service);
    const usage = this.quotaUsage.get(service);
    
    if (!limits || !usage) {
      console.error(`Unknown service: ${service}`);
      return 'Unknown service';
    }
    
    // Check each limit
    if (usage.usageHistory.last1Min >= limits.tokensPerMinute) {
      return 'Exceeded per-minute limit';
    }
    
    if (usage.usageHistory.last1Hour >= limits.tokensPerHour) {
      return 'Exceeded hourly limit';
    }
    
    if (usage.usageHistory.last24Hours >= limits.tokensPerDay) {
      return 'Exceeded daily limit';
    }
    
    return null; // Not rate limited
  }
  
  /**
   * Calculate the cost of an API call
   * @param service API service used
   * @param model Model used
   * @param promptTokens Number of prompt tokens
   * @param completionTokens Number of completion tokens
   * @returns Estimated cost in USD
   */
  calculateCost(
    service: ApiService,
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Cost per 1000 tokens for different models
    const costMap: Record<string, { input: number; output: number }> = {
      // OpenAI models
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.01, output: 0.03 },
      'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
      'text-embedding-3-small': { input: 0.0001, output: 0.0001 },
      'text-embedding-3-large': { input: 0.00025, output: 0.00025 },
      'dall-e-3': { input: 0.04, output: 0.04 }, // Per image
      'whisper-1': { input: 0.006, output: 0.006 }, // Per minute
      'tts-1': { input: 0.015, output: 0.015 }, // Per 1000 characters
      
      // Anthropic models
      'claude-3-7-sonnet-20250219': { input: 0.012, output: 0.036 },
      'claude-3-7-haiku-20250211': { input: 0.004, output: 0.012 },
      'claude-3-5-sonnet-20240620': { input: 0.012, output: 0.036 },
      
      // Perplexity models
      'llama-3.1-sonar-small-128k-online': { input: 0.0025, output: 0.0075 },
      'llama-3.1-sonar-large-128k-online': { input: 0.007, output: 0.021 },
      'llama-3.1-sonar-huge-128k-online': { input: 0.012, output: 0.036 },
      
      // Local models (free)
      'local-basic': { input: 0, output: 0 }
    };
    
    // Get cost rates for the model
    const costRates = costMap[model] || { input: 0.01, output: 0.03 }; // Default to GPT-4 pricing
    
    // Calculate cost
    const inputCost = (promptTokens / 1000) * costRates.input;
    const outputCost = (completionTokens / 1000) * costRates.output;
    
    return inputCost + outputCost;
  }
  
  /**
   * Estimate cost for a given model and token count
   * @param model Model name
   * @param promptTokens Prompt tokens
   * @param completionTokens Completion tokens
   * @returns Estimated cost in USD
   */
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Map model to service
    let service = ApiService.OPENAI;
    
    if (model.startsWith('claude')) {
      service = ApiService.ANTHROPIC;
    } else if (model.startsWith('llama')) {
      service = ApiService.PERPLEXITY;
    } else if (model.startsWith('text-embedding')) {
      service = ApiService.OPENAI_EMBEDDING;
    } else if (model === 'whisper-1' || model === 'tts-1') {
      service = ApiService.OPENAI_AUDIO;
    } else if (model === 'dall-e-3') {
      service = ApiService.OPENAI_IMAGE;
    }
    
    return this.calculateCost(service, model, promptTokens, completionTokens);
  }
  
  /**
   * Prune old usage history data
   */
  private pruneUsageHistory(): void {
    const now = Date.now();
    const oneMinAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Remove entries older than necessary from the log
    this.usageLog = this.usageLog.filter(entry => entry.timestamp >= oneDayAgo);
    
    // Update usage history for each service
    for (const [service, usage] of this.quotaUsage.entries()) {
      // Recalculate last minute usage
      usage.usageHistory.last1Min = this.usageLog
        .filter(entry => entry.service === service && entry.timestamp >= oneMinAgo)
        .reduce((sum, entry) => sum + entry.tokens, 0);
      
      // Recalculate last hour usage
      usage.usageHistory.last1Hour = this.usageLog
        .filter(entry => entry.service === service && entry.timestamp >= oneHourAgo)
        .reduce((sum, entry) => sum + entry.tokens, 0);
      
      // Recalculate last 24 hours usage
      usage.usageHistory.last24Hours = this.usageLog
        .filter(entry => entry.service === service && entry.timestamp >= oneDayAgo)
        .reduce((sum, entry) => sum + entry.tokens, 0);
    }
  }
  
  /**
   * Get detailed usage summary for a service
   * @param service API service to get summary for
   * @returns Usage summary
   */
  getUsageSummary(service: ApiService): any {
    const usage = this.quotaUsage.get(service);
    const limits = this.quotaLimits.get(service);
    
    if (!usage || !limits) {
      return { error: 'Unknown service' };
    }
    
    return {
      service,
      totalTokens: usage.totalTokens,
      totalCost: usage.totalCost,
      current: {
        lastMinute: usage.usageHistory.last1Min,
        lastHour: usage.usageHistory.last1Hour,
        last24Hours: usage.usageHistory.last24Hours
      },
      limits: {
        perMinute: limits.tokensPerMinute,
        perHour: limits.tokensPerHour,
        perDay: limits.tokensPerDay
      },
      remaining: {
        perMinute: Math.max(0, limits.tokensPerMinute - usage.usageHistory.last1Min),
        perHour: Math.max(0, limits.tokensPerHour - usage.usageHistory.last1Hour),
        perDay: Math.max(0, limits.tokensPerDay - usage.usageHistory.last24Hours)
      },
      status: {
        rateLimited: usage.statusHistory.rateLimited,
        errors: usage.statusHistory.errors,
        successful: usage.statusHistory.successful
      },
      lastUsed: usage.lastUsed
    };
  }
  
  /**
   * Get summaries for all services
   * @returns Map of usage summaries
   */
  getAllUsageSummaries(): Record<string, any> {
    const summaries: Record<string, any> = {};
    
    for (const service of Object.values(ApiService)) {
      summaries[service] = this.getUsageSummary(service);
    }
    
    return summaries;
  }
  
  /**
   * Reset usage statistics for testing
   */
  resetUsage(): void {
    this.usageLog = [];
    
    for (const service of Object.values(ApiService)) {
      this.quotaUsage.set(service, {
        totalTokens: 0,
        totalCost: 0,
        usageHistory: {
          last1Min: 0,
          last1Hour: 0,
          last24Hours: 0
        },
        statusHistory: {
          rateLimited: 0,
          errors: 0,
          successful: 0
        },
        lastUsed: 0
      });
    }
  }
}

// Export a singleton instance
export const apiQuotaManager = new ApiQuotaManager();