const { GoogleGenAI } = require('@google/genai');

const KNOWN_MODEL_ALIASES = {
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash-8b': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-exp': 'gemini-2.5-flash',
  'gemini-2.5-flash-lite': 'gemini-flash-latest',
  'gemini-1.0-pro': 'gemini-2.5-flash'
};

const CANONICAL_GENERATION_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro'
];

function resolveModelList(envValue, defaultPrimary = 'gemini-2.5-flash') {
  const rawList = (envValue || defaultPrimary)
    .split(',')
    .map(m => m.trim().replace(/^models\//, ''))
    .filter(Boolean);

  const resolved = [];
  for (const m of rawList) {
    const target = KNOWN_MODEL_ALIASES[m] || m;
    if (!resolved.includes(target)) {
      resolved.push(target);
    }
  }

  for (const fallback of CANONICAL_GENERATION_FALLBACKS) {
    if (!resolved.includes(fallback)) {
      resolved.push(fallback);
    }
  }

  return resolved;
}

class GeminiService {
  constructor() {
    this.primaryEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
    
    const fallbackEnv = process.env.GEMINI_EMBEDDING_FALLBACK_MODELS || '';
    this.fallbackEmbeddingModels = fallbackEnv.split(',').map(m => m.trim()).filter(m => m);
    
    this.analysisModels = resolveModelList(process.env.GEMINI_ANALYSIS_MODELS, 'gemini-2.5-flash');
    this.chatModels = resolveModelList(process.env.GEMINI_CHAT_MODELS, 'gemini-2.5-flash');
    
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Cooldown state for models: { 'model-name': expiryTimestamp }
    this.modelCooldowns = {};
    
    this.COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes for model-specific issues
  }

  isModelOnCooldown(modelName) {
    if (this.modelCooldowns[modelName] && Date.now() < this.modelCooldowns[modelName]) {
      return true;
    }
    return false;
  }

  setCooldown(modelName) {
    this.modelCooldowns[modelName] = Date.now() + this.COOLDOWN_DURATION;
  }

  classifyError(error) {
    let status = error.status || error.code || error.error?.code;
    let msg = (error.message || '').toLowerCase();
    
    if (typeof error.message === 'string' && error.message.includes('"code":')) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) {
          status = parsed.error.code || status;
          msg = `${msg} ${parsed.error.message || ''} ${parsed.error.status || ''}`.toLowerCase();
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }
    
    if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission') || msg.includes('unauthenticated')) {
      return 'AUTH_ERROR';
    }
    if (status === 404 || msg.includes('not found') || msg.includes('is not supported')) {
      return 'MODEL_NOT_FOUND';
    }
    if (status === 429 || msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate-limit')) {
      if (msg.includes('billing') || msg.includes('plan') || msg.includes('credit')) {
        return 'BILLING_LIMIT';
      }
      // Standard burst / RPM rate limit
      if (msg.includes('per minute') || msg.includes('rpm') || msg.includes('rate limit') || msg.includes('rate-limit')) {
        return 'RATE_LIMIT';
      }
      // True hard quota exhaustion: daily quota or zero limit
      if (msg.includes('per day') || msg.includes('daily') || msg.includes('limit: 0') || msg.includes('resource_exhausted')) {
        return 'QUOTA_EXHAUSTED';
      }
      return 'RATE_LIMIT';
    }
    if (status === 500 || status === 503 || status === 504) {
      return 'SERVICE_UNAVAILABLE';
    }
    return 'UNKNOWN_ERROR';
  }

  async executeWithFallback(models, operationName, operationFn) {
    let lastError = null;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      
      if (this.isModelOnCooldown(model)) {
        console.log(`[GeminiService] Skipping model ${model} for ${operationName} (on cooldown)`);
        continue;
      }

      let attempt = 0;
      const maxAttempts = 3;
      
      while (attempt < maxAttempts) {
        try {
          const result = await operationFn(model);
          return { result, model };
        } catch (error) {
          lastError = error;
          const errorType = this.classifyError(error);
          console.warn(`[GeminiService] ${operationName} with model ${model} failed (attempt ${attempt + 1}/${maxAttempts}): [${errorType}] ${error.message}`);
          
          if (errorType === 'AUTH_ERROR') {
            // Configuration / authentication problem - do not rotate or retry endlessly
            const authErr = new Error(`Gemini authentication failure: ${error.message}`);
            authErr.status = 401;
            authErr.isAuthError = true;
            throw authErr;
          }

          if (errorType === 'MODEL_NOT_FOUND') {
            this.setCooldown(model);
            break; // Try next model
          }

          if (errorType === 'QUOTA_EXHAUSTED') {
            this.setCooldown(model);
            break; // Try next model
          }

          if (errorType === 'RATE_LIMIT' || errorType === 'SERVICE_UNAVAILABLE') {
            attempt++;
            if (attempt >= maxAttempts) {
              this.setCooldown(model);
              break; // Retries exhausted for this model, try next
            }

            // Exponential backoff with jitter
            const retryAfter = error.response?.headers?.['retry-after'];
            const baseDelay = retryAfter ? parseInt(retryAfter, 10) * 1000 : (1500 * Math.pow(2, attempt));
            const jitter = Math.floor(Math.random() * 800);
            const delay = Math.min(baseDelay + jitter, 15000);

            console.log(`[GeminiService] Rate limit or transient error. Backing off ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Unknown error, try next attempt or fail
            attempt++;
            if (attempt >= maxAttempts) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
    }
    
    const errorType = lastError ? this.classifyError(lastError) : 'UNKNOWN_ERROR';
    const err = new Error(`All configured models for ${operationName} failed or are exhausted: ${lastError ? lastError.message : 'Unknown error'}`);
    err.isQuotaExhausted = (errorType === 'QUOTA_EXHAUSTED' || errorType === 'BILLING_LIMIT');
    err.isRateLimited = (errorType === 'RATE_LIMIT');
    err.isServiceUnavailable = (errorType === 'SERVICE_UNAVAILABLE');
    err.pauseReason = errorType;
    err.originalError = lastError;
    throw err;
  }


  async embedContent(texts, outputDimensionality, preferredModel = null) {
    const defaultModels = [this.primaryEmbeddingModel, ...this.fallbackEmbeddingModels].filter(Boolean);
    const models = preferredModel ? [preferredModel, ...defaultModels.filter(m => m !== preferredModel)] : defaultModels;
    const isArray = Array.isArray(texts);
    const items = isArray ? texts : [texts];

    const { result, model } = await this.executeWithFallback(models, 'embedContent', async (mdl) => {
      // Bounded concurrency execution to avoid triggering burst RPM limits
      const CONCURRENCY = 2;
      const results = new Array(items.length);
      let index = 0;

      const worker = async () => {
        while (index < items.length) {
          const currentIndex = index++;
          const text = items[currentIndex];

          const response = await this.ai.models.embedContent({
            model: mdl,
            contents: text,
            config: { outputDimensionality }
          });

          if (!response.embeddings || response.embeddings.length === 0) {
            throw new Error('No embeddings returned by Gemini API');
          }
          results[currentIndex] = response.embeddings[0];

          // Small 50ms pacing delay between items
          if (items.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      };

      const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
      await Promise.all(workers);

      return isArray ? results : results[0];
    });

    return { embeddings: isArray ? result : [result], model };
  }

  async generateContent(options, role = 'analysis') {
    const models = role === 'chat' ? this.chatModels : this.analysisModels;
    const { result, model } = await this.executeWithFallback(models, 'generateContent', async (mdl) => {
      return this.ai.models.generateContent({
        ...options,
        model: mdl
      });
    });
    return { response: result, model };
  }
}

module.exports = new GeminiService();
