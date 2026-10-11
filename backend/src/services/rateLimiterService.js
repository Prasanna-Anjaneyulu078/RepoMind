/**
 * rateLimiterService.js
 * Centralized, token-bucket / sliding-window rate limiter for Gemini Embedding API.
 * Tracks both Requests-Per-Minute (RPM) and Tokens-Per-Minute (TPM).
 */

class EmbeddingRateLimiter {
  constructor() {
    this.maxRpm = parseInt(process.env.EMBEDDING_MAX_RPM, 10) || 30; // Free tier standard RPM
    this.maxTpm = parseInt(process.env.EMBEDDING_MAX_TPM, 10) || 120000; // Free tier TPM conservative ceiling
    this.windowMs = 60 * 1000; // 1-minute sliding window

    // Array of { timestamp: number, tokens: number }
    this.requestLog = [];

    // Additional cooldown penalty timestamp (e.g. after receiving a 429 from provider)
    this.cooldownUntil = 0;

    // Concurrency limit
    this.maxConcurrency = parseInt(process.env.EMBEDDING_CONCURRENCY, 10) || 2;
    this.activeRequests = 0;
    this.waitQueue = [];

    // Observability metrics
    this.metrics = {
      totalRequests: 0,
      totalEstimatedTokens: 0,
      totalThrottledDelayMs: 0,
      rateLimitHits: 0
    };
  }

  /**
   * Conservative estimate of token count from code/text length
   * Code typically has ~3.5 to 4.0 characters per token in Gemini tokenizers.
   */
  estimateTokens(textOrTexts) {
    if (!textOrTexts) return 0;
    if (Array.isArray(textOrTexts)) {
      return textOrTexts.reduce((sum, t) => sum + Math.ceil((t ? t.length : 0) / 3.8), 0);
    }
    return Math.ceil(textOrTexts.length / 3.8);
  }

  pruneOldEntries() {
    const cutoff = Date.now() - this.windowMs;
    while (this.requestLog.length > 0 && this.requestLog[0].timestamp < cutoff) {
      this.requestLog.shift();
    }
  }

  getCurrentWindowUsage() {
    this.pruneOldEntries();
    const requests = this.requestLog.length;
    const tokens = this.requestLog.reduce((acc, entry) => acc + entry.tokens, 0);
    return { requests, tokens };
  }

  async acquire(estimatedTokens = 100) {
    // 1. Concurrency control
    if (this.activeRequests >= this.maxConcurrency) {
      await new Promise(resolve => this.waitQueue.push(resolve));
    }
    this.activeRequests++;

    try {
      while (true) {
        const now = Date.now();

        // 2. Check provider cooldown
        if (now < this.cooldownUntil) {
          const waitTime = this.cooldownUntil - now;
          this.metrics.totalThrottledDelayMs += waitTime;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // 3. Check sliding-window RPM and TPM
        this.pruneOldEntries();
        const usage = this.getCurrentWindowUsage();

        let waitTime = 0;

        if (usage.requests + 1 > this.maxRpm) {
          // Window is full on requests: wait until oldest entry drops out
          const oldest = this.requestLog[0];
          if (oldest) {
            waitTime = Math.max(50, (oldest.timestamp + this.windowMs) - now + 50);
          } else {
            waitTime = 1000;
          }
        } else if (usage.tokens + estimatedTokens > this.maxTpm) {
          // Window is full on tokens
          const oldest = this.requestLog[0];
          if (oldest) {
            waitTime = Math.max(50, (oldest.timestamp + this.windowMs) - now + 50);
          } else {
            waitTime = 1000;
          }
        }

        if (waitTime > 0) {
          this.metrics.totalThrottledDelayMs += waitTime;
          await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 10000)));
          continue;
        }

        // Allowed: record request entry
        this.requestLog.push({ timestamp: Date.now(), tokens: estimatedTokens });
        this.metrics.totalRequests++;
        this.metrics.totalEstimatedTokens += estimatedTokens;
        break;
      }
    } catch (err) {
      this.release();
      throw err;
    }
  }

  release() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next();
    }
  }

  /**
   * Signal a provider-level rate limit or 429 to enforce backoff across all workers
   */
  reportRateLimit(retryAfterMs = null) {
    this.metrics.rateLimitHits++;
    const defaultDelay = 15000 + Math.floor(Math.random() * 5000); // 15-20s with jitter
    const delay = retryAfterMs ? Math.max(retryAfterMs, 5000) : defaultDelay;
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay);
    console.warn(`[RateLimiter] Rate limit signal received. Cooldown engaged for ${Math.round(delay / 1000)}s.`);
  }

  getMetrics() {
    const usage = this.getCurrentWindowUsage();
    return {
      ...this.metrics,
      currentWindowRequests: usage.requests,
      currentWindowTokens: usage.tokens,
      maxRpm: this.maxRpm,
      maxTpm: this.maxTpm
    };
  }
}

module.exports = new EmbeddingRateLimiter();
