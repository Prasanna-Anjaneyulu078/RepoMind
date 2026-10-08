const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/database');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSION = 768; // Based on schema vector(768)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Global concurrency limiter for embedding calls to prevent retry storms
const createSemaphore = (max) => {
  let counter = 0;
  let waiting = [];
  return {
    acquire: () => new Promise(resolve => {
      if (counter < max) {
        counter++;
        resolve();
      } else {
        waiting.push(resolve);
      }
    }),
    release: () => {
      if (waiting.length > 0) {
        const next = waiting.shift();
        next();
      } else {
        counter--;
      }
    }
  };
};

// Limit to 2 concurrent Gemini batch requests globally across all ingestion workers
const embeddingSemaphore = createSemaphore(2);

/**
 * Generate embedding for a single text chunk with exponential backoff
 */
const generateEmbedding = async (text, retries = 5, initialDelay = 3000) => {
  await embeddingSemaphore.acquire();
  try {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text,
          config: { outputDimensionality: EMBEDDING_DIMENSION }
        });
        if (!response.embeddings || response.embeddings.length === 0) {
          throw new Error('No embeddings returned by Gemini API');
        }
        return response.embeddings[0].values;
      } catch (error) {
        const errorMessage = error.message || '';
        const isDailyQuotaExhausted = error.status === 429 && (errorMessage.toLowerCase().includes('per day') || errorMessage.toLowerCase().includes('daily'));
        const isTransientRateLimit = error.status === 429 && !isDailyQuotaExhausted;
        const isTransient503 = error.status === 503;
        
        if (isDailyQuotaExhausted) {
          const quotaError = new Error(`Daily quota exhausted: ${errorMessage}`);
          quotaError.isQuotaExhausted = true;
          throw quotaError;
        }

        if ((isTransientRateLimit || isTransient503) && i < retries - 1) {
          const waitTime = initialDelay * Math.pow(2, i) + Math.random() * 1000; // jitter
          console.warn(`[EmbeddingService] Transient API error (${error.status}). Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
          await delay(waitTime);
        } else {
          throw error;
        }
      }
    }
  } finally {
    embeddingSemaphore.release();
  }
};

/**
 * Batch embed chunks natively using Gemini API array support with retry logic
 */
const generateBatchEmbeddings = async (texts, retries = 5, initialDelay = 3000) => {
  if (!texts || texts.length === 0) return [];
  
  await embeddingSemaphore.acquire();
  try {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: texts, // Natively accepts array of strings for batching
          config: { outputDimensionality: EMBEDDING_DIMENSION }
        });
        
        if (!response.embeddings || response.embeddings.length === 0) {
          throw new Error('No embeddings returned by Gemini API');
        }
        
        return response.embeddings.map(e => e.values);
      } catch (error) {
        const errorMessage = error.message || '';
        const isDailyQuotaExhausted = error.status === 429 && (errorMessage.toLowerCase().includes('per day') || errorMessage.toLowerCase().includes('daily'));
        const isTransientRateLimit = error.status === 429 && !isDailyQuotaExhausted;
        const isTransient503 = error.status === 503;
        
        if (isDailyQuotaExhausted) {
          const quotaError = new Error(`Daily quota exhausted: ${errorMessage}`);
          quotaError.isQuotaExhausted = true;
          throw quotaError;
        }

        if ((isTransientRateLimit || isTransient503) && i < retries - 1) {
          const retryAfter = error.response?.headers?.['retry-after'];
          let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (initialDelay * Math.pow(2, i) + Math.random() * 1000);
          console.warn(`[EmbeddingService] Transient API error (${error.status}) for batch of ${texts.length}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
          await delay(waitTime);
        } else {
          throw error;
        }
      }
    }
  } finally {
    embeddingSemaphore.release();
  }
};

let embeddingQueue = [];
let embeddingTimer = null;

const processQueueBatch = async () => {
  const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10);
  
  const batch = embeddingQueue.splice(0, BATCH_SIZE);
  if (batch.length === 0) return;
  
  if (embeddingQueue.length > 0) {
    checkQueue(); // Schedule the next batch if there are still items
  }

  const texts = batch.map(item => item.text);
  
  try {
    const vectors = await generateBatchEmbeddings(texts);
    batch.forEach((item, idx) => item.onSuccess(vectors[idx]));
  } catch (error) {
    console.error(`Failed to generate embeddings for batch: ${error.message}`);
    batch.forEach(item => item.onError(error));
  }
};

const checkQueue = () => {
  const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10);
  
  if (embeddingQueue.length >= BATCH_SIZE) {
    if (embeddingTimer) {
      clearTimeout(embeddingTimer);
      embeddingTimer = null;
    }
    processQueueBatch();
  } else if (embeddingQueue.length > 0 && !embeddingTimer) {
    embeddingTimer = setTimeout(() => {
      embeddingTimer = null;
      processQueueBatch();
    }, 100); // 100ms debounce
  }
};

/**
 * Generate embeddings for an array of chunk contents, batching internally across files.
 * Does NOT write to the database. Returns an array of vectors.
 */
const generateEmbeddingsForChunks = (chunks) => {
  if (!chunks || chunks.length === 0) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const job = {
      chunks,
      vectors: new Array(chunks.length),
      completed: 0,
      failed: false,
      resolve,
      reject
    };

    chunks.forEach((chunk, index) => {
      embeddingQueue.push({
        text: chunk.content,
        onSuccess: (vector) => {
          if (job.failed) return;
          job.vectors[index] = vector;
          job.completed++;
          if (job.completed === job.chunks.length) {
            job.resolve(job.vectors);
          }
        },
        onError: (err) => {
          if (!job.failed) {
            job.failed = true;
            job.reject(new Error(`Embedding generation failed: ${err.message}`));
          }
        }
      });
    });

    checkQueue();
  });
};

/**
 * Embed a specific file chunk and persist to pgvector
 */
const embedChunk = async (chunkId, content) => {
  const vector = await generateEmbedding(content);
  if (!vector || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Invalid embedding vector dimension. Expected ${EMBEDDING_DIMENSION}`);
  }

  await prisma.$executeRaw`
    INSERT INTO "ChunkEmbedding" (id, "fileChunkId", model, dimension, embedding, "updatedAt")
    VALUES (
      gen_random_uuid(),
      ${chunkId},
      ${EMBEDDING_MODEL},
      ${EMBEDDING_DIMENSION},
      ${vector}::vector,
      NOW()
    )
    ON CONFLICT ("fileChunkId", model)
    DO UPDATE SET embedding = EXCLUDED.embedding, "updatedAt" = NOW()
  `;
};

/**
 * Embed an array of chunks in batches and persist to pgvector
 */
const embedChunks = async (chunks, onProgress) => {
  const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10);
  const CONCURRENCY = parseInt(process.env.EMBEDDING_CONCURRENCY || '1', 10);
  
  const batches = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }
  
  const asyncPool = async (poolLimit, array, iteratorFn) => {
    const ret = [];
    const executing = [];
    for (const item of array) {
      const p = Promise.resolve().then(() => iteratorFn(item));
      ret.push(p);
      if (poolLimit <= array.length) {
        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
        executing.push(e);
        if (executing.length >= poolLimit) {
          await Promise.race(executing);
        }
      }
    }
    return Promise.all(ret);
  };

  await asyncPool(CONCURRENCY, batches, async (batch) => {
    const texts = batch.map(c => c.content);
    
    // This will throw if rate limit is hit and retries are exhausted.
    // That's acceptable; the caller will catch it, stop processing, 
    // and the system can resume later since we process in batches.
    const vectors = await generateBatchEmbeddings(texts);
    
    await prisma.$transaction(
      batch.map((chunk, idx) => {
        const vector = vectors[idx];
        return prisma.$executeRaw`
          INSERT INTO "ChunkEmbedding" (id, "fileChunkId", model, dimension, embedding, "updatedAt")
          VALUES (
            gen_random_uuid(),
            ${chunk.id},
            ${EMBEDDING_MODEL},
            ${EMBEDDING_DIMENSION},
            ${vector}::vector,
            NOW()
          )
          ON CONFLICT ("fileChunkId", model)
          DO UPDATE SET embedding = EXCLUDED.embedding, "updatedAt" = NOW()
        `;
      })
    );
    
    if (onProgress) {
      onProgress(batch.length);
    }
  });
};

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  generateEmbeddingsForChunks,
  embedChunk,
  embedChunks,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION
};
