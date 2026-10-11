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
      console.log('[IngestionRecovery] No active in-flight ingestion jobs to recover.');
    } else {
      console.log(`[IngestionRecovery] Found ${staleRepositories.length} potentially stale in-flight ingestion jobs.`);

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
  }

    // 2. Reconcile persisted status and chunk metrics for all repositories with indexed files
    const indexedRepos = await prisma.repository.findMany({
      where: {
        ingestionStatus: { in: ['INDEXING_COMPLETED', 'QUOTA_BLOCKED', 'EMBEDDING_FAILED', 'COMPLETED'] }
      },
      select: {
        id: true,
        name: true,
        ingestionStatus: true,
        fileIndexingStatus: true,
        embeddingStatus: true,
        totalChunks: true,
        processedChunks: true,
        pendingChunks: true,
        embeddingPauseReason: true,
        nextRetryAt: true
      }
    });

    for (const repo of indexedRepos) {
      const totalChunks = await prisma.fileChunk.count({
        where: { repositoryFile: { repositoryId: repo.id } }
      });
      const processedChunks = await prisma.chunkEmbedding.count({
        where: { fileChunk: { repositoryFile: { repositoryId: repo.id } } }
      });
      const pendingChunks = Math.max(0, totalChunks - processedChunks);

      if (totalChunks > 0 && pendingChunks === 0) {
        if (repo.ingestionStatus !== 'COMPLETED' || repo.embeddingStatus !== 'COMPLETED') {
          console.log(`[IngestionRecovery] Reconciling complete repository ${repo.name} (${repo.id}): COMPLETED`);
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
              nextRetryAt: null
            }
          });
        }
      } else if (totalChunks > 0 && pendingChunks > 0) {
        // Pending chunks remain: ensure status is paused with accurate metrics
        if (repo.pendingChunks !== pendingChunks || repo.totalChunks !== totalChunks || repo.embeddingStatus !== 'PAUSED') {
          console.log(`[IngestionRecovery] Reconciling pending repository ${repo.name} (${repo.id}): ${pendingChunks}/${totalChunks} pending`);
          await prisma.repository.update({
            where: { id: repo.id },
            data: {
              fileIndexingStatus: 'COMPLETED',
              embeddingStatus: 'PAUSED',
              ingestionStatus: 'QUOTA_BLOCKED',
              embeddingPauseReason: repo.embeddingPauseReason || 'QUOTA_EXHAUSTED',
              totalChunks,
              processedChunks,
              pendingChunks,
              nextRetryAt: repo.nextRetryAt || new Date()
            }
          });
        }
      }
    }

    console.log('[IngestionRecovery] Stale ingestion recovery & reconciliation completed.');
  } catch (error) {
    console.error('[IngestionRecovery] Error during recovery operation:', error.message);
  }
};

/**
 * Periodically checks for paused/eligible embedding jobs and resumes them safely
 */
let recoverySchedulerTimer = null;
const activeRecoverySet = new Set();

const checkAndResumeEligibleJobs = async () => {
  try {
    const now = new Date();
    // Find repositories that are paused due to quota or server restart and whose nextRetryAt has passed
    const eligibleRepos = await prisma.repository.findMany({
      where: {
        ingestionStatus: { in: ['INDEXING_COMPLETED', 'QUOTA_BLOCKED', 'EMBEDDING_FAILED'] },
        embeddingStatus: { in: ['PAUSED', 'NOT_STARTED', 'FAILED'] },
        OR: [
          { nextRetryAt: { lte: now } },
          { nextRetryAt: null }
        ]
      },
      take: 2 // Bound concurrency: at most 2 repositories resumed at once
    });

    if (eligibleRepos.length === 0) return;

    const { embedRepositoryChunks, getChunkMetrics } = require('./repositoryIngestionService');

    for (const repo of eligibleRepos) {
      if (activeRecoverySet.has(repo.id)) {
        continue;
      }

      const { totalChunks, processedChunks, pendingChunks } = await getChunkMetrics(repo.id);
      
      if (totalChunks > 0 && pendingChunks === 0) {
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
            nextRetryAt: null
          }
        });
        continue;
      }

      if (pendingChunks === 0) {
        continue;
      }

      activeRecoverySet.add(repo.id);
      console.log(JSON.stringify({
        tag: '[EMBEDDING_DIAGNOSTIC]',
        timestamp: new Date().toISOString(),
        repositoryId: repo.id,
        repositoryName: repo.name,
        stage: 'RECOVERY_RESUME',
        model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
        metrics: { totalChunks, processedChunks, pendingChunks }
      }));

      // Update nextRetryAt forward to prevent concurrent duplicate pickup
      await prisma.repository.update({
        where: { id: repo.id },
        data: {
          totalChunks,
          processedChunks,
          pendingChunks,
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      embedRepositoryChunks(repo.id)
        .catch(err => {
          console.warn(`[AutoRecovery] Resumption for ${repo.id} deferred: ${err.message}`);
        })
        .finally(() => {
          activeRecoverySet.delete(repo.id);
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

