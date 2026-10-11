/**
 * chunkingService.js
 * Implements code-aware, boundary-conscious chunking with stable content hashing.
 */
const crypto = require('crypto');

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE, 10) || 120; // 120 lines default (approx 800-1100 tokens)
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP, 10) || 15; // 15 lines overlap
const MAX_CHUNK_CHARS = 4500; // Hard character ceiling to prevent model token limits

// Regex for natural boundary identification across JS/TS/Python/Go/Java/Rust/C++/C#
const BOUNDARY_REGEX = /^(export\s+)?(async\s+)?(class|function|const|let|var|interface|type|enum|def|fn|pub\s+fn|func|public\s+class|private\s+class|struct)\s+[a-zA-Z0-9_]+/;

/**
 * Normalizes content by compressing 3+ consecutive newlines and removing trailing whitespace
 */
const normalizeChunkText = (text) => {
  if (!text) return '';
  return text
    .replace(/[ \t]+$/gm, '') // Remove trailing spaces on lines
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .trim();
};

/**
 * Computes a stable SHA-256 hash of the normalized chunk content
 */
const computeContentHash = (text) => {
  return crypto.createHash('sha256').update(normalizeChunkText(text)).digest('hex');
};

/**
 * Splits source code into logical, grounded chunks with content hashes
 */
const chunkContent = (content) => {
  if (!content || typeof content !== 'string') return [];
  
  const rawLines = content.split('\n');
  if (rawLines.length === 0) return [];

  const chunks = [];
  let currentStart = 0;
  let chunkIndex = 0;

  while (currentStart < rawLines.length) {
    let currentEnd = currentStart + CHUNK_SIZE;

    if (currentEnd < rawLines.length) {
      let foundBoundary = false;

      // Look ahead up to 35 lines for a function/class boundary or closing brace
      for (let i = 0; i < 35 && (currentEnd + i) < rawLines.length; i++) {
        const line = rawLines[currentEnd + i].trim();
        if (BOUNDARY_REGEX.test(line) || line === '}' || line === '};') {
          currentEnd = currentEnd + i + 1;
          foundBoundary = true;
          break;
        }
      }

      // If no boundary ahead, look behind up to 25 lines
      if (!foundBoundary) {
        for (let i = 0; i < 25 && (currentEnd - i) > currentStart + 15; i++) {
          const line = rawLines[currentEnd - i].trim();
          if (BOUNDARY_REGEX.test(line) || line === '}' || line === '};') {
            currentEnd = currentEnd - i + 1;
            foundBoundary = true;
            break;
          }
        }
      }
    } else {
      currentEnd = rawLines.length;
    }

    const chunkLines = rawLines.slice(currentStart, currentEnd);
    let chunkBody = chunkLines.join('\n');

    // Enforce character ceiling if lines are unusually dense
    if (chunkBody.length > MAX_CHUNK_CHARS) {
      chunkBody = chunkBody.slice(0, MAX_CHUNK_CHARS);
    }

    const normalizedBody = normalizeChunkText(chunkBody);

    // Filter out empty or trivially small chunks (< 20 characters)
    if (normalizedBody.length >= 20) {
      const contentHash = computeContentHash(normalizedBody);

      chunks.push({
        chunkIndex,
        content: normalizedBody,
        contentHash,
        startLine: currentStart + 1, // 1-indexed
        endLine: currentEnd
      });

      chunkIndex++;
    }

    if (currentEnd >= rawLines.length) {
      break;
    }

    // Step forward respecting overlap
    currentStart = Math.max(currentStart + 15, currentEnd - CHUNK_OVERLAP);

    // Look ahead within overlap for a clean boundary start
    for (let i = 0; i < CHUNK_OVERLAP && (currentStart + i) < rawLines.length; i++) {
      if (BOUNDARY_REGEX.test(rawLines[currentStart + i].trim())) {
        currentStart = currentStart + i;
        break;
      }
    }
  }

  return chunks;
};

module.exports = {
  chunkContent,
  computeContentHash,
  normalizeChunkText
};
