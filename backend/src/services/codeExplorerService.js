const prisma = require('../config/database');

const buildTree = (files) => {
  const root = [];
  const map = { '': root };

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!map[currentPath]) {
        const node = isFile 
          ? { 
              name: part, 
              path: currentPath, 
              type: 'file',
              size: file.size,
              language: file.language,
              updatedAt: file.updatedAt
            }
          : { 
              name: part, 
              path: currentPath, 
              type: 'directory', 
              children: [] 
            };
        
        map[currentPath] = node;
        
        if (parentPath === '') {
          root.push(node);
        } else {
          map[parentPath].children.push(node);
        }
      }
    }
  });

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(node => {
      if (node.type === 'directory' && node.children) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(root);
  return root;
};

const getRepositoryTree = async (repositoryId, userId) => {
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId }
  });

  if (!repo) return null;

  const files = await prisma.repositoryFile.findMany({
    where: { repositoryId },
    select: {
      path: true,
      name: true,
      size: true,
      language: true,
      updatedAt: true
    },
    orderBy: { path: 'asc' }
  });

  return {
    repository: { id: repo.id, name: repo.name, ingestionStatus: repo.ingestionStatus },
    tree: buildTree(files)
  };
};

const getFileContent = async (repositoryId, userId, path) => {
  return await prisma.repositoryFile.findFirst({
    where: {
      repositoryId,
      path,
      repository: { userId }
    },
    select: {
      id: true,
      path: true,
      name: true,
      language: true,
      size: true,
      content: true,
      updatedAt: true,
      repository: {
        select: {
          ingestionStatus: true
        }
      }
    }
  });
};

module.exports = {
  getRepositoryTree,
  getFileContent
};
