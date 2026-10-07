const githubService = require('../services/githubService');
const repositoryService = require('../services/repositoryService');
const repositoryIngestionService = require('../services/repositoryIngestionService');
const prisma = require('../config/database'); // required for explicit duplicate check

const discoverRepositories = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 20, 100);
    const token = req.session.accessToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'GitHub access token missing from session' });
    }

    const githubRepos = await githubService.getRepositories(token, page, perPage);
    
    // Map to a cleaner format
    const data = githubRepos.map(repo => ({
      githubRepositoryId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      language: repo.language,
      updatedAt: repo.updated_at
    }));

    res.json({ success: true, data });
  } catch(err) {
    next(err);
  }
};

const connectRepository = async (req, res, next) => {
  try {
    const { url, githubRepositoryId } = req.body;
    const token = req.session.accessToken;

    let repoDetails;

    if (url) {
      let cleanUrl = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
      cleanUrl = cleanUrl.replace(/^https?:\/\/github\.com\//i, '');
      cleanUrl = cleanUrl.replace(/^github\.com\//i, '');
      
      const parts = cleanUrl.split('/');
      if (parts.length !== 2) {
        return res.status(400).json({ success: false, message: 'Invalid GitHub repository URL' });
      }
      
      const [owner, name] = parts;
      repoDetails = await githubService.getRepositoryByFullName(token, owner, name);
    } else if (githubRepositoryId) {
      repoDetails = await githubService.getRepositoryById(token, githubRepositoryId);
    } else {
      return res.status(400).json({ success: false, message: 'url or githubRepositoryId is required' });
    }

    // Save to PostgreSQL
    const repoData = {
      userId: req.user.id,
      githubRepositoryId: String(repoDetails.id),
      owner: repoDetails.owner.login,
      name: repoDetails.name,
      fullName: repoDetails.full_name,
      description: repoDetails.description,
      defaultBranch: repoDetails.default_branch,
      isPrivate: repoDetails.private,
      htmlUrl: repoDetails.html_url
    };

    // Check if the user already connected this repo
    const existingRepo = await prisma.repository.findUnique({
      where: {
        userId_githubRepositoryId: {
          userId: req.user.id,
          githubRepositoryId: String(repoDetails.id)
        }
      }
    });

    if (existingRepo) {
      return res.status(409).json({ success: false, message: 'Repository already connected' });
    }

    // Set status to QUEUED during creation
    repoData.ingestionStatus = 'QUEUED';

    const repo = await repositoryService.createRepository(repoData);

    // Automatically start ingestion in the background
    repositoryIngestionService.ingestRepository(token, repo.id, req.user.id).catch(err => {
      console.error('Background ingestion error during connection:', err);
    });

    res.json({ success: true, data: repo });
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ success: false, message: 'Repository not found or inaccessible on GitHub' });
    }
    next(err);
  }
};

const listConnectedRepositories = async (req, res, next) => {
  try {
    if (req.query.page) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const skip = (page - 1) * limit;
      const search = req.query.search || '';
      
      const { repositories, total } = await repositoryService.findRepositoriesByUserId(req.user.id, skip, limit, search);
      const totalPages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: repositories,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalRepositories: total,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      });
    }

    const skip = parseInt(req.query.skip) || 0;
    const take = Math.min(parseInt(req.query.take) || 50, 100);

    const { repositories } = await repositoryService.findRepositoriesByUserId(req.user.id, skip, take);
    res.json({ success: true, data: repositories });
  } catch(err) {
    next(err);
  }
};

const deleteRepository = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if the repository exists and belongs to the user
    const repo = await prisma.repository.findUnique({
      where: { id }
    });

    if (!repo) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    if (repo.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Perform an atomic transaction to ensure no partial deletions
    // Prisma's onDelete: Cascade handles the foreign keys at the DB level,
    // but explicit transactional deletion ensures the application state is completely synced.
    await prisma.$transaction(async (tx) => {
      // 1. Delete Conversations (which cascades to ConversationMessage)
      await tx.conversation.deleteMany({
        where: { repositoryId: id }
      });

      // 2. Delete RepositoryFiles (which cascades to FileChunk and ChunkEmbedding)
      // This is primarily handled by DB cascades, but running it in the transaction
      // guarantees atomic cleanup even if background ingestion is running.
      await tx.repositoryFile.deleteMany({
        where: { repositoryId: id }
      });

      // 3. Finally, delete the Repository itself
      await tx.repository.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: 'Repository removed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  discoverRepositories,
  connectRepository,
  listConnectedRepositories,
  deleteRepository
};
