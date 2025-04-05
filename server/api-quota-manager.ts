type ApiService = 'elevenlabs' | 'openai' | 'perplexity' | 'local-llm';

interface QuotaUsage {
  requestsToday: number;
  tokensToday: number;
  requestsThisHour: number;
  lastUpdated: number;
  resetTime: number;
  dailyQuota: number;
  hourlyQuota: number;
  consecutiveFailures?: number; // Track consecutive API failures
  lastFailureTime?: number;     // When the last failure occurred
  backoffUntil?: number;        // Timestamp until which we should back off
}

interface RateLimitInfo {
  isLimited: boolean;
  resetTime: number; // Unix timestamp
  reason: string;
}

/**
 * API Quota Manager to prevent quota exceeded errors
 * Tracks and manages API usage across different services
 * 
 * Enhanced to support tiered fallback architecture with:
 * - Quota tracking for local LLM usage
 * - Exponential backoff for failed API calls
 * - Dynamic quota adjustment based on observed rate limits
 */
export class ApiQuotaManager {
  private quotaMap: Map<ApiService, QuotaUsage>;
  private static instance: ApiQuotaManager;

  private constructor() {
    this.quotaMap = new Map();
    
    // Initialize default values for each service
    // Load from environment variables if available to allow dynamic configuration
    
    // ElevenLabs defaults: 10,000 daily characters, max 50 requests per hour
    const elevenLabsDaily = parseInt(process.env.ELEVENLABS_DAILY_QUOTA || '10000');
    const elevenLabsHourly = parseInt(process.env.ELEVENLABS_HOURLY_QUOTA || '50');
    this.initializeService('elevenlabs', elevenLabsDaily, elevenLabsHourly);
    
    // OpenAI defaults: 100,000 daily tokens, max 200 requests per hour
    const openaiDaily = parseInt(process.env.OPENAI_DAILY_QUOTA || '100000');
    const openaiHourly = parseInt(process.env.OPENAI_HOURLY_QUOTA || '200');
    this.initializeService('openai', openaiDaily, openaiHourly);
    
    // Perplexity defaults: 50,000 daily tokens, max 100 requests per hour
    const perplexityDaily = parseInt(process.env.PERPLEXITY_DAILY_QUOTA || '50000');
    const perplexityHourly = parseInt(process.env.PERPLEXITY_HOURLY_QUOTA || '100');
    this.initializeService('perplexity', perplexityDaily, perplexityHourly);
    
    // Local LLM: very high limits since it doesn't have API restrictions
    // Just track for monitoring and potential resource management
    const localLlmDaily = parseInt(process.env.LOCAL_LLM_DAILY_QUOTA || '1000000');
    const localLlmHourly = parseInt(process.env.LOCAL_LLM_HOURLY_QUOTA || '10000');
    this.initializeService('local-llm', localLlmDaily, localLlmHourly);
  }

  public static getInstance(): ApiQuotaManager {
    if (!ApiQuotaManager.instance) {
      ApiQuotaManager.instance = new ApiQuotaManager();
    }
    return ApiQuotaManager.instance;
  }

  private initializeService(service: ApiService, dailyQuota: number, hourlyQuota: number): void {
    if (!this.quotaMap.has(service)) {
      const now = Date.now();
      const resetTime = this.getNextResetTime();
      
      this.quotaMap.set(service, {
        requestsToday: 0,
        tokensToday: 0,
        requestsThisHour: 0,
        lastUpdated: now,
        resetTime,
        dailyQuota,
        hourlyQuota
      });
    }
  }

  private getNextResetTime(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private getNextHourResetTime(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour.getTime();
  }

  private checkAndResetQuotas(service: ApiService): void {
    const usage = this.quotaMap.get(service);
    if (!usage) return;

    const now = Date.now();
    
    // Reset daily quota if needed
    if (now > usage.resetTime) {
      console.log(`Resetting daily quota for ${service}`);
      usage.requestsToday = 0;
      usage.tokensToday = 0;
      usage.resetTime = this.getNextResetTime();
    }
    
    // Reset hourly quota if needed (one hour from last update)
    if (now > usage.lastUpdated + (60 * 60 * 1000)) {
      console.log(`Resetting hourly quota for ${service}`);
      usage.requestsThisHour = 0;
    }
    
    usage.lastUpdated = now;
    this.quotaMap.set(service, usage);
  }

  public checkRateLimit(service: ApiService, estimatedTokens: number = 0): RateLimitInfo {
    // Ensure service exists in our map
    this.initializeService(service, 100000, 200);
    
    // Check and reset quotas if needed
    this.checkAndResetQuotas(service);
    
    const usage = this.quotaMap.get(service)!;
    
    // Check if service is in backoff mode due to recent failures
    const now = Date.now();
    if (usage.backoffUntil && now < usage.backoffUntil) {
      const waitTime = Math.ceil((usage.backoffUntil - now) / 1000); // seconds
      return {
        isLimited: true,
        resetTime: usage.backoffUntil,
        reason: `Service ${service} is in backoff mode due to recent failures. Try again in ${waitTime} seconds.`
      };
    }
    
    // Check hourly limit
    if (usage.requestsThisHour >= usage.hourlyQuota) {
      const resetTime = usage.lastUpdated + (60 * 60 * 1000);
      return {
        isLimited: true,
        resetTime,
        reason: `Hourly request limit reached for ${service}. Limit resets at ${new Date(resetTime).toLocaleTimeString()}`
      };
    }
    
    // Check daily token/request limit
    if (usage.tokensToday + estimatedTokens > usage.dailyQuota) {
      return {
        isLimited: true,
        resetTime: usage.resetTime,
        reason: `Daily quota limit reached for ${service}. Quota resets at midnight.`
      };
    }
    
    return { isLimited: false, resetTime: 0, reason: '' };
  }
  
  /**
   * Record an API failure and implement exponential backoff
   * @param service The API service that failed
   * @param errorMessage The error message (optional)
   */
  public recordApiFailure(service: ApiService, errorMessage?: string): void {
    this.checkAndResetQuotas(service);
    
    const usage = this.quotaMap.get(service)!;
    const now = Date.now();
    
    // Initialize failure tracking if not present
    if (usage.consecutiveFailures === undefined) {
      usage.consecutiveFailures = 0;
    }
    
    // Increment consecutive failures
    usage.consecutiveFailures++;
    usage.lastFailureTime = now;
    
    // Implement exponential backoff
    if (usage.consecutiveFailures > 3) {
      // Calculate backoff time: 2^(failures-3) * 30 seconds
      // This gives: 4th failure = 30s, 5th = 1m, 6th = 2m, 7th = 4m, etc.
      const backoffSeconds = Math.min(1800, Math.pow(2, usage.consecutiveFailures - 3) * 30);
      usage.backoffUntil = now + (backoffSeconds * 1000);
      
      console.log(`Service ${service} failed ${usage.consecutiveFailures} times. ` +
                 `Backing off for ${backoffSeconds} seconds until ${new Date(usage.backoffUntil).toLocaleTimeString()}`);
      
      // Reduce quota to prevent further overuse
      const reduceBy = Math.min(0.5, 0.1 * usage.consecutiveFailures);
      this.adjustQuota(
        service,
        Math.floor(usage.dailyQuota * (1 - reduceBy)),
        Math.floor(usage.hourlyQuota * (1 - reduceBy))
      );
      
      // Log detailed error if provided
      if (errorMessage) {
        console.log(`Service ${service} error details: ${errorMessage}`);
      }
    } else {
      console.log(`Service ${service} failed ${usage.consecutiveFailures} times.`);
    }
    
    this.quotaMap.set(service, usage);
  }
  
  /**
   * Record a successful API call, resetting consecutive failures
   * @param service The API service that was used successfully
   * @param tokensUsed Number of tokens/credits used in this call
   */
  public recordApiUsage(service: ApiService, tokensUsed: number = 0): void {
    this.checkAndResetQuotas(service);
    
    const usage = this.quotaMap.get(service)!;
    usage.requestsToday += 1;
    usage.requestsThisHour += 1;
    usage.tokensToday += tokensUsed;
    
    // Reset consecutive failures counter on successful call
    if (usage.consecutiveFailures && usage.consecutiveFailures > 0) {
      console.log(`Service ${service} successful call, resetting failure count from ${usage.consecutiveFailures} to 0`);
      usage.consecutiveFailures = 0;
      usage.backoffUntil = undefined; // Remove any backoff restriction
    }
    
    this.quotaMap.set(service, usage);
    
    console.log(`API Usage (${service}): ${usage.requestsToday}/${usage.dailyQuota} requests today, ${usage.requestsThisHour}/${usage.hourlyQuota} this hour`);
  }

  public adjustQuota(service: ApiService, dailyQuota: number, hourlyQuota: number): void {
    const usage = this.quotaMap.get(service);
    if (usage) {
      usage.dailyQuota = dailyQuota;
      usage.hourlyQuota = hourlyQuota;
      this.quotaMap.set(service, usage);
      console.log(`Quota for ${service} adjusted to ${dailyQuota} daily, ${hourlyQuota} hourly`);
    }
  }

  public getUsageSummary(): Record<string, { used: number, total: number, hourlyUsed: number, hourlyTotal: number }> {
    const summary: Record<string, { used: number, total: number, hourlyUsed: number, hourlyTotal: number }> = {};
    
    // Use Array.from to avoid the Map iterator issue
    Array.from(this.quotaMap.entries()).forEach(([service, usage]) => {
      summary[service] = {
        used: usage.tokensToday,
        total: usage.dailyQuota,
        hourlyUsed: usage.requestsThisHour,
        hourlyTotal: usage.hourlyQuota
      };
    });
    
    return summary;
  }

  public resetUsageForService(service: ApiService): void {
    const usage = this.quotaMap.get(service);
    if (usage) {
      usage.requestsToday = 0;
      usage.tokensToday = 0;
      usage.requestsThisHour = 0;
      usage.lastUpdated = Date.now();
      this.quotaMap.set(service, usage);
      console.log(`Usage reset for ${service}`);
    }
  }
}

// Export singleton instance
export const apiQuotaManager = ApiQuotaManager.getInstance();