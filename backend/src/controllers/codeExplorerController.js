const codeExplorerService = require('../services/codeExplorerService');

const getTree = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const data = await codeExplorerService.getRepositoryTree(id, userId);

    if (!data) {
      return res.status(404).json({ success: false, message: 'Repository not found or unauthorized' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getFileContent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { path } = req.query;
    const userId = req.user.id;

    if (!path) {
      return res.status(400).json({ success: false, message: 'Path is required' });
    }

    if (path.includes('../') || path.startsWith('/')) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }

    const file = await codeExplorerService.getFileContent(id, userId, path);

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found or unauthorized' });
    }

    if (file.size > 1024 * 1024) {
      return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE', message: 'This file is too large to display in Code Explorer.' });
    }

    const responseData = {
      file: {
        id: file.id,
        name: file.name,
        path: file.path,
        language: file.language,
        size: file.size,
        content: file.content,
        updatedAt: file.updatedAt
      },
      repository: file.repository
    };

    res.json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTree,
  getFileContent
};
