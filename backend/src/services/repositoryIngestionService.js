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

const sanitizeErrorMessage = (error) => {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : (error.message || String(error));
  
  if (msg.includes('401') || msg.includes('Bad credentials')) {
    return 'GitHub authentication expired or unauthorized. Please reconnect your GitHub account.';
  }
  if (msg.includes('403') && (msg.includes('rate limit') || msg.includes('API rate limit'))) {
    return 'GitHub API rate limit reached. Please try again in a few minutes.';
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return 'AI embedding quota limit reached. Files are indexed and accessible; semantic search indexing is paused.';
  }
  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
    return 'Network connection issue while communicating with external services.';
  }
  if (msg.startsWith('{') && msg.includes('"error"')) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.error?.message) {
        return sanitizeErrorMessage(parsed.error.message);
      }
    } catch {
      // ignore JSON parse error
    }
  }
  // Strip potential keys or raw tokens
  return msg.replace(/[A-Za-z0-9_\-]{20,}/g, '[REDACTED]').slice(0, 300);
};

const updateIngestionStatus = async (repositoryId, status, error = null, fileCount = undefined, latestCommitSha = undefined, extraData = {}) => {
  const data = { ingestionStatus: status, ...extraData };
  if (status === 'INGESTING') {
    data.ingestionStartedAt = new Date();
    data.lastIngestionError = null;
    data.fileIndexingStatus = 'INDEXING';
    if (!data.embeddingStatus) data.embeddingStatus = 'NOT_STARTED';
  } else if (status === 'INDEXING_COMPLETED') {
    data.fileIndexingStatus = 'COMPLETED';
    if (!data.embeddingStatus || data.embeddingStatus === 'NOT_STARTED') {
      data.embeddingStatus = 'NOT_STARTED';
    }
  } else if (status === 'EMBEDDING') {
    data.fileIndexingStatus = 'COMPLETED';
    data.embeddingStatus = 'EMBEDDING';
    data.lastAttemptedEmbeddingAt = new Date();
  } else if (status === 'QUOTA_BLOCKED') {
    data.fileIndexingStatus = 'COMPLETED';
    data.embeddingStatus = 'PAUSED';
    data.embeddingPauseReason = extraData.embeddingPauseReason || 'QUOTA_EXHAUSTED';
    data.lastAttemptedEmbeddingAt = new Date();
    if (!data.nextRetryAt) {
      data.nextRetryAt = new Date(Date.now() + 30 * 60 * 1000);
    }
  } else if (status === 'COMPLETED') {
    data.ingestionCompletedAt = new Date();
    data.fileIndexingStatus = 'COMPLETED';
    data.embeddingStatus = 'COMPLETED';
    data.embeddingPauseReason = null;
    data.lastSuccessfulEmbeddingAt = new Date();
    data.nextRetryAt = null;
    data.lastIngestionError = null;
  } else if (status === 'FAILED') {
    data.ingestionCompletedAt = new Date();
    data.fileIndexingStatus = 'FAILED';
  } else if (status === 'EMBEDDING_FAILED') {
    data.fileIndexingStatus = 'COMPLETED';
    data.embeddingStatus = 'FAILED';
    data.lastAttemptedEmbeddingAt = new Date();
  }

  if (error) {
    data.lastIngestionError = sanitizeErrorMessage(error);
  } else if (status === 'COMPLETED') {
    data.lastIngestionError = null;
  }

  if (fileCount !== undefined) {
    data.fileCount = fileCount;
  }
  if (latestCommitSha !== undefined) {
    data.latestCommitSha = latestCommitSha;
  }
  try {
    await prisma.repository.update({
      where: { id: repositoryId },
      data
    });
  } catch (err) {
    if (err.name === 'PrismaClientValidationError' || (err.message && err.message.includes('Unknown argument'))) {
      const newFieldKeys = [
        'fileIndexingStatus', 'embeddingStatus', 'embeddingPauseReason', 
        'totalChunks', 'processedChunks', 'failedChunks', 'pendingChunks', 
        'lastSuccessfulEmbeddingAt', 'lastAttemptedEmbeddingAt', 'nextRetryAt'
      ];
      const standardData = {};
      const newFields = {};
      for (const [key, val] of Object.entries(data)) {
        if (newFieldKeys.includes(key)) {
          newFields[key] = val;
        } else {
          standardData[key] = val;
        }
      }
      if (Object.keys(standardData).length > 0) {
        await prisma.repository.update({ where: { id: repositoryId }, data: standardData });
      }
      try {
        await prisma.$executeRaw`
          UPDATE "Repository"
          SET "fileIndexingStatus" = COALESCE(${newFields.fileIndexingStatus ?? null}, "fileIndexingStatus"),
              "embeddingStatus" = COALESCE(${newFields.embeddingStatus ?? null}, "embeddingStatus"),
              "embeddingPauseReason" = ${newFields.embeddingPauseReason ?? null},
              "totalChunks" = COALESCE(${newFields.totalChunks ?? null}, "totalChunks"),
              "processedChunks" = COALESCE(${newFields.processedChunks ?? null}, "processedChunks"),
              "pendingChunks" = COALESCE(${newFields.pendingChunks ?? null}, "pendingChunks"),
              "nextRetryAt" = ${newFields.nextRetryAt ?? null}
          WHERE id = ${repositoryId}
        `;
      } catch (rawErr) {
        console.warn(`[repositoryIngestionService] Raw SQL fallback failed for ${repositoryId}:`, rawErr.message);
      }
    } else {
      throw err;
    }
  }
};

const getChunkMetrics = async (repositoryId) => {
  const totalChunks = await prisma.fileChunk.count({
    where: { repositoryFile: { repositoryId } }
  });
  const processedChunks = await prisma.chunkEmbedding.count({
    where: { fileChunk: { repositoryFile: { repositoryId } } }
  });
  const pendingChunks = Math.max(0, totalChunks - processedChunks);
  return { totalChunks, processedChunks, pendingChunks };
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
    if (err.response && err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] === '0') {
      throw new Error('GitHub API rate limit exhausted during tree fetch. Please wait before trying again.');
    }
    
    // Only retry for 401 or 404 (could be propagation delay or token issue)
    if (err.response && (err.response.status === 401 || err.response.status === 404)) {
      try {
        const retryResponse = await axios.get(url, { headers });
        if (retryResponse.data.truncated) {
          console.log('Tree truncated on retry. Falling back to recursive directory fetch.');
          return await fetchTreeRecursively(branch);
        }
        return retryResponse.data.tree;
      } catch (retryErr) {
        throw new Error(`GitHub API error during tree fetch retry: ${retryErr.message}`);
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
        if (err.response && [401, 403, 404, 429].includes(err.response.status)) {
          // If rate limited (403 with 0 remaining or 429), abort immediately
          if (err.response.status === 403 && err.response.headers['x-ratelimit-remaining'] === '0') {
            err.response.status = 429; // Treat as Too Many Requests to properly abort
          }
          throw err;
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
  
  // Calculate current chunk metrics
  const { totalChunks, processedChunks, pendingChunks } = await getChunkMetrics(repositoryId);
  
  await updateIngestionStatus(repositoryId, 'EMBEDDING', null, undefined, undefined, {
    totalChunks,
    processedChunks,
    pendingChunks,
    lastAttemptedEmbeddingAt: new Date()
  });

  try {
    // Find chunks that don't have embeddings yet
    const chunksWithoutEmbeddings = await prisma.$queryRaw`
      SELECT c.id, c.content, c."contentHash", c."chunkIndex", c."startLine", c."endLine", c."repositoryFileId" 
      FROM "FileChunk" c
      JOIN "RepositoryFile" f ON c."repositoryFileId" = f.id
      LEFT JOIN "ChunkEmbedding" e ON c.id = e."fileChunkId"
      WHERE f."repositoryId" = ${repositoryId} AND e.id IS NULL
    `;
    
    const progress = progressStore.get(repositoryId);
    if (progress) {
      progress.stage = 'Generating embeddings';
      progress.totalChunks = totalChunks;
      progress.embeddedChunks = processedChunks;
    }

    if (chunksWithoutEmbeddings.length > 0) {
      const stats = await embeddingService.embedChunks(repositoryId, chunksWithoutEmbeddings, async (embeddedCount) => {
         if (progress) progress.embeddedChunks += embeddedCount;
         
         // Periodically update persisted embedding counts in DB
         try {
           const metrics = await getChunkMetrics(repositoryId);
           await prisma.repository.update({
             where: { id: repositoryId },
             data: {
               processedChunks: metrics.processedChunks,
               pendingChunks: metrics.pendingChunks,
               lastSuccessfulEmbeddingAt: new Date()
             }
           });
         } catch (metricErr) {
           // non-blocking metric sync
         }
      });

      console.log(JSON.stringify({
        tag: '[EMBEDDING_OPTIMIZATION_METRICS]',
        timestamp: new Date().toISOString(),
        repositoryId,
        totalChunksExamined: stats.total,
        reusedEmbeddings: stats.reused,
        newlyEmbedded: stats.newlyEmbedded,
        tokensEstimated: stats.tokens
      }));
    }
    
    const finalMetrics = await getChunkMetrics(repositoryId);
    
    if (progress) {
      progress.stage = 'Repository ready';
      progress.embeddedChunks = finalMetrics.processedChunks;
      progress.totalChunks = finalMetrics.totalChunks;
    }
    
    console.log(JSON.stringify({
      tag: '[EMBEDDING_DIAGNOSTIC]',
      timestamp: new Date().toISOString(),
      repositoryId,
      stage: 'COMPLETED',
      model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
      metrics: {
        totalChunks: finalMetrics.totalChunks,
        processedChunks: finalMetrics.processedChunks,
        pendingChunks: 0
      }
    }));
    
    // Check if another job transitioned state
    const repoCheck = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (repoCheck && ['EMBEDDING', 'INDEXING_COMPLETED'].includes(repoCheck.ingestionStatus)) {
      await updateIngestionStatus(repositoryId, 'COMPLETED', null, undefined, undefined, {
        totalChunks: finalMetrics.totalChunks,
        processedChunks: finalMetrics.processedChunks,
        pendingChunks: 0,
        failedChunks: 0,
        lastSuccessfulEmbeddingAt: new Date(),
        nextRetryAt: null
      });
    }
  } catch (err) {
    const errorMetrics = await getChunkMetrics(repositoryId);
    const pauseReason = err.pauseReason || (err.isQuotaExhausted ? 'QUOTA_EXHAUSTED' : err.isRateLimited ? 'RATE_LIMIT' : 'SERVICE_UNAVAILABLE');
    
    console.warn(JSON.stringify({
      tag: '[EMBEDDING_DIAGNOSTIC]',
      timestamp: new Date().toISOString(),
      repositoryId,
      stage: 'PAUSED',
      model: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
      errorCategory: pauseReason,
      message: err.message ? err.message.slice(0, 150) : 'Error',
      metrics: errorMetrics
    }));
    
    if (err.isQuotaExhausted || err.isRateLimited || err.pauseReason === 'QUOTA_EXHAUSTED' || err.pauseReason === 'BILLING_LIMIT') {
      const retryDelayMs = pauseReason === 'RATE_LIMIT' ? 2 * 60 * 1000 : 30 * 60 * 1000;
      await updateIngestionStatus(repositoryId, 'QUOTA_BLOCKED', err, undefined, undefined, {
        totalChunks: errorMetrics.totalChunks,
        processedChunks: errorMetrics.processedChunks,
        pendingChunks: errorMetrics.pendingChunks,
        embeddingPauseReason: pauseReason,
        lastAttemptedEmbeddingAt: new Date(),
        nextRetryAt: new Date(Date.now() + retryDelayMs)
      });
    } else {
      console.error('[Indexing] Repository embedding failed non-recoverably:', err);
      await updateIngestionStatus(repositoryId, 'EMBEDDING_FAILED', err, undefined, undefined, {
        totalChunks: errorMetrics.totalChunks,
        processedChunks: errorMetrics.processedChunks,
        pendingChunks: errorMetrics.pendingChunks,
        failedChunks: errorMetrics.pendingChunks,
        lastAttemptedEmbeddingAt: new Date()
      });
    }
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
  if (repo.ingestionStatus === 'INDEXING_COMPLETED' || repo.ingestionStatus === 'EMBEDDING_FAILED' || repo.ingestionStatus === 'QUOTA_BLOCKED') {
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
    
    // Check if repository files are already up-to-date and persisted
    if (repo.latestCommitSha === latestCommitSha) {
      const existingFilesCount = await prisma.repositoryFile.count({ where: { repositoryId } });
      if (existingFilesCount > 0) {
        console.log(`[Indexing] Repository files already up-to-date (SHA: ${latestCommitSha}). Checking chunk embeddings...`);
        
        const pendingChunks = await prisma.$queryRaw`
          SELECT c.id FROM "FileChunk" c
          JOIN "RepositoryFile" f ON c."repositoryFileId" = f.id
          LEFT JOIN "ChunkEmbedding" e ON c.id = e."fileChunkId"
          WHERE f."repositoryId" = ${repositoryId} AND e.id IS NULL
          LIMIT 1
        `;

        if (pendingChunks.length === 0) {
          console.log(`[Indexing] All chunks already embedded. Marking COMPLETED.`);
          await updateIngestionStatus(repositoryId, 'COMPLETED', null, existingFilesCount, latestCommitSha);
          return;
        }

        // Resume embeddings in background without re-downloading files
        console.log(`[Indexing] Resuming embeddings for existing files...`);
        await updateIngestionStatus(repositoryId, 'INDEXING_COMPLETED', null, existingFilesCount, latestCommitSha);
        embedRepositoryChunks(repositoryId).catch(err => {
          console.error('Background embedding resumption failed:', err);
        });
        return;
      }
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
          const e = p.then(() => { executing.splice(executing.indexOf(e), 1); }).catch(() => { executing.splice(executing.indexOf(e), 1); });
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
          
          // Tier 2 Filter: Check if file is eligible for AI code chunking & embeddings
          const embedCheck = fileFilterService.isEmbeddableFile(file.path, normalizedContent, file.size);
          let chunks = [];

          if (embedCheck.eligible) {
            chunks = chunkingService.chunkContent(normalizedContent).map(c => ({
              ...c,
              id: crypto.randomUUID()
            }));
          } else {
            console.log(`[Filtering] File ${file.path} excluded from embeddings (${embedCheck.reason}). Preserved in Code Explorer.`);
          }

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
        for (const item of batchResults) {
          try {
            await prisma.$transaction(async (tx) => {
              let repFileId = item.existing?.id;

              if (item.existing) {
                await tx.repositoryFile.update({
                  where: { id: item.existing.id },
                  data: item.data
                });
              } else {
                const upsertedFile = await tx.repositoryFile.upsert({
                  where: {
                    repositoryId_path: {
                      repositoryId: item.data.repositoryId,
                      path: item.data.path
                    }
                  },
                  update: item.data,
                  create: item.data
                });
                repFileId = upsertedFile.id;
              }

              // Incremental chunk update: preserve chunks with matching contentHash & index
              const existingChunks = await tx.fileChunk.findMany({
                where: { repositoryFileId: repFileId },
                select: { id: true, chunkIndex: true, contentHash: true }
              });

              const existingHashIndexMap = new Map();
              existingChunks.forEach(c => {
                existingHashIndexMap.set(`${c.chunkIndex}:${c.contentHash}`, c.id);
              });

              const chunksToInsert = [];
              const keptChunkIds = new Set();

              for (const c of item.chunks) {
                const key = `${c.chunkIndex}:${c.contentHash}`;
                if (existingHashIndexMap.has(key)) {
                  // Unchanged chunk in incremental sync! Retain existing chunk and vector.
                  keptChunkIds.add(existingHashIndexMap.get(key));
                } else {
                  chunksToInsert.push({
                    id: c.id,
                    repositoryFileId: repFileId,
                    chunkIndex: c.chunkIndex,
                    content: c.content,
                    contentHash: c.contentHash || null,
                    startLine: c.startLine,
                    endLine: c.endLine
                  });
                }
              }

              // Delete only obsolete or changed chunk records
              const staleChunkIds = existingChunks
                .filter(c => !keptChunkIds.has(c.id))
                .map(c => c.id);

              if (staleChunkIds.length > 0) {
                await tx.fileChunk.deleteMany({
                  where: { id: { in: staleChunkIds } }
                });
              }

              if (chunksToInsert.length > 0) {
                await tx.fileChunk.createMany({
                  data: chunksToInsert
                });
              }
            }, {
              maxWait: 5000,
              timeout: 10000
            });

            item.file.status = 'PROCESSED';
            if (progress) {
              progress.processed++;
              progress.totalChunks += item.chunks.length;
            }
            totalProcessed++;
            totalChunksGenerated += item.chunks.length;
          } catch (dbErr) {
            console.error(`Failed to persist file ${item.file.path} to DB:`, dbErr.message);
            item.file.status = 'FAILED';
            item.file.error = dbErr.message;
            if (progress) progress.failed++;
          }
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
    const initialMetrics = await getChunkMetrics(repositoryId);
    await updateIngestionStatus(repositoryId, 'INDEXING_COMPLETED', null, processedCount + skippedCount, latestCommitSha, {
      totalChunks: initialMetrics.totalChunks,
      processedChunks: initialMetrics.processedChunks,
      pendingChunks: initialMetrics.pendingChunks
    });
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
  getChunkMetrics,
  getProgress
};
