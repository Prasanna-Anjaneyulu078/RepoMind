const path = require('path');

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out', 
  'target', 'bin', 'obj', 'vendor', '.cache'
]);

const SENSITIVE_FILES = new Set([
  '.env', '.env.local', '.env.production', 'credentials.json', 'service-account.json'
]);

const BINARY_EXTENSIONS = new Set([
  '.mv.db', '.trace.db', '.db', '.sqlite', '.sqlite3', '.bin', '.dat', '.exe', '.dll', '.so', '.dylib', '.jar', '.war',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf', '.zip', '.tar', 
  '.gz', '.7z', '.rar', '.mp4', '.mp3', '.wav', '.mov', '.avi', '.mkv', '.woff', '.woff2', '.ttf', '.otf', '.bmp', '.ico',
  '.pem', '.key', '.h5', '.hdf5', '.pkl', '.pickle', '.onnx', '.pt', '.pth', '.tflite', '.weights', '.npy', '.npz', '.parquet', '.arrow',
  '.pyc', '.pyd', '.class', '.o', '.obj'
]);

const LOCKFILE_NAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 
  'cargo.lock', 'gemfile.lock', 'poetry.lock', 'mix.lock', 'flake.lock'
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

/**
 * Tier 1: Determines whether a file should be saved in RepositoryFile for Code Explorer browsing.
 */
const isBrowsableFile = (filePath, size = 0) => {
  const parsed = path.parse(filePath);
  const ext = parsed.ext.toLowerCase();
  const filename = parsed.base.toLowerCase();
  
  // 1. Max browsable file size (default 2MB)
  const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES) || 2 * 1024 * 1024;
  if (size > MAX_FILE_SIZE) {
    return false;
  }

  // 2. Sensitive secret files
  if (SENSITIVE_FILES.has(filename) || filename.endsWith('.pem') || filename.endsWith('.key')) {
    return false;
  }

  // 3. True binary files / executables
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }

  // 4. Ignored directories
  const segments = filePath.split('/');
  for (const segment of segments) {
    if (EXCLUDED_DIRS.has(segment)) {
      return false;
    }
  }

  return true;
};

/**
 * Tier 2: Determines whether a browsable file is eligible for AI code chunking and semantic embeddings.
 * Excludes low-value generated files, lockfiles, minified bundles, and sourcemaps.
 */
const isEmbeddableFile = (filePath, content = '', size = 0) => {
  const parsed = path.parse(filePath);
  const ext = parsed.ext.toLowerCase();
  const filename = parsed.base.toLowerCase();
  const normalizedPath = filePath.toLowerCase();

  // 1. Lockfiles
  if (LOCKFILE_NAMES.has(filename)) {
    return { eligible: false, reason: 'LOCKFILE' };
  }

  // 2. Minified bundles
  if (filename.endsWith('.min.js') || filename.endsWith('.min.css') || filename.endsWith('.bundle.js') || filename.endsWith('.chunk.js')) {
    return { eligible: false, reason: 'MINIFIED_BUNDLE' };
  }

  // 3. Source maps
  if (ext === '.map' || filename.endsWith('.js.map') || filename.endsWith('.css.map')) {
    return { eligible: false, reason: 'SOURCE_MAP' };
  }

  // 4. Test snapshots and generated data
  if (ext === '.snap' || ext === '.log') {
    return { eligible: false, reason: 'GENERATED_DATA' };
  }

  // 5. Max file size for embedding (default 250KB)
  const MAX_EMBED_SIZE = parseInt(process.env.MAX_EMBED_FILE_SIZE_BYTES) || 256 * 1024;
  if (size > MAX_EMBED_SIZE || (content && content.length > MAX_EMBED_SIZE)) {
    return { eligible: false, reason: 'OVERSIZED_FOR_EMBEDDING' };
  }

  // 6. Trivial or nearly empty content (< 20 characters)
  if (content && content.trim().length < 20) {
    return { eligible: false, reason: 'TRIVIAL_CONTENT' };
  }

  // 7. Binary check (null byte)
  if (content && content.indexOf('\0') !== -1) {
    return { eligible: false, reason: 'BINARY_CONTENT' };
  }

  return { eligible: true };
};

module.exports = {
  isBrowsableFile,
  isIngestableFile: isBrowsableFile, // Backwards-compatible alias
  isEmbeddableFile,
  getFileLanguage
};
