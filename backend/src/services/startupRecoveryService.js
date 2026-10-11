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
        const totalChunks = await prisma.fileChunk.count({
          where: { repositoryFile: { repositoryId: repo.id } }
        });
        const processedChunks = await prisma.chunkEmbedding.count({
          where: { fileChunk: { repositoryFile: { repositoryId: repo.id } } }
        });
        const pendingChunks = Math.max(0, totalChunks - processedChunks);

        if (pendingChunks === 0) {
          console.log(`[IngestionRecovery] Repository ${repo.name} (${repo.id}) has all chunks embedded: ${repo.ingestionStatus} -> COMPLETED`);
          await prisma.repository.update({
            where: { id: repo.id },
            data: {
              ingestionStatus: 'COMPLETED',
              fileIndexingStatus: 'COMPLETED',
              embeddingStatus: 'COMPLETED',
              totalChunks,
              processedChunks,
              pendingChunks: 0,
              embeddingPauseReason: null,
              lastIngestionError: null,
              ingestionCompletedAt: new Date()
            }
          });
        } else {
          console.log(`[IngestionRecovery] Repository ${repo.name} (${repo.id}) has ${fileCount} files indexed, ${pendingChunks} chunks pending: preserving as INDEXING_COMPLETED`);
          await prisma.repository.update({
            where: { id: repo.id },
            data: {
              ingestionStatus: 'INDEXING_COMPLETED',
              fileIndexingStatus: 'COMPLETED',
              embeddingStatus: 'PAUSED',
              embeddingPauseReason: 'SERVER_RESTARTED',
              totalChunks,
              processedChunks,
              pendingChunks,
              nextRetryAt: new Date(Date.now() + 60 * 1000), // Eligible to resume after 1 minute
              lastIngestionError: 'Indexing completed; semantic embedding was paused during server restart. Files remain available in Code Explorer.',
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
            fileIndexingStatus: 'NOT_INDEXED',
            embeddingStatus: 'NOT_STARTED',
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

/**
 * Periodically checks for paused/eligible embedding jobs and resumes them safely
 */
let recoverySchedulerTimer = null;

const checkAndResumeEligibleJobs = async () => {
  try {
    const now = new Date();
    // Find repositories that are paused due to quota or server restart and whose nextRetryAt has passed
    const eligibleRepos = await prisma.repository.findMany({
      where: {
        ingestionStatus: { in: ['INDEXING_COMPLETED', 'QUOTA_BLOCKED'] },
        embeddingStatus: { in: ['PAUSED', 'NOT_STARTED'] },
        pendingChunks: { gt: 0 },
        OR: [
          { nextRetryAt: { lte: now } },
          { nextRetryAt: null }
        ]
      },
      take: 2 // Bound concurrency: at most 2 repositories resumed at once
    });

    if (eligibleRepos.length === 0) return;

    const { embedRepositoryChunks } = require('./repositoryIngestionService');

    for (const repo of eligibleRepos) {
      console.log(`[AutoRecovery] Resuming pending embeddings for repository ${repo.name} (${repo.id})...`);
      // Update nextRetryAt forward to prevent concurrent duplicate pickup
      await prisma.repository.update({
        where: { id: repo.id },
        data: {
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      embedRepositoryChunks(repo.id).catch(err => {
        console.warn(`[AutoRecovery] Resumption for ${repo.id} deferred: ${err.message}`);
      });
    }
  } catch (err) {
    console.error('[AutoRecovery] Error in checkAndResumeEligibleJobs:', err.message);
  }
};

const startRecoveryScheduler = (intervalMs = 60 * 1000) => {
  if (recoverySchedulerTimer) return;
  recoverySchedulerTimer = setInterval(checkAndResumeEligibleJobs, intervalMs);
};

const stopRecoveryScheduler = () => {
  if (recoverySchedulerTimer) {
    clearInterval(recoverySchedulerTimer);
    recoverySchedulerTimer = null;
  }
};

module.exports = {
  recoverStaleIngestions,
  checkAndResumeEligibleJobs,
  startRecoveryScheduler,
  stopRecoveryScheduler
};

