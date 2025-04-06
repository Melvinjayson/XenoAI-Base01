/**
 * API Quota Manager
 * 
 * This module manages API quotas, rate limits, and usage tracking
 * for various external APIs used by the system.
 */

// API Service types
export enum ApiService {
  OPENAI = 'openai',
  OPENAI_EMBEDDING = 'openai-embedding',
  OPENAI_AUDIO = 'openai-audio',
  OPENAI_IMAGE = 'openai-image',
  ANTHROPIC = 'anthropic',
  SERPAPI = 'serpapi',
  BING = 'bing',
  ELEVEN_LABS = 'elevenlabs',
  PERPLEXITY = 'perplexity'
}

// Usage information
interface Usage {
  requests: number;
  tokens: number;
  cost: number;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  isEmbedding?: boolean;
}

// Quota usage information
interface QuotaUsage {
  usage: Usage;
  limit: {
    requests: number;
    tokens: number;
    cost: number;
  };
  resetTime: Date | null;
  isLimited: boolean;
}

// Cost estimation by model
const modelCosts: Record<string, { inputPer1K: number; outputPer1K: number }> = {
  // OpenAI models
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
  'gpt-4-turbo': { inputPer1K: 0.01, outputPer1K: 0.03 },
  'gpt-3.5-turbo': { inputPer1K: 0.0005, outputPer1K: 0.0015 },
  'text-embedding-ada-002': { inputPer1K: 0.0001, outputPer1K: 0 },
  'dall-e-3': { inputPer1K: 0.04, outputPer1K: 0 },
  'whisper-1': { inputPer1K: 0.006, outputPer1K: 0 },
  
  // Anthropic models
  'claude-3-7-sonnet-20250219': { inputPer1K: 0.03, outputPer1K: 0.15 },
  'claude-3-5-sonnet-20240620': { inputPer1K: 0.015, outputPer1K: 0.075 },
  'claude-3-opus': { inputPer1K: 0.015, outputPer1K: 0.075 },
  
  // Perplexity models
  'llama-3.1-sonar-small-128k-online': { inputPer1K: 0.0008, outputPer1K: 0.0008 },
  'llama-3.1-sonar-large-128k-online': { inputPer1K: 0.0008, outputPer1K: 0.0016 },
  'llama-3.1-sonar-huge-128k-online': { inputPer1K: 0.0008, outputPer1K: 0.0036 },

  // Local models (free)
  'local-llama': { inputPer1K: 0, outputPer1K: 0 }
};

/**
 * API Quota Manager class
 */
export class ApiQuotaManager {
  // Store usage data for each service
  private usageData: Map<ApiService, QuotaUsage> = new Map();
  
  // Default quota limits (can be overridden via environment variables)
  private defaultLimits: Record<ApiService, { requests: number; tokens: number; cost: number }> = {
    [ApiService.OPENAI]: { requests: 200, tokens: 100000, cost: 10 },
    [ApiService.OPENAI_EMBEDDING]: { requests: 1000, tokens: 500000, cost: 5 },
    [ApiService.OPENAI_AUDIO]: { requests: 100, tokens: 50000, cost: 5 },
    [ApiService.OPENAI_IMAGE]: { requests: 50, tokens: 0, cost: 10 },
    [ApiService.ANTHROPIC]: { requests: 100, tokens: 50000, cost: 10 },
    [ApiService.SERPAPI]: { requests: 100, tokens: 0, cost: 10 },
    [ApiService.BING]: { requests: 1000, tokens: 0, cost: 5 },
    [ApiService.ELEVEN_LABS]: { requests: 50, tokens: 10000, cost: 5 },
    [ApiService.PERPLEXITY]: { requests: 100, tokens: 50000, cost: 10 }
  };
  
  // Rate limiting information
  private rateLimits: Record<ApiService, { requestsPerMinute: number; lastRequestTime: number; requestCount: number }> = {
    [ApiService.OPENAI]: { requestsPerMinute: 20, lastRequestTime: 0, requestCount: 0 },
    [ApiService.OPENAI_EMBEDDING]: { requestsPerMinute: 50, lastRequestTime: 0, requestCount: 0 },
    [ApiService.OPENAI_AUDIO]: { requestsPerMinute: 10, lastRequestTime: 0, requestCount: 0 },
    [ApiService.OPENAI_IMAGE]: { requestsPerMinute: 5, lastRequestTime: 0, requestCount: 0 },
    [ApiService.ANTHROPIC]: { requestsPerMinute: 10, lastRequestTime: 0, requestCount: 0 },
    [ApiService.SERPAPI]: { requestsPerMinute: 5, lastRequestTime: 0, requestCount: 0 },
    [ApiService.BING]: { requestsPerMinute: 30, lastRequestTime: 0, requestCount: 0 },
    [ApiService.ELEVEN_LABS]: { requestsPerMinute: 10, lastRequestTime: 0, requestCount: 0 },
    [ApiService.PERPLEXITY]: { requestsPerMinute: 10, lastRequestTime: 0, requestCount: 0 }
  };
  
  constructor() {
    // Initialize usage data
    this.initializeUsageData();
    
    // Load quotas from environment variables if available
    this.loadQuotasFromEnv();
    
    // Log initial state
    console.log('API Quota Manager initialized');
  }
  
  /**
   * Initialize usage data for all services
   */
  private initializeUsageData(): void {
    Object.values(ApiService).forEach(service => {
      const defaultLimit = this.defaultLimits[service];
      
      this.usageData.set(service, {
        usage: {
          requests: 0,
          tokens: 0,
          cost: 0
        },
        limit: { ...defaultLimit },
        resetTime: null,
        isLimited: false
      });
    });
  }
  
  /**
   * Load quota limits from environment variables
   */
  private loadQuotasFromEnv(): void {
    // OpenAI limits
    if (process.env.OPENAI_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.OPENAI);
      limit.limit.requests = parseInt(process.env.OPENAI_QUOTA_REQUESTS, 10);
    }
    if (process.env.OPENAI_QUOTA_TOKENS) {
      const limit = this.getQuotaForService(ApiService.OPENAI);
      limit.limit.tokens = parseInt(process.env.OPENAI_QUOTA_TOKENS, 10);
    }
    if (process.env.OPENAI_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.OPENAI);
      limit.limit.cost = parseFloat(process.env.OPENAI_QUOTA_COST);
    }
    
    // Anthropic limits
    if (process.env.ANTHROPIC_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.ANTHROPIC);
      limit.limit.requests = parseInt(process.env.ANTHROPIC_QUOTA_REQUESTS, 10);
    }
    if (process.env.ANTHROPIC_QUOTA_TOKENS) {
      const limit = this.getQuotaForService(ApiService.ANTHROPIC);
      limit.limit.tokens = parseInt(process.env.ANTHROPIC_QUOTA_TOKENS, 10);
    }
    if (process.env.ANTHROPIC_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.ANTHROPIC);
      limit.limit.cost = parseFloat(process.env.ANTHROPIC_QUOTA_COST);
    }
    
    // SERP API limits
    if (process.env.SERPAPI_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.SERPAPI);
      limit.limit.requests = parseInt(process.env.SERPAPI_QUOTA_REQUESTS, 10);
    }
    if (process.env.SERPAPI_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.SERPAPI);
      limit.limit.cost = parseFloat(process.env.SERPAPI_QUOTA_COST);
    }
    
    // Bing API limits
    if (process.env.BING_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.BING);
      limit.limit.requests = parseInt(process.env.BING_QUOTA_REQUESTS, 10);
    }
    if (process.env.BING_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.BING);
      limit.limit.cost = parseFloat(process.env.BING_QUOTA_COST);
    }
    
    // ElevenLabs API limits
    if (process.env.ELEVENLABS_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.ELEVEN_LABS);
      limit.limit.requests = parseInt(process.env.ELEVENLABS_QUOTA_REQUESTS, 10);
    }
    if (process.env.ELEVENLABS_QUOTA_TOKENS) {
      const limit = this.getQuotaForService(ApiService.ELEVEN_LABS);
      limit.limit.tokens = parseInt(process.env.ELEVENLABS_QUOTA_TOKENS, 10);
    }
    if (process.env.ELEVENLABS_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.ELEVEN_LABS);
      limit.limit.cost = parseFloat(process.env.ELEVENLABS_QUOTA_COST);
    }
    
    // Perplexity API limits
    if (process.env.PERPLEXITY_QUOTA_REQUESTS) {
      const limit = this.getQuotaForService(ApiService.PERPLEXITY);
      limit.limit.requests = parseInt(process.env.PERPLEXITY_QUOTA_REQUESTS, 10);
    }
    if (process.env.PERPLEXITY_QUOTA_TOKENS) {
      const limit = this.getQuotaForService(ApiService.PERPLEXITY);
      limit.limit.tokens = parseInt(process.env.PERPLEXITY_QUOTA_TOKENS, 10);
    }
    if (process.env.PERPLEXITY_QUOTA_COST) {
      const limit = this.getQuotaForService(ApiService.PERPLEXITY);
      limit.limit.cost = parseFloat(process.env.PERPLEXITY_QUOTA_COST);
    }
  }
  
  /**
   * Get quota usage for a specific service
   * @param service API service
   * @returns Quota usage information
   */
  private getQuotaForService(service: ApiService): QuotaUsage {
    let quotaUsage = this.usageData.get(service);
    
    if (!quotaUsage) {
      // If not found, create a new entry with default limits
      const defaultLimit = this.defaultLimits[service];
      
      quotaUsage = {
        usage: {
          requests: 0,
          tokens: 0,
          cost: 0
        },
        limit: { ...defaultLimit },
        resetTime: null,
        isLimited: false
      };
      
      this.usageData.set(service, quotaUsage);
    }
    
    return quotaUsage;
  }
  
  /**
   * Track API usage
   * @param service API service
   * @param usage Usage information
   */
  trackUsage(service: ApiService, usage: Partial<Usage>): void {
    const quota = this.getQuotaForService(service);
    
    // Update usage
    if (usage.requests) {
      quota.usage.requests += usage.requests;
    }
    
    if (usage.tokens) {
      quota.usage.tokens += usage.tokens;
    }
    
    if (usage.cost) {
      quota.usage.cost += usage.cost;
    }
    
    // Check if limits are exceeded
    quota.isLimited = 
      quota.usage.requests >= quota.limit.requests ||
      quota.usage.tokens >= quota.limit.tokens ||
      quota.usage.cost >= quota.limit.cost;
    
    // Log usage
    console.log(`API Usage [${service}]:`, {
      requests: `${quota.usage.requests}/${quota.limit.requests}`,
      tokens: `${quota.usage.tokens}/${quota.limit.tokens}`,
      cost: `$${quota.usage.cost.toFixed(2)}/$${quota.limit.cost.toFixed(2)}`
    });
  }
  
  /**
   * Check if a service is rate limited
   * @param service API service
   * @returns Whether the service is rate limited
   */
  isRateLimited(service: ApiService): boolean {
    const now = Date.now();
    const rateLimit = this.rateLimits[service];
    
    // Reset rate limit counter if more than a minute has passed
    if (now - rateLimit.lastRequestTime > 60000) {
      rateLimit.requestCount = 0;
      rateLimit.lastRequestTime = now;
    }
    
    // Check if rate limit is exceeded
    return rateLimit.requestCount >= rateLimit.requestsPerMinute;
  }
  
  /**
   * Check rate limit and quota status
   * @param service API service
   * @returns Error message if limited, null otherwise
   */
  checkRateLimit(service: ApiService): string | null {
    // Check for rate limiting
    if (this.isRateLimited(service)) {
      return 'Rate limit exceeded';
    }
    
    // Check for quota limits
    const quota = this.getQuotaForService(service);
    if (quota.isLimited) {
      return 'Quota limit exceeded';
    }
    
    return null;
  }
  
  /**
   * Increment rate limit counter for a service
   * @param service API service
   */
  incrementRateLimit(service: ApiService): void {
    const now = Date.now();
    const rateLimit = this.rateLimits[service];
    
    // Reset rate limit counter if more than a minute has passed
    if (now - rateLimit.lastRequestTime > 60000) {
      rateLimit.requestCount = 0;
    }
    
    // Update last request time and increment count
    rateLimit.lastRequestTime = now;
    rateLimit.requestCount++;
  }
  
  /**
   * Track API failure
   * @param service API service
   * @param isRateLimited Whether the failure was due to rate limiting
   */
  trackFailure(service: ApiService, isRateLimited: boolean): void {
    // If rate limited, record this for future checks
    if (isRateLimited) {
      const rateLimit = this.rateLimits[service];
      rateLimit.requestCount = rateLimit.requestsPerMinute; // Mark as rate limited
      console.log(`Rate limit reached for ${service}`);
    }
    
    // Log the failure
    console.log(`API failure for ${service}: ${isRateLimited ? 'Rate limited' : 'API error'}`);
  }
  
  /**
   * Check if a service has quota available
   * @param service API service
   * @returns Whether quota is available
   */
  hasQuota(service: ApiService): boolean {
    const quota = this.getQuotaForService(service);
    return !quota.isLimited && !this.isRateLimited(service);
  }
  
  /**
   * Get remaining quota for a service
   * @param service API service
   * @returns Remaining quota value
   */
  getRemainingQuota(service: ApiService): number {
    if (this.isRateLimited(service)) {
      return 0;
    }
    
    const quota = this.getQuotaForService(service);
    
    if (quota.isLimited) {
      return 0;
    }
    
    // Calculate percentage of quota remaining based on the most constrained dimension
    const requestsPercentage = 1 - (quota.usage.requests / quota.limit.requests);
    const tokensPercentage = quota.limit.tokens > 0 ? 1 - (quota.usage.tokens / quota.limit.tokens) : 1;
    const costPercentage = 1 - (quota.usage.cost / quota.limit.cost);
    
    // Return the lowest percentage * 100 to get a number between 0 and 100
    return Math.floor(Math.min(requestsPercentage, tokensPercentage, costPercentage) * 100);
  }
  
  /**
   * Reset quota for a service
   * @param service API service
   */
  resetQuota(service: ApiService): void {
    const quota = this.getQuotaForService(service);
    
    quota.usage = {
      requests: 0,
      tokens: 0,
      cost: 0
    };
    
    quota.isLimited = false;
    quota.resetTime = new Date();
    
    console.log(`Quota reset for ${service}`);
  }
  
  /**
   * Reset all quotas
   */
  resetAllQuotas(): void {
    Object.values(ApiService).forEach(service => {
      this.resetQuota(service);
    });
    
    console.log('All quotas reset');
  }
  
  /**
   * Get usage summary for all services
   * @returns Usage summary
   */
  getUsageSummary(): Record<string, {
    requests: { used: number; limit: number };
    tokens: { used: number; limit: number };
    cost: { used: number; limit: number };
  }> {
    const summary: Record<string, any> = {};
    
    // Convert Map to Array, then iterate
    Array.from(this.usageData.entries()).forEach(([service, quota]) => {
      summary[service] = {
        requests: {
          used: quota.usage.requests,
          limit: quota.limit.requests
        },
        tokens: {
          used: quota.usage.tokens,
          limit: quota.limit.tokens
        },
        cost: {
          used: quota.usage.cost,
          limit: quota.limit.cost
        }
      };
    });
    
    return summary;
  }
  
  /**
   * Estimate cost for a request
   * @param model Model name
   * @param inputTokens Input token count
   * @param outputTokens Output token count
   * @returns Estimated cost
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Find the model in our cost dictionary
    const modelCostInfo = modelCosts[model.toLowerCase()];
    
    if (!modelCostInfo) {
      // If model not found, use a default cost estimate
      return (inputTokens * 0.001) + (outputTokens * 0.002);
    }
    
    // Calculate cost
    const inputCost = (inputTokens / 1000) * modelCostInfo.inputPer1K;
    const outputCost = (outputTokens / 1000) * modelCostInfo.outputPer1K;
    
    return inputCost + outputCost;
  }

  /**
   * Get estimated costs for all models
   * @returns Estimated costs for all models
   */
  getEstimatedCosts(): Record<string, { inputPer1K: number; outputPer1K: number }> {
    return { ...modelCosts };
  }
}

// Create singleton instance
export const apiQuotaManager = new ApiQuotaManager();