const repositoryIngestionService = require('../services/repositoryIngestionService');
const prisma = require('../config/database');

const startIngestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const token = req.session.accessToken;
    const userId = req.user.id;
    const isSync = req.path.endsWith('/sync');

    if (!token) {
      return res.status(401).json({ success: false, message: 'GitHub access token missing' });
    }

    const repo = await prisma.repository.findFirst({
      where: { id, userId }
    });

    if (!repo) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    // Only truly running states are QUEUED, INGESTING, EMBEDDING
    const ACTIVE_STATES = ['QUEUED', 'INGESTING', 'EMBEDDING'];
    if (ACTIVE_STATES.includes(repo.ingestionStatus)) {
      const isStalled = repo.ingestionStartedAt && (new Date() - new Date(repo.ingestionStartedAt)) > 10 * 60 * 1000;
      if (isStalled) {
        console.warn(`Repository ${id} appears stalled in ${repo.ingestionStatus}. Allowing retry.`);
        await prisma.repository.update({ where: { id }, data: { ingestionStatus: 'FAILED', lastIngestionError: 'Ingestion stalled and was reset.' } });
      } else {
        return res.status(409).json({ success: false, message: 'Ingestion is already in progress' });
      }
    }
    
    // Atomic lock to prevent duplicate ingestion jobs
    const lockResult = await prisma.repository.updateMany({
      where: { 
        id, 
        userId, 
        ingestionStatus: { notIn: ACTIVE_STATES }
      },
      data: { ingestionStatus: 'QUEUED', ingestionStartedAt: new Date() }
    });

    if (lockResult.count === 0) {
      return res.status(409).json({ success: false, message: 'Ingestion is already in progress' });
    }
    
    // Start asynchronously without blocking response
    repositoryIngestionService.ingestRepository(token, id, userId).catch(err => {
      console.error('Background ingestion error:', err);
    });

    res.json({ success: true, message: isSync ? 'Synchronization started' : 'Ingestion started', upToDate: false });
  } catch(err) {
    next(err);
  }
};

const getIngestionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const repo = await prisma.repository.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        ingestionStatus: true,
        ingestionStartedAt: true,
        ingestionCompletedAt: true,
        lastIngestionError: true,
        fileCount: true,
        fileIndexingStatus: true,
        embeddingStatus: true,
        embeddingPauseReason: true,
        totalChunks: true,
        processedChunks: true,
        failedChunks: true,
        pendingChunks: true,
        lastSuccessfulEmbeddingAt: true,
        lastAttemptedEmbeddingAt: true,
        nextRetryAt: true
      }
    });

    if (!repo) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    // Always fetch live DB chunk counts to guarantee 100% accuracy across restarts
    const dbTotalChunks = await prisma.fileChunk.count({
      where: { repositoryFile: { repositoryId: id } }
    });

    const dbEmbeddedChunks = await prisma.chunkEmbedding.count({
      where: { fileChunk: { repositoryFile: { repositoryId: id } } }
    });

    const dbPendingChunks = Math.max(0, dbTotalChunks - dbEmbeddedChunks);

    let detailedProgress = repositoryIngestionService.getProgress(id);

    // If no in-memory progress (e.g. after restart or completed), calculate DB-level counts
    if (!detailedProgress) {
      detailedProgress = {
        stage: repo.ingestionStatus === 'COMPLETED' ? 'Repository ready' :
               repo.ingestionStatus === 'INDEXING_COMPLETED' ? 'Files indexed' :
               repo.ingestionStatus === 'QUOTA_BLOCKED' ? 'Quota reached (embeddings paused)' :
               repo.ingestionStatus === 'EMBEDDING' ? 'Generating embeddings' :
               repo.ingestionStatus === 'INGESTING' ? 'Processing files' : 'Idle',
        discovered: repo.fileCount || 0,
        processed: repo.fileCount || 0,
        failed: repo.failedChunks || 0,
        skipped: 0,
        currentFile: '',
        totalChunks: dbTotalChunks,
        embeddedChunks: dbEmbeddedChunks,
        pendingChunks: dbPendingChunks
      };
    } else {
      detailedProgress.totalChunks = dbTotalChunks || detailedProgress.totalChunks;
      detailedProgress.embeddedChunks = dbEmbeddedChunks || detailedProgress.embeddedChunks;
      detailedProgress.pendingChunks = dbPendingChunks;
    }

    res.json({ 
      success: true, 
      data: {
        ...repo,
        totalChunks: dbTotalChunks,
        processedChunks: dbEmbeddedChunks,
        pendingChunks: dbPendingChunks,
        detailedProgress
      } 

    });
  } catch(err) {
    next(err);
  }
};

module.exports = {
  startIngestion,
  getIngestionStatus
};
