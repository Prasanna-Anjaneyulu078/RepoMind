const geminiService = require('./geminiService');
const rateLimiter = require('./rateLimiterService');
const prisma = require('../config/database');
const { Prisma } = require('@prisma/client');

const EMBEDDING_DIMENSION = 768; // Based on schema vector(768)

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate embedding for a single text query (e.g. for Ask Repo search)
 * Runs through rate limiter to protect RPM/TPM.
 */
const generateEmbedding = async (text, preferredModel = null) => {
  const estimatedTokens = rateLimiter.estimateTokens(text);
  await rateLimiter.acquire(estimatedTokens);

  try {
    const { embeddings, model } = await geminiService.embedContent(text, EMBEDDING_DIMENSION, preferredModel);
    return { vector: embeddings[0].values, model, estimatedTokens };
  } catch (err) {
    if (err.isRateLimited || err.pauseReason === 'RATE_LIMIT') {
      rateLimiter.reportRateLimit();
    }
    throw err;
  } finally {
    rateLimiter.release();
  }
};

/**
 * Batch embed unique texts with rate limiter protection
 */
const generateBatchEmbeddings = async (texts) => {
  if (!texts || texts.length === 0) return { vectors: [], model: null, estimatedTokens: 0 };
  
  const estimatedTokens = rateLimiter.estimateTokens(texts);
  await rateLimiter.acquire(estimatedTokens);

  try {
    const { embeddings, model } = await geminiService.embedContent(texts, EMBEDDING_DIMENSION);
    return { vectors: embeddings.map(e => e.values), model, estimatedTokens };
  } catch (err) {
    if (err.isRateLimited || err.pauseReason === 'RATE_LIMIT') {
      rateLimiter.reportRateLimit();
    }
    throw err;
  } finally {
    rateLimiter.release();
  }
};

/**
 * Embed an array of chunks in batches with hash-based reuse, deduplication, and rate limiting.
 * Ensures strict repository ownership isolation: only reuses embeddings from within the same repository.
 */
const embedChunks = async (repositoryId, chunks, onProgress) => {
  if (!chunks || chunks.length === 0) {
    return { total: 0, reused: 0, newlyEmbedded: 0, tokens: 0 };
  }

  const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE, 10) || 10;
  const targetModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

  let totalReused = 0;
  let totalNewlyEmbedded = 0;
  let totalTokens = 0;

  // Process in micro-batches to keep memory and lock durations small
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    // 1. Check for existing embeddings in the same repository by contentHash (Hash-based Reuse)
    const hashesInBatch = [...new Set(batch.map(c => c.contentHash).filter(Boolean))];
    const cachedVectorMap = new Map(); // contentHash -> vector string

    if (hashesInBatch.length > 0) {
      try {
        const existingEmbeddings = await prisma.$queryRaw`
          SELECT DISTINCT ON (ce."contentHash") 
            ce."contentHash", 
            ce.embedding::text as "vectorSql"
          FROM "ChunkEmbedding" ce
          JOIN "FileChunk" fc ON ce."fileChunkId" = fc.id
          JOIN "RepositoryFile" rf ON fc."repositoryFileId" = rf.id
          WHERE rf."repositoryId" = ${repositoryId}
            AND ce."contentHash" IN (${Prisma.join(hashesInBatch)})
            AND ce.model = ${targetModel}
            AND ce.dimension = ${EMBEDDING_DIMENSION}
        `;

        for (const row of existingEmbeddings) {
          if (row.contentHash && row.vectorSql) {
            cachedVectorMap.set(row.contentHash, row.vectorSql);
          }
        }
      } catch (cacheErr) {
        // Fallback gracefully to direct embedding if cache lookup fails
        console.warn(`[Embedding] Content hash cache lookup error: ${cacheErr.message}`);
      }
    }

    // 2. Separate chunks into cached vs needing external embedding
    const chunksNeedingEmbedding = [];
    const uniqueTextsToEmbed = [];
    const hashToTextIndex = new Map();

    for (const chunk of batch) {
      if (chunk.contentHash && cachedVectorMap.has(chunk.contentHash)) {
        // Reusable within repository! Persist immediately without external call
        const vectorSql = cachedVectorMap.get(chunk.contentHash);
        await prisma.$executeRaw`
          INSERT INTO "ChunkEmbedding" (id, "fileChunkId", model, dimension, "contentHash", embedding, "updatedAt")
          VALUES (
            gen_random_uuid(),
            ${chunk.id},
            ${targetModel},
            ${EMBEDDING_DIMENSION},
            ${chunk.contentHash},
            ${vectorSql}::vector,
            NOW()
          )
          ON CONFLICT ("fileChunkId", model)
          DO UPDATE SET embedding = EXCLUDED.embedding, "contentHash" = EXCLUDED."contentHash", "updatedAt" = NOW()
        `;
        totalReused++;
      } else {
        chunksNeedingEmbedding.push(chunk);
        
        // Deduplicate identical content inside the same batch
        const hash = chunk.contentHash || chunk.content;
        if (!hashToTextIndex.has(hash)) {
          hashToTextIndex.set(hash, uniqueTextsToEmbed.length);
          uniqueTextsToEmbed.push(chunk.content);
        }
      }
    }

    // 3. Call Gemini only for unique texts not already cached
    if (uniqueTextsToEmbed.length > 0) {
      const { vectors, model, estimatedTokens } = await generateBatchEmbeddings(uniqueTextsToEmbed);
      totalTokens += estimatedTokens;

      for (const chunk of chunksNeedingEmbedding) {
        const hash = chunk.contentHash || chunk.content;
        const textIdx = hashToTextIndex.get(hash);
        const vector = vectors[textIdx];

        if (!vector) {
          throw new Error(`Missing embedding vector for chunk ${chunk.id}`);
        }

        const vectorSql = `[${vector.join(',')}]`;
        const effectiveModel = model || targetModel;

        await prisma.$executeRaw`
          INSERT INTO "ChunkEmbedding" (id, "fileChunkId", model, dimension, "contentHash", embedding, "updatedAt")
          VALUES (
            gen_random_uuid(),
            ${chunk.id},
            ${effectiveModel},
            ${EMBEDDING_DIMENSION},
            ${chunk.contentHash || null},
            ${vectorSql}::vector,
            NOW()
          )
          ON CONFLICT ("fileChunkId", model)
          DO UPDATE SET embedding = EXCLUDED.embedding, "contentHash" = EXCLUDED."contentHash", "updatedAt" = NOW()
        `;

        // Cache in memory for subsequent chunks in the same run
        if (chunk.contentHash) {
          cachedVectorMap.set(chunk.contentHash, vectorSql);
        }
        totalNewlyEmbedded++;
      }
    }

    if (onProgress) {
      onProgress(batch.length, {
        reused: totalReused,
        newlyEmbedded: totalNewlyEmbedded,
        tokens: totalTokens
      });
    }

    // Small polite pacing delay
    await delay(50);
  }

  return {
    total: chunks.length,
    reused: totalReused,
    newlyEmbedded: totalNewlyEmbedded,
    tokens: totalTokens
  };
};

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  embedChunks,
  EMBEDDING_DIMENSION
};
