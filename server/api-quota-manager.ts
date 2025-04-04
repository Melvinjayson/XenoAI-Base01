type ApiService = 'elevenlabs' | 'openai' | 'perplexity';

interface QuotaUsage {
  requestsToday: number;
  tokensToday: number;
  requestsThisHour: number;
  lastUpdated: number;
  resetTime: number;
  dailyQuota: number;
  hourlyQuota: number;
}

interface RateLimitInfo {
  isLimited: boolean;
  resetTime: number; // Unix timestamp
  reason: string;
}

/**
 * API Quota Manager to prevent quota exceeded errors
 * Tracks and manages API usage across different services
 */
export class ApiQuotaManager {
  private quotaMap: Map<ApiService, QuotaUsage>;
  private static instance: ApiQuotaManager;

  private constructor() {
    this.quotaMap = new Map();
    
    // Initialize default values for each service
    this.initializeService('elevenlabs', 10000, 50); // 10,000 daily quota, 50 requests per hour
    this.initializeService('openai', 100000, 200); // 100,000 daily quota, 200 requests per hour
    this.initializeService('perplexity', 50000, 100); // 50,000 daily quota, 100 requests per hour
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

  public recordApiUsage(service: ApiService, tokensUsed: number = 0): void {
    this.checkAndResetQuotas(service);
    
    const usage = this.quotaMap.get(service)!;
    usage.requestsToday += 1;
    usage.requestsThisHour += 1;
    usage.tokensToday += tokensUsed;
    
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