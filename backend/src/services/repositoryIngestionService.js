const axios = require('axios');
const prisma = require('../config/database');
const fileFilterService = require('./fileFilterService');
const chunkingService = require('./chunkingService');
const embeddingService = require('./embeddingService');

const GITHUB_API_URL = 'https://api.github.com';

const progressStore = new Map();

const getProgress = (repositoryId) => {
  return progressStore.get(repositoryId) || null;
};

const getFallbackToken = (userToken) => userToken || process.env.GITHUB_ACCESS_TOKEN;

const getLatestCommitSha = async (token, owner, repo, branch) => {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/commits/${branch}`;
  const effectiveToken = getFallbackToken(token);
  const headers = effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {};
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
  const effectiveToken = getFallbackToken(token);
  const headers = effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {};

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

const fetchFileContent = async (token, owner, repo, branch, path, retries = 3) => {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      const rawConfig = {
        headers: token ? { Authorization: `token ${token}` } : {},
        responseType: 'text',
        transformResponse: [data => data]
      };
      const response = await axios.get(rawUrl, rawConfig);
      return response.data;
    } catch (rawErr) {
      try {
        const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const effectiveToken = getFallbackToken(token);
        const config = {
          headers: { 
            ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
            Accept: 'application/vnd.github.v3.raw'
          },
          responseType: 'text',
          transformResponse: [data => data]
        };
        const response = await axios.get(url, config);
        return response.data;
      } catch (err) {
        if (err.response && [401, 403, 404].includes(err.response.status)) {
          // If it's a 403 rate limit, we might want to retry, but GitHub uses 403 for rate limits.
          if (err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] !== '0') {
            throw err; // It's a real 403, not a rate limit
          }
          if (err.response.status === 401 || err.response.status === 404) {
            throw err;
          }
        }
        
        attempt++;
        if (attempt > retries) throw new Error(`Failed to fetch file content: ${err.message}`);
        
        const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Indexing] GitHub fetch failed for ${path}, retrying in ${Math.round(backoff)}ms (Attempt ${attempt}/${retries})`);
        await sleep(backoff);
      }
    }
  }
};

const embedRepositoryChunks = async (repositoryId) => {
  const startEmbeddingTime = Date.now();
  await updateIngestionStatus(repositoryId, 'EMBEDDING');
  try {
    // Find chunks that don't have embeddings yet
    const chunksWithoutEmbeddings = await prisma.$queryRaw`
      SELECT c.* FROM "FileChunk" c
      JOIN "RepositoryFile" f ON c."repositoryFileId" = f.id
      LEFT JOIN "ChunkEmbedding" e ON c.id = e."fileChunkId"
      WHERE f."repositoryId" = ${repositoryId} AND e.id IS NULL
    `;
    
    const progress = progressStore.get(repositoryId);
    if (progress) {
      progress.stage = 'Generating embeddings';
      progress.totalChunks = chunksWithoutEmbeddings.length;
      progress.embeddedChunks = 0;
    }

    if (chunksWithoutEmbeddings.length > 0) {
      await embeddingService.embedChunks(chunksWithoutEmbeddings, (embedded) => {
         if (progress) progress.embeddedChunks += embedded;
      });
    }
    
    if (progress) progress.stage = 'Repository ready';
    
    console.log(`[Indexing] Embedding completed in ${((Date.now() - startEmbeddingTime)/1000).toFixed(1)}s`);
    
    // Only update to COMPLETED if not already updated by another process
    const repoCheck = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (repoCheck && repoCheck.ingestionStatus === 'EMBEDDING') {
      await updateIngestionStatus(repositoryId, 'COMPLETED');
    }
  } catch (err) {
    if (err.isQuotaExhausted) {
      console.warn('Embedding quota exhausted, deferring remaining chunks:', err.message);
      await updateIngestionStatus(repositoryId, 'EMBEDDING_QUOTA_EXHAUSTED', err);
    } else {
      console.error('Repository embedding failed:', err);
      await updateIngestionStatus(repositoryId, 'EMBEDDING_FAILED', err);
    }
    // Do not throw the error upwards, allow the ingestion pipeline to finish gracefully
  } finally {
    setTimeout(() => progressStore.delete(repositoryId), 5 * 60 * 1000); // Clear after 5 mins
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

  // Idempotent resume for embedding: just run the full idempotent pipeline
  if (repo.ingestionStatus === 'INDEXING_COMPLETED' || repo.ingestionStatus === 'EMBEDDING_FAILED' || repo.ingestionStatus === 'EMBEDDING_QUOTA_EXHAUSTED') {
    // Reset status to allow the idempotent ingestion to proceed
    await updateIngestionStatus(repositoryId, 'QUEUED');
  }

  await updateIngestionStatus(repositoryId, 'INGESTING');

  progressStore.set(repositoryId, {
    stage: 'Discovering repository files',
    discovered: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    currentFile: '',
    totalChunks: 0,
    embeddedChunks: 0
  });

  const totalStartTime = Date.now();
  console.log(`[Indexing] Repository: ${repo.owner}/${repo.name}`);

  try {
    const discoveryStart = Date.now();
    const latestCommitSha = await getLatestCommitSha(token, repo.owner, repo.name, repo.defaultBranch);
    
    if (repo.latestCommitSha === latestCommitSha && repo.ingestionStatus === 'COMPLETED') {
      console.log(`[Indexing] Repository already up to date. (SHA: ${latestCommitSha})`);
      await updateIngestionStatus(repositoryId, 'COMPLETED');
      return;
    }

    const tree = await getRepositoryTree(token, repo.owner, repo.name, repo.defaultBranch);
    console.log(`[Indexing] File discovery: ${((Date.now() - discoveryStart)/1000).toFixed(1)}s`);
    
    const progress = progressStore.get(repositoryId);

    // Filter files
    const ingestableFiles = tree.filter(item => 
      item.type === 'blob' && fileFilterService.isIngestableFile(item.path, item.size)
    );

    if (progress) {
      progress.discovered = ingestableFiles.length;
      progress.stage = 'Processing files';
    }

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

    const asyncPool = async (poolLimit, array, iteratorFn) => {
      const ret = [];
      const executing = [];
      for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item));
        ret.push(p);
        if (poolLimit <= array.length) {
          const e = p.then(() => executing.splice(executing.indexOf(e), 1));
          executing.push(e);
          if (executing.length >= poolLimit) {
            await Promise.race(executing);
          }
        }
      }
      return Promise.all(ret);
    };

    const manifest = ingestableFiles.map(file => ({
      ...file,
      status: 'DISCOVERED',
      error: null
    }));

    const crypto = require('crypto');
    const FILE_FETCH_CONCURRENCY = parseInt(process.env.FILE_FETCH_CONCURRENCY) || 5;
    const FILE_DB_BATCH_SIZE = parseInt(process.env.FILE_DB_BATCH_SIZE) || 50;

    const processStart = Date.now();
    let totalProcessed = 0;
    let totalChunksGenerated = 0;

    for (let i = 0; i < manifest.length; i += FILE_DB_BATCH_SIZE) {
      const batchManifest = manifest.slice(i, i + FILE_DB_BATCH_SIZE);
      const batchResults = [];
      
      await asyncPool(FILE_FETCH_CONCURRENCY, batchManifest, async (file) => {
        const existing = existingMap.get(file.path);
        if (progress) progress.currentFile = file.path;

        if (existing && existing.sha === file.sha) {
          file.status = 'PROCESSED';
          if (progress) progress.processed++;
          return;
        }

        try {
          const rawContent = await fetchFileContent(token, repo.owner, repo.name, repo.defaultBranch, file.path);
          
          if (rawContent.indexOf('\0') !== -1) {
            console.warn(`File ${file.path} contains null bytes, treating as binary and skipping.`);
            file.status = 'SKIPPED';
            file.error = 'Binary content detected';
            if (progress) progress.skipped++;
            return;
          }

          const normalizedContent = rawContent.replace(/\r\n/g, '\n');
          const lastDotIndex = file.path.lastIndexOf('.');
          const ext = lastDotIndex !== -1 && lastDotIndex > file.path.lastIndexOf('/') ? file.path.substring(lastDotIndex) : '';
          const filename = file.path.split('/').pop();
          const language = fileFilterService.getFileLanguage(ext, filename);
          
          const chunks = chunkingService.chunkContent(normalizedContent).map(c => ({
            ...c,
            id: crypto.randomUUID()
          }));

          batchResults.push({
            file,
            existing,
            data: {
              repositoryId: repo.id,
              path: file.path,
              name: filename,
              extension: ext,
              language,
              size: file.size || 0,
              sha: file.sha,
              content: normalizedContent
            },
            chunks
          });
          
        } catch (fileErr) {
          file.status = 'FAILED';
          file.error = fileErr.message;
          if (progress) progress.failed++;
          if (fileErr.response && (fileErr.response.status === 401 || fileErr.response.status === 403 || fileErr.response.status === 429)) {
              throw new Error(`Unrecoverable GitHub API error during file fetch (${fileErr.response.status}): ${fileErr.message}`);
          }
          console.error(`Failed to ingest file ${file.path}: ${fileErr.message}`);
        }
      });

      if (batchResults.length > 0) {
        const dbStart = Date.now();
        await prisma.$transaction(async (tx) => {
          for (const item of batchResults) {
            let repFileId;

            if (item.existing) {
              await tx.repositoryFile.update({
                where: { id: item.existing.id },
                data: item.data
              });
              repFileId = item.existing.id;
              await tx.fileChunk.deleteMany({
                where: { repositoryFileId: repFileId }
              });
            } else {
              const newFile = await tx.repositoryFile.create({
                data: item.data
              });
              repFileId = newFile.id;
            }

            if (item.chunks.length > 0) {
              await tx.fileChunk.createMany({
                data: item.chunks.map(c => ({
                  id: c.id,
                  repositoryFileId: repFileId,
                  chunkIndex: c.chunkIndex,
                  content: c.content,
                  startLine: c.startLine,
                  endLine: c.endLine
                }))
              });
            }
          }
        }, {
          maxWait: 10000, // 10 seconds max wait to acquire a connection
          timeout: 30000  // 30 seconds max execution time
        });

        for (const item of batchResults) {
          item.file.status = 'PROCESSED';
          if (progress) {
            progress.processed++;
            progress.totalChunks += item.chunks.length;
          }
          totalProcessed++;
          totalChunksGenerated += item.chunks.length;
        }
      }
    }
    console.log(`[Indexing] Files fetched: ${manifest.length}`);
    console.log(`[Indexing] Files persisted: ${((Date.now() - processStart)/1000).toFixed(1)}s (updated/inserted: ${totalProcessed})`);
    console.log(`[Indexing] Chunks generated: ${totalChunksGenerated}`);

    const processedCount = manifest.filter(f => f.status === 'PROCESSED').length;
    const skippedCount = manifest.filter(f => f.status === 'SKIPPED').length;
    const failedCount = manifest.filter(f => f.status === 'FAILED').length;
    const unaccountedFiles = manifest.filter(f => !['PROCESSED', 'SKIPPED', 'FAILED'].includes(f.status));

    if (unaccountedFiles.length > 0) {
      throw new Error(`Coverage validation failed: ${unaccountedFiles.length} eligible files unaccounted for.`);
    }

    if (failedCount > 0 && processedCount === 0 && skippedCount === 0) {
        throw new Error('All files failed to ingest. Check GitHub access or rate limits.');
    }

    if (progress) progress.stage = 'Files indexed, waiting for embeddings...';
    await updateIngestionStatus(repositoryId, 'INDEXING_COMPLETED', null, processedCount + skippedCount, latestCommitSha);
    console.log(`[Indexing] Total preparation time: ${((Date.now() - totalStartTime)/1000).toFixed(1)}s`);

    // Background embedding task
    embedRepositoryChunks(repositoryId).catch(err => {
      console.error('Background embedding failed immediately:', err);
    });

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
  embedRepositoryChunks,
  updateIngestionStatus,
  getProgress
};
