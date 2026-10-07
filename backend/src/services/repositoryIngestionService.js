const axios = require('axios');
const prisma = require('../config/database');
const fileFilterService = require('./fileFilterService');
const chunkingService = require('./chunkingService');
const embeddingService = require('./embeddingService');

const GITHUB_API_URL = 'https://api.github.com';

const getLatestCommitSha = async (token, owner, repo, branch) => {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${branch}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.get(url, { headers });
  return response.data.sha;
};

const updateIngestionStatus = async (repositoryId, status, error = null, fileCount = undefined, latestCommitSha = undefined) => {
  const data = { ingestionStatus: status };
  if (status === 'INGESTING') {
    data.ingestionStartedAt = new Date();
    data.lastIngestionError = null;
  } else if (status === 'COMPLETED' || status === 'FAILED') {
    data.ingestionCompletedAt = new Date();
  }
  if (error) {
    data.lastIngestionError = error.message || String(error);
  }
  if (fileCount !== undefined) {
    data.fileCount = fileCount;
  }
  if (latestCommitSha !== undefined) {
    data.latestCommitSha = latestCommitSha;
  }
  
  await prisma.repository.update({
    where: { id: repositoryId },
    data
  });
};

const getRepositoryTree = async (token, owner, repo, branch) => {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTreeRecursively = async (treeSha, basePath = '') => {
    const dirUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${treeSha}`;
    const response = await axios.get(dirUrl, { headers });
    let allItems = [];
    for (const item of response.data.tree) {
      const itemPath = basePath ? `${basePath}/${item.path}` : item.path;
      const newItem = { ...item, path: itemPath };
      allItems.push(newItem);
      if (item.type === 'tree') {
        // Skip explicitly excluded dirs to avoid unnecessary API calls
        const EXCLUDED_DIRS = new Set([
          'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out', 
          'target', 'bin', 'obj', 'vendor', '.cache'
        ]);
        if (!EXCLUDED_DIRS.has(item.path)) {
          const subItems = await fetchTreeRecursively(item.sha, itemPath);
          allItems.push(...subItems);
        }
      }
    }
    return allItems;
  };

  try {
    const response = await axios.get(url, { headers });
    if (response.data.truncated) {
      console.log('Tree truncated. Falling back to recursive directory fetch.');
      return await fetchTreeRecursively(branch);
    }
    return response.data.tree;
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
      try {
        const retryResponse = await axios.get(url, { headers });
        if (retryResponse.data.truncated) {
          console.log('Tree truncated on retry. Falling back to recursive directory fetch.');
          return await fetchTreeRecursively(branch);
        }
        return retryResponse.data.tree;
      } catch (retryErr) {
        throw new Error(`GitHub API error during tree fetch: ${retryErr.message}`);
      }
    }
    throw new Error(`Failed to fetch repository tree: ${err.message}`);
  }
};

const fetchFileContent = async (token, owner, repo, path) => {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`;
  const config = {
    headers: { 
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'application/vnd.github.v3.raw'
    },
    responseType: 'text',
    transformResponse: [data => data]
  };
  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
      try {
        const retryConfig = { headers: { Accept: 'application/vnd.github.v3.raw' }, responseType: 'text', transformResponse: [data => data] };
        const retryResponse = await axios.get(url, retryConfig);
        return retryResponse.data;
      } catch (retryErr) {
        if (retryErr.isAxiosError) {
          throw retryErr;
        }
        throw new Error(`GitHub API error during file fetch: ${retryErr.message}`);
      }
    }
    throw err;
  }
};

const embedRepositoryChunks = async (repositoryId) => {
  await updateIngestionStatus(repositoryId, 'EMBEDDING');
  try {
    // Find chunks that don't have embeddings yet
    const chunksWithoutEmbeddings = await prisma.$queryRaw`
      SELECT c.* FROM "FileChunk" c
      JOIN "RepositoryFile" f ON c."repositoryFileId" = f.id
      LEFT JOIN "ChunkEmbedding" e ON c.id = e."fileChunkId"
      WHERE f."repositoryId" = ${repositoryId} AND e.id IS NULL
    `;
    
    if (chunksWithoutEmbeddings.length > 0) {
      await embeddingService.embedChunks(chunksWithoutEmbeddings);
    }
    
    await updateIngestionStatus(repositoryId, 'COMPLETED');
  } catch (err) {
    console.error('Repository embedding failed:', err);
    await updateIngestionStatus(repositoryId, 'EMBEDDING_FAILED', err);
    throw err;
  }
};

const ingestRepository = async (token, repositoryId, userId) => {
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId }
  });

  if (!repo) throw new Error('Repository not found or access denied');
  
  if (repo.ingestionStatus === 'INGESTING' || repo.ingestionStatus === 'EMBEDDING') {
    throw new Error('Repository is currently processing');
  }

  // Idempotent resume for embedding if indexing already finished
  if (repo.ingestionStatus === 'INDEXING_COMPLETED' || repo.ingestionStatus === 'EMBEDDING_FAILED') {
    return await embedRepositoryChunks(repositoryId);
  }

  await updateIngestionStatus(repositoryId, 'INGESTING');

  try {
    const latestCommitSha = await getLatestCommitSha(token, repo.owner, repo.name, repo.defaultBranch);
    const tree = await getRepositoryTree(token, repo.owner, repo.name, repo.defaultBranch);
    
    // Filter files
    const ingestableFiles = tree.filter(item => 
      item.type === 'blob' && fileFilterService.isIngestableFile(item.path, item.size)
    );

    const existingFiles = await prisma.repositoryFile.findMany({
      where: { repositoryId }
    });
    
    const existingMap = new Map(existingFiles.map(f => [f.path, f]));
    const currentPaths = new Set(ingestableFiles.map(f => f.path));

    // Delete files that are no longer in the repository tree
    const pathsToDelete = existingFiles.filter(f => !currentPaths.has(f.path)).map(f => f.id);
    if (pathsToDelete.length > 0) {
      await prisma.repositoryFile.deleteMany({
        where: { id: { in: pathsToDelete } }
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const file of ingestableFiles) {
      const existing = existingMap.get(file.path);

      if (existing && existing.sha === file.sha) {
        processedCount++;
        continue;
      }

      try {
        const rawContent = await fetchFileContent(token, repo.owner, repo.name, file.path);
        
        // Deep binary check
        if (rawContent.indexOf('\0') !== -1) {
          console.warn(`File ${file.path} contains null bytes, treating as binary and skipping.`);
          skippedCount++;
          continue; // Safely skip this file
        }

        const normalizedContent = rawContent.replace(/\r\n/g, '\n');
        const lastDotIndex = file.path.lastIndexOf('.');
        const ext = lastDotIndex !== -1 && lastDotIndex > file.path.lastIndexOf('/') ? file.path.substring(lastDotIndex) : '';
        const filename = file.path.split('/').pop();
        const language = fileFilterService.getFileLanguage(ext, filename);
        const chunks = chunkingService.chunkContent(normalizedContent);

        try {
          await prisma.$transaction(async (tx) => {
            let repFileId;

            if (existing) {
              await tx.repositoryFile.update({
                where: { id: existing.id },
                data: {
                  size: file.size || 0,
                  sha: file.sha,
                  content: normalizedContent,
                  extension: ext,
                  language
                }
              });
              repFileId = existing.id;
              await tx.fileChunk.deleteMany({
                where: { repositoryFileId: repFileId }
              });
            } else {
              const newFile = await tx.repositoryFile.create({
                data: {
                  repositoryId: repo.id,
                  path: file.path,
                  name: file.path.split('/').pop(),
                  extension: ext,
                  language,
                  size: file.size || 0,
                  sha: file.sha,
                  content: normalizedContent
                }
              });
              repFileId = newFile.id;
            }

            if (chunks.length > 0) {
              await tx.fileChunk.createMany({
                data: chunks.map(c => ({
                  repositoryFileId: repFileId,
                  ...c
                }))
              });
            }
          });
        } catch (dbErr) {
          throw new Error(`Failed to persist file ${file.path}: ${dbErr.message}`);
        }

        processedCount++;
      } catch (fileErr) {
        failedCount++;
        if (fileErr.response && (fileErr.response.status === 401 || fileErr.response.status === 403 || fileErr.response.status === 429)) {
            throw new Error(`Unrecoverable GitHub API error during file fetch (${fileErr.response.status}): ${fileErr.message}`);
        }
        console.error(`Failed to ingest file ${file.path}: ${fileErr.message}`);
      }
    }

    if (failedCount > 0 && processedCount === 0 && skippedCount === 0) {
        throw new Error('All files failed to ingest. Check GitHub access or rate limits.');
    }

    // Mark indexing completed successfully BEFORE trying to embed
    await updateIngestionStatus(repositoryId, 'INDEXING_COMPLETED', null, processedCount + skippedCount, latestCommitSha);

    // Proceed to embedding phase independently
    await embedRepositoryChunks(repositoryId);

  } catch (err) {
    console.error('Ingestion failed:', err);
    // Only overwrite if it wasn't an embedding failure (which would have already set EMBEDDING_FAILED)
    const repoCheck = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (repoCheck && repoCheck.ingestionStatus !== 'EMBEDDING_FAILED') {
      await updateIngestionStatus(repositoryId, 'FAILED', err);
    }
    throw err;
  }
};

module.exports = {
  getLatestCommitSha,
  ingestRepository,
  updateIngestionStatus
};
