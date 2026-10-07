const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/database');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSION = 768; // Based on schema vector(768)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate embedding for a single text chunk with exponential backoff
 */
const generateEmbedding = async (text, retries = 5, initialDelay = 3000) => {
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
      const isRateLimit = error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
      
      if (isRateLimit && i < retries - 1) {
        const waitTime = initialDelay * Math.pow(2, i) + Math.random() * 1000; // jitter
        console.warn(`[EmbeddingService] API rate limit (429). Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
};

/**
 * Batch embed chunks natively using Gemini API array support with retry logic
 */
const generateBatchEmbeddings = async (texts, retries = 5, initialDelay = 3000) => {
  if (!texts || texts.length === 0) return [];
  
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
      const isRateLimit = error.status === 429 || (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')));
      
      if (isRateLimit && i < retries - 1) {
        const retryAfter = error.response?.headers?.['retry-after'];
        let waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (initialDelay * Math.pow(2, i) + Math.random() * 1000);
        console.warn(`[EmbeddingService] API rate limit (429) for batch of ${texts.length}. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${retries})`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
};

/**
 * Embed a specific file chunk and persist to pgvector
 */
const embedChunk = async (chunkId, content) => {
  const vector = await generateEmbedding(content);
  if (!vector || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Invalid embedding vector dimension. Expected ${EMBEDDING_DIMENSION}`);
  }

  // Use raw SQL to insert the vector since Prisma doesn't natively map Unsupported("vector") in standard create()
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
 * Persist multiple chunks using true API batching
 */
const embedChunks = async (chunks, onProgress = null) => {
  // Use a sensible configurable batch size (up to 100 is typically safe for Gemini depending on token limits)
  const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || '20', 10);
  let successCount = 0;
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    try {
      const vectors = await generateBatchEmbeddings(batch.map(c => c.content));
      
      const validEmbeddings = vectors.map((v, idx) => ({ chunk: batch[idx], vector: v }))
                                     .filter(e => e && e.vector && e.vector.length === EMBEDDING_DIMENSION);

      if (validEmbeddings.length > 0) {
        // Batch DB writes inside a transaction for efficiency
        await prisma.$transaction(
          validEmbeddings.map(e => 
            prisma.$executeRaw`
              INSERT INTO "ChunkEmbedding" (id, "fileChunkId", model, dimension, embedding, "updatedAt")
              VALUES (
                gen_random_uuid(),
                ${e.chunk.id},
                ${EMBEDDING_MODEL},
                ${EMBEDDING_DIMENSION},
                ${e.vector}::vector,
                NOW()
              )
              ON CONFLICT ("fileChunkId", model)
              DO UPDATE SET embedding = EXCLUDED.embedding, "updatedAt" = NOW()
            `
          )
        );
        successCount += validEmbeddings.length;
        if (onProgress) onProgress(validEmbeddings.length);
      }
    } catch (e) {
      console.error(`Failed to embed batch of chunks: ${e.message}`);
    }

    if (i + BATCH_SIZE < chunks.length) {
      await delay(500); // Gentle throttling between consecutive batch requests
    }
  }
  return successCount;
};

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  embedChunk,
  embedChunks,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSION
};
