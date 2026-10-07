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

  // 2. Generate Query Embedding
  const queryVector = await generateEmbedding(query);
  if (!queryVector) {
    throw new Error('Failed to generate query embedding');
  }

  // 3. pgvector similarity search using cosine distance (<=>)
  // We join FileChunk and RepositoryFile to ensure we only search within the target repository
  const results = await prisma.$queryRaw`
    SELECT 
      fc.id AS "chunkId",
      rf.path AS "filePath",
      fc."startLine",
      fc."endLine",
      fc.content,
      1 - (ce.embedding <=> ${queryVector}::vector) AS similarity
    FROM "ChunkEmbedding" ce
    JOIN "FileChunk" fc ON ce."fileChunkId" = fc.id
    JOIN "RepositoryFile" rf ON fc."repositoryFileId" = rf.id
    WHERE rf."repositoryId" = ${repositoryId}
    ORDER BY ce.embedding <=> ${queryVector}::vector
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
