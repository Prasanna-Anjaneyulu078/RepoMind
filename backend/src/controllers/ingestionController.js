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

    if (repo.ingestionStatus === 'INGESTING' || repo.ingestionStatus === 'EMBEDDING') {
      const isStalled = repo.ingestionStartedAt && (new Date() - new Date(repo.ingestionStartedAt)) > 10 * 60 * 1000;
      if (isStalled) {
        console.warn(`Repository ${id} appears stalled in ${repo.ingestionStatus}. Allowing retry.`);
        await prisma.repository.update({ where: { id }, data: { ingestionStatus: 'FAILED', lastIngestionError: 'Ingestion stalled and was reset.' } });
      } else {
        return res.status(409).json({ success: false, message: 'Ingestion is already in progress' });
      }
    }
    
    let isUpToDate = false;
    
    if (isSync) {
      try {
        const latestSha = await repositoryIngestionService.getLatestCommitSha(token, repo.owner, repo.name, repo.defaultBranch);
        if (latestSha && repo.latestCommitSha === latestSha) {
          isUpToDate = true;
        }
      } catch (err) {
        console.error('Failed to check latest commit SHA during sync:', err);
      }
    }

    if (isUpToDate) {
      return res.json({ success: true, message: 'Repository is already up to date', upToDate: true });
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
        ingestionStatus: true,
        ingestionStartedAt: true,
        ingestionCompletedAt: true,
        lastIngestionError: true,
        fileCount: true
      }
    });

    if (!repo) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    res.json({ success: true, data: repo });
  } catch(err) {
    next(err);
  }
};

module.exports = {
  startIngestion,
  getIngestionStatus
};
