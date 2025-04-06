/**
 * API Quota Manager
 * 
 * This module manages API usage quotas for various AI services,
 * tracking token usage, request counts, and estimated costs.
 */

// Types of AI services we're tracking
type ApiService = 'openai' | 'anthropic' | 'elevenlabs' | 'perplexity' | 'local-llm';

/**
 * Interface for tracking API usage
 */
interface QuotaUsage {
  requestCount: number;
  tokenCount: number;
  failureCount: number;
  lastUsedTimestamp?: number;
  dailyUsage: Map<string, number>; // Date string -> token count
  modelUsage: Map<string, number>; // Model ID -> token count
  details: UsageRecord[]; // Array of detailed usage records
}

/**
 * Config for API quotas
 */
interface QuotaConfig {
  dailyTokenLimit: number;
  hourlyRequestLimit: number;
  costPerThousandTokens: number;
  name: string;
}

/**
 * Detailed usage record
 */
interface UsageRecord {
  timestamp: number;
  requestType: string;
  tokensUsed: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  isVisionRequest?: boolean;
  isEmbedding?: boolean;
  success: boolean;
  errorMessage?: string;
}

/**
 * API Quota Manager class
 */
class ApiQuotaManager {
  private usage: Map<ApiService, QuotaUsage>;
  private config: Record<ApiService, QuotaConfig>;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    
    // Initialize usage tracking
    this.usage = new Map();
    this.initializeUsage('openai');
    this.initializeUsage('anthropic');
    this.initializeUsage('elevenlabs');
    this.initializeUsage('perplexity');
    this.initializeUsage('local-llm');
    
    // Configure quota limits and costs
    this.config = {
      'openai': {
        dailyTokenLimit: 100000,
        hourlyRequestLimit: 100,
        costPerThousandTokens: 0.01, // GPT-3.5 rate as baseline
        name: 'OpenAI'
      },
      'anthropic': {
        dailyTokenLimit: 100000,
        hourlyRequestLimit: 100,
        costPerThousandTokens: 0.015, // Claude rate as baseline
        name: 'Anthropic'
      },
      'elevenlabs': {
        dailyTokenLimit: 30000, // Character count
        hourlyRequestLimit: 50,
        costPerThousandTokens: 0.2, // Cost per 1000 characters
        name: 'ElevenLabs'
      },
      'perplexity': {
        dailyTokenLimit: 100000,
        hourlyRequestLimit: 100, 
        costPerThousandTokens: 0.008, // Estimated rate
        name: 'Perplexity'
      },
      'local-llm': {
        dailyTokenLimit: 1000000, // Much higher for local models
        hourlyRequestLimit: 1000,  // Much higher for local models
        costPerThousandTokens: 0, // Free
        name: 'Local LLM'
      }
    };
  }

  /**
   * Initialize usage tracking for a service
   */
  private initializeUsage(service: ApiService): void {
    this.usage.set(service, {
      requestCount: 0,
      tokenCount: 0,
      failureCount: 0,
      lastUsedTimestamp: undefined,
      dailyUsage: new Map(),
      modelUsage: new Map(),
      details: []
    });
  }

  /**
   * Get today's date as a string
   */
  private getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Record API usage
   * @param service API service used
   * @param tokens Number of tokens used in the request
   * @param details Additional usage details
   */
  public recordApiUsage(service: ApiService, tokens: number, details: Record<string, any> = {}): void {
    const serviceUsage = this.usage.get(service);
    if (!serviceUsage) return;
    
    const now = Date.now();
    const today = this.getTodayDateString();
    
    // Update service usage
    serviceUsage.requestCount++;
    serviceUsage.tokenCount += tokens;
    serviceUsage.lastUsedTimestamp = now;
    
    // Update daily usage
    serviceUsage.dailyUsage.set(
      today, 
      (serviceUsage.dailyUsage.get(today) || 0) + tokens
    );
    
    // Update model usage if model is specified
    if (details.model) {
      serviceUsage.modelUsage.set(
        details.model,
        (serviceUsage.modelUsage.get(details.model) || 0) + tokens
      );
    }
    
    // Record detailed usage
    const usageRecord: UsageRecord = {
      timestamp: now,
      requestType: details.requestType || 'text-completion',
      tokensUsed: tokens,
      model: details.model,
      promptTokens: details.promptTokens,
      completionTokens: details.completionTokens,
      totalTokens: details.totalTokens || tokens,
      responseTimeMs: details.responseTimeMs,
      isVisionRequest: details.isVisionRequest || false,
      isEmbedding: details.isEmbedding || false,
      success: true
    };
    
    serviceUsage.details.push(usageRecord);
    
    // Check and log if approaching limits
    const warning = this.checkQuotaLimits(service);
    if (warning) {
      console.warn(`[API Quota Warning] ${warning}`);
    }
  }

  /**
   * Record an API failure
   * @param service API service that failed
   * @param errorMessage Error description
   */
  public recordApiFailure(service: ApiService, errorMessage: string): void {
    const serviceUsage = this.usage.get(service);
    if (!serviceUsage) return;
    
    const now = Date.now();
    
    // Increment failure count
    serviceUsage.failureCount++;
    serviceUsage.lastUsedTimestamp = now;
    
    // Record failure
    const usageRecord: UsageRecord = {
      timestamp: now,
      requestType: 'error',
      tokensUsed: 0,
      success: false,
      errorMessage
    };
    
    serviceUsage.details.push(usageRecord);
  }

  /**
   * Check if a service is exceeding quota limits
   * @param service API service to check
   * @returns Warning message if approaching limits, null otherwise
   */
  private checkQuotaLimits(service: ApiService): string | null {
    const serviceUsage = this.usage.get(service);
    const serviceConfig = this.config[service];
    
    if (!serviceUsage || !serviceConfig) return null;
    
    const today = this.getTodayDateString();
    const todayUsage = serviceUsage.dailyUsage.get(today) || 0;
    
    // Check daily token limit
    if (todayUsage > serviceConfig.dailyTokenLimit * 0.8) {
      return `${serviceConfig.name}: Daily token usage at ${Math.round(todayUsage / serviceConfig.dailyTokenLimit * 100)}% of limit`;
    }
    
    // Calculate recent request rate (last hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentRequests = serviceUsage.details.filter(r => r.timestamp > hourAgo).length;
    
    // Check hourly request limit
    if (recentRequests > serviceConfig.hourlyRequestLimit * 0.8) {
      return `${serviceConfig.name}: Hourly request rate at ${Math.round(recentRequests / serviceConfig.hourlyRequestLimit * 100)}% of limit`;
    }
    
    return null;
  }

  /**
   * Get current quota status for all tracked services
   * @returns Object with usage data for each service
   */
  public getQuotaUsageSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [service, usage] of this.usage) {
      const config = this.config[service];
      const today = this.getTodayDateString();
      const todayUsage = usage.dailyUsage.get(today) || 0;
      
      // Calculate recent request rate (last hour)
      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recentRequests = usage.details.filter(r => r.timestamp > hourAgo).length;
      
      // Collect top models
      const topModels: Record<string, number> = {};
      Array.from(usage.modelUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([model, count]) => {
          topModels[model] = count;
        });
        
      // Add service summary
      summary[service] = {
        totalRequests: usage.requestCount,
        totalTokens: usage.tokenCount,
        failureCount: usage.failureCount,
        failureRate: usage.requestCount ? (usage.failureCount / usage.requestCount) : 0,
        dailyTokensUsed: todayUsage,
        dailyTokensRemaining: config.dailyTokenLimit - todayUsage,
        dailyUsagePercent: Math.round((todayUsage / config.dailyTokenLimit) * 100),
        hourlyRequestRate: recentRequests,
        hourlyRequestLimit: config.hourlyRequestLimit,
        hourlyUsagePercent: Math.round((recentRequests / config.hourlyRequestLimit) * 100),
        lastUsed: usage.lastUsedTimestamp,
        topModels
      };
    }
    
    return summary;
  }

  /**
   * Get estimated cost for API usage
   * @returns Object with cost estimates for each service
   */
  public getEstimatedCosts(): Record<string, any> {
    const costs: Record<string, any> = {
      total: 0
    };
    
    for (const [service, usage] of this.usage) {
      const config = this.config[service];
      const serviceCost = (usage.tokenCount / 1000) * config.costPerThousandTokens;
      
      costs[service] = {
        totalCost: serviceCost.toFixed(4),
        costPerThousandTokens: config.costPerThousandTokens,
        totalTokens: usage.tokenCount
      };
      
      costs.total += serviceCost;
    }
    
    costs.total = costs.total.toFixed(4);
    costs.currency = 'USD';
    costs.since = new Date(this.startTime).toISOString();
    
    return costs;
  }

  /**
   * Get all usage details for a specific service
   * @param service The service to get details for
   * @returns Array of detailed usage records
   */
  public getServiceDetails(service: ApiService): UsageRecord[] {
    const serviceUsage = this.usage.get(service);
    return serviceUsage ? [...serviceUsage.details] : [];
  }

  /**
   * Check if a request would exceed rate limits
   * @param service The service to check
   * @returns Warning message if limit would be exceeded, null otherwise
   */
  public checkRateLimit(service: ApiService): string | null {
    const serviceUsage = this.usage.get(service);
    const serviceConfig = this.config[service];
    
    if (!serviceUsage || !serviceConfig) return null;
    
    // Calculate recent request rate (last hour)
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentRequests = serviceUsage.details.filter(r => r.timestamp > hourAgo).length;
    
    // Check if we're at the limit
    if (recentRequests >= serviceConfig.hourlyRequestLimit) {
      return `${serviceConfig.name}: Rate limit exceeded (${recentRequests}/${serviceConfig.hourlyRequestLimit} requests in the last hour)`;
    }
    
    // Check if we're at 95% of the limit
    if (recentRequests >= serviceConfig.hourlyRequestLimit * 0.95) {
      return `${serviceConfig.name}: Approaching rate limit (${recentRequests}/${serviceConfig.hourlyRequestLimit} requests in the last hour)`;
    }
    
    return null;
  }
}

// Export singleton instance
export const apiQuotaManager = new ApiQuotaManager();