const { GoogleGenAI } = require('@google/genai');

class GeminiService {
  constructor() {
    this.primaryEmbeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
    
    const fallbackEnv = process.env.GEMINI_EMBEDDING_FALLBACK_MODELS || '';
    this.fallbackEmbeddingModels = fallbackEnv.split(',').map(m => m.trim()).filter(m => m);
    
    const analysisEnv = process.env.GEMINI_ANALYSIS_MODELS || 'gemini-2.5-flash';
    this.analysisModels = analysisEnv.split(',').map(m => m.trim()).filter(m => m);
    
    const chatEnv = process.env.GEMINI_CHAT_MODELS || 'gemini-2.5-flash';
    this.chatModels = chatEnv.split(',').map(m => m.trim()).filter(m => m);
    
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
    const status = error.status;
    const msg = (error.message || '').toLowerCase();
    
    if (status === 429) {
      if (msg.includes('per day') || msg.includes('daily') || msg.includes('quota')) {
        return 'QUOTA_EXHAUSTED';
      }
      return 'RATE_LIMIT';
    }
    if (status === 400 && msg.includes('not found')) {
      return 'MODEL_NOT_FOUND';
    }
    if (status === 403 || status === 401 || msg.includes('api key') || msg.includes('permission')) {
      return 'AUTH_ERROR';
    }
    if (status === 500 || status === 503) {
      return 'SERVICE_UNAVAILABLE';
    }
    return 'UNKNOWN_ERROR';
  }

  async executeWithFallback(models, operationName, operationFn) {
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
          console.log(`[GeminiService] Executing ${operationName} with model ${model} (Attempt ${attempt + 1})`);
          const result = await operationFn(model);
          return { result, model };
        } catch (error) {
          const errorType = this.classifyError(error);
          console.warn(`[GeminiService] Error during ${operationName} with model ${model}: ${errorType} - ${error.message}`);
          
          if (errorType === 'QUOTA_EXHAUSTED' || errorType === 'MODEL_NOT_FOUND' || errorType === 'SERVICE_UNAVAILABLE') {
            this.setCooldown(model);
            break; // Try next model
          } else if (errorType === 'RATE_LIMIT') {
            attempt++;
            if (attempt >= maxAttempts) {
              this.setCooldown(model);
              break; // Try next model
            }
            const retryAfter = error.response?.headers?.['retry-after'];
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : (2000 * Math.pow(2, attempt) + Math.random() * 1000);
            console.log(`[GeminiService] Rate limited. Waiting ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (errorType === 'AUTH_ERROR') {
            throw error;
          } else {
            throw error;
          }
        }
      }
    }
    
    const err = new Error(`All configured models for ${operationName} failed or are exhausted.`);
    err.isQuotaExhausted = true;
    throw err;
  }

  async embedContent(texts, outputDimensionality) {
    const models = [this.primaryEmbeddingModel, ...this.fallbackEmbeddingModels];
    const { result, model } = await this.executeWithFallback(models, 'embedContent', async (mdl) => {
      const response = await this.ai.models.embedContent({
        model: mdl,
        contents: texts,
        config: { outputDimensionality }
      });
      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error('No embeddings returned by Gemini API');
      }
      return response.embeddings;
    });
    return { embeddings: result, model };
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
