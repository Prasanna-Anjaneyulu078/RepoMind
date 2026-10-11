const prisma = require('../config/database');

// Default timeout: 30 minutes
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

const recoverStaleIngestions = async () => {
  const timeoutMs = process.env.INGESTION_STALE_TIMEOUT_MS 
    ? parseInt(process.env.INGESTION_STALE_TIMEOUT_MS, 10) 
    : DEFAULT_TIMEOUT_MS;

  const thresholdTime = new Date(Date.now() - timeoutMs);

  try {
    // Find repositories that are stuck in an active state but haven't been updated recently.
    const staleRepositories = await prisma.repository.findMany({
      where: {
        ingestionStatus: {
          in: ['INGESTING', 'EMBEDDING']
        },
        updatedAt: {
          lt: thresholdTime
        }
      },
      select: {
        id: true,
        name: true,
        ingestionStatus: true,
        updatedAt: true
      }
    });

    if (staleRepositories.length === 0) {
      console.log('[IngestionRecovery] No stale ingestion jobs found.');
      return;
    }

    console.log(`[IngestionRecovery] Found ${staleRepositories.length} potentially stale ingestion jobs.`);

    for (const repo of staleRepositories) {
      const fileCount = await prisma.repositoryFile.count({
        where: { repositoryId: repo.id }
      });

      if (fileCount > 0) {
        // Files are already saved in DB! Do not fail the whole repository.
        const pendingChunks = await prisma.$queryRaw`
          SELECT c.id FROM "FileChunk" c
          JOIN "RepositoryFile" f ON c."repositoryFileId" = f.id
          LEFT JOIN "ChunkEmbedding" e ON c.id = e."fileChunkId"
          WHERE f."repositoryId" = ${repo.id} AND e.id IS NULL
          LIMIT 1
        `;

        if (pendingChunks.length === 0) {
          console.log(`[IngestionRecovery] Repository ${repo.name} (${repo.id}) has all chunks embedded: ${repo.ingestionStatus} -> COMPLETED`);
          await prisma.repository.update({
            where: { id: repo.id },
            data: {
              ingestionStatus: 'COMPLETED',
              lastIngestionError: null,
              ingestionCompletedAt: new Date()
            }
          });
        } else {
          console.log(`[IngestionRecovery] Repository ${repo.name} (${repo.id}) has ${fileCount} files indexed: ${repo.ingestionStatus} -> INDEXING_COMPLETED`);
          await prisma.repository.update({
            where: { id: repo.id },
            data: {
              ingestionStatus: 'INDEXING_COMPLETED',
              lastIngestionError: 'Indexing completed; semantic embedding was paused during restart. You can browse files or click Sync to resume embedding.',
              ingestionCompletedAt: new Date()
            }
          });
        }
      } else {
        console.log(`[IngestionRecovery] Recovering unfinished repository ${repo.name} (${repo.id}): ${repo.ingestionStatus} -> NOT_INGESTED`);
        await prisma.repository.update({
          where: { id: repo.id },
          data: {
            ingestionStatus: 'NOT_INGESTED',
            lastIngestionError: 'Repository indexing was interrupted before files were processed. Please start indexing again.',
            ingestionCompletedAt: new Date()
          }
        });
      }
    }

    console.log('[IngestionRecovery] Stale ingestion recovery completed.');
  } catch (error) {
    console.error('[IngestionRecovery] Error during recovery operation:', error.message);
  }
};

module.exports = {
  recoverStaleIngestions
};
