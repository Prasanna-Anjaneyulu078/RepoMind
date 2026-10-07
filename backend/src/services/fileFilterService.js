const path = require('path');

// Removed ALLOWED_EXTENSIONS whitelist

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out', 
  'target', 'bin', 'obj', 'vendor', '.cache'
]);

const EXCLUDED_FILES = new Set([
  '.env', '.env.local', '.env.production', 'credentials.json', 'service-account.json'
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.mv.db', '.trace.db', '.db', '.sqlite', '.sqlite3', '.bin', '.dat', '.exe', '.dll', '.so', '.dylib', '.jar', '.war',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.zip', '.tar', 
  '.gz', '.7z', '.rar', '.mp4', '.mp3', '.wav', '.mov', '.avi', '.mkv', '.woff', '.woff2', '.ttf', '.otf', '.bmp', '.ico',
  '.pem', '.key'
]);

// Determine language from extension or filename
const getFileLanguage = (ext, filename = '') => {
  const map = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript React',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript React',
    '.java': 'Java',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.sql': 'SQL',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.md': 'Markdown',
    '.mdx': 'MDX',
    '.prisma': 'Prisma'
  };

  const filenameMap = {
    'dockerfile': 'Dockerfile',
    'makefile': 'Makefile',
    'jenkinsfile': 'Jenkins',
    'procfile': 'Procfile'
  };

  const lowerFilename = filename.toLowerCase();
  
  if (filenameMap[lowerFilename]) {
    return filenameMap[lowerFilename];
  }

  return map[ext.toLowerCase()] || 'Unknown';
};

const isIngestableFile = (filePath, size = 0) => {
  const parsed = path.parse(filePath);
  const ext = parsed.ext.toLowerCase();
  const filename = parsed.base.toLowerCase();
  
  // 1. Check max file size (e.g., 1MB from env or default)
  const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES) || 1024 * 1024;
  if (size > MAX_FILE_SIZE) {
    return false;
  }

  // 2. Check explicitly excluded files (secrets)
  if (EXCLUDED_FILES.has(filename)) {
    return false;
  }
  if (filename.endsWith('.pem') || filename.endsWith('.key')) {
    return false;
  }

  // 3. Check explicitly excluded binary/media extensions
  if (EXCLUDED_EXTENSIONS.has(ext)) {
    return false;
  }

  // 4. Check directories
  const segments = filePath.split('/');
  for (const segment of segments) {
    if (EXCLUDED_DIRS.has(segment)) {
      return false;
    }
  }

  // Exclusion-only strategy: if it hasn't been excluded by size, name, extension, or directory, allow it.
  return true;
};

module.exports = {
  isIngestableFile,
  getFileLanguage
};
