const prisma = require('../config/database');

const createRepository = async (data) => {
  return await prisma.repository.create({ data });
};

const findRepositoryByIdAndUserId = async (id, userId) => {
  return await prisma.repository.findFirst({ where: { id, userId } });
};

const findRepositoriesByUserId = async (userId, skip = 0, take = 50, search = '') => {
  const where = {
    userId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };

  const [repositories, total] = await Promise.all([
    prisma.repository.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.repository.count({ where })
  ]);
  
  return { repositories, total };
};

const deleteRepositoryForUser = async (id, userId) => {
  // Use deleteMany to safely delete only if the user owns it
  return await prisma.repository.deleteMany({ where: { id, userId } });
};

const createRepositoryFile = async (data) => {
  return await prisma.repositoryFile.create({ data });
};

const findFilesByRepositoryId = async (repositoryId, userId, skip = 0, take = 50) => {
  return await prisma.repositoryFile.findMany({
    where: { 
      repositoryId,
      repository: { userId }
    },
    skip,
    take,
    select: {
      id: true,
      repositoryId: true,
      path: true,
      name: true,
      extension: true,
      language: true,
      size: true,
      sha: true,
      createdAt: true,
      updatedAt: true,
      // Intentionally omitting 'content' to avoid heavy payloads during list operations
    },
    orderBy: { path: 'asc' },
  });
};

// Use this only when a specific file's content is needed
const getFileContentForUser = async (fileId, userId) => {
  return await prisma.repositoryFile.findFirst({
    where: { 
      id: fileId,
      repository: { userId }
    },
    select: { content: true }
  });
};

// Example of a transaction
const ingestInitialRepository = async (repoData, initialFiles) => {
  return await prisma.$transaction(async (tx) => {
    const repo = await tx.repository.create({ data: repoData });
    
    // Add repoId to each file
    const filesWithRepoId = initialFiles.map(file => ({
      ...file,
      repositoryId: repo.id
    }));

    if (filesWithRepoId.length > 0) {
      await tx.repositoryFile.createMany({
        data: filesWithRepoId
      });
    }
    
    return repo;
  });
};

module.exports = {
  createRepository,
  findRepositoryByIdAndUserId,
  findRepositoriesByUserId,
  deleteRepositoryForUser,
  createRepositoryFile,
  findFilesByRepositoryId,
  getFileContentForUser,
  ingestInitialRepository
};
