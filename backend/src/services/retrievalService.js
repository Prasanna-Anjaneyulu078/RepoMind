const prisma = require('../config/database');
const { generateEmbedding } = require('./embeddingService');

/**
 * Perform a semantic similarity search across a user's specific repository
 */
const searchRepository = async (userId, repositoryId, query, topK = 5) => {
  if (!query || query.trim() === '') {
    throw new Error('Query cannot be empty');
  }
  
  const limit = Math.min(topK, 50); // Cap topK higher to retrieve more candidates before filtering

  // 1. Verify Repository Ownership
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId }
  });

  if (!repository || repository.userId !== userId) {
    throw new Error('Repository not found or unauthorized');
  }

  // 2. Check if repository has any embeddings available
  const embeddingCount = await prisma.chunkEmbedding.count({
    where: {
      fileChunk: {
        repositoryFile: {
          repositoryId
        }
      }
    }
  });

  if (embeddingCount === 0) {
    console.log(`[Retrieval] Repository ${repositoryId} has 0 chunk embeddings. Returning empty results.`);
    return [];
  }

  // 3. Generate Query Embedding
  const queryEmbeddingResult = await generateEmbedding(query);
  if (!queryEmbeddingResult || !queryEmbeddingResult.vector) {
    throw new Error('Failed to generate query embedding');
  }

  const { vector, model } = queryEmbeddingResult;
  const vectorSql = `[${vector.join(',')}]`;

  // 4. pgvector similarity search using cosine distance (<=>)
  // We join FileChunk and RepositoryFile to ensure we only search within the target repository
  const results = await prisma.$queryRaw`
    SELECT 
      fc.id AS "chunkId",
      rf.path AS "filePath",
      fc."startLine",
      fc."endLine",
      fc.content,
      1 - (ce.embedding <=> ${vectorSql}::vector) AS similarity
    FROM "ChunkEmbedding" ce
    JOIN "FileChunk" fc ON ce."fileChunkId" = fc.id
    JOIN "RepositoryFile" rf ON fc."repositoryFileId" = rf.id
    WHERE rf."repositoryId" = ${repositoryId}
      AND ce.model = ${model}
    ORDER BY ce.embedding <=> ${vectorSql}::vector
    LIMIT ${limit}
  `;

  return results.map(r => ({
    chunkId: r.chunkId,
    filePath: r.filePath,
    startLine: r.startLine,
    endLine: r.endLine,
    content: r.content,
    similarity: Number(r.similarity)
  }));
};

module.exports = {
  searchRepository
};
