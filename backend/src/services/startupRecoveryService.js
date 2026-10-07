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
    // 'updatedAt' is updated whenever the status changes (INGESTING -> EMBEDDING), 
    // which serves as a good lease indicator.
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
      console.log(`[IngestionRecovery] Recovering repository ${repo.name} (${repo.id}): ${repo.ingestionStatus} \u2192 FAILED`);
      
      await prisma.repository.update({
        where: { id: repo.id },
        data: {
          ingestionStatus: 'FAILED',
          lastIngestionError: 'Stale ingestion detected after server restart or timeout. Please start indexing again.',
          ingestionCompletedAt: new Date()
        }
      });
    }

    console.log('[IngestionRecovery] Stale ingestion recovery completed.');
  } catch (error) {
    console.error('[IngestionRecovery] Error during recovery operation:', error.message);
    // We don't throw here to avoid crashing the server startup
  }
};

module.exports = {
  recoverStaleIngestions
};
