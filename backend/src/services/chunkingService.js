/**
 * chunkingService.js
 * Implements code-aware chunking for semantic search.
 */

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 150;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 20;

// Simple regex-based heuristics for code boundaries
const BOUNDARY_REGEX = /^(export\s+)?(class|function|const|let|var|interface|type)\s+[a-zA-Z0-9_]+\s*(=|\()/;

const chunkContent = (content) => {
  if (!content) return [];
  
  const lines = content.split('\n');
  const chunks = [];
  
  let currentStart = 0;
  let chunkIndex = 0;

  while (currentStart < lines.length) {
    let currentEnd = currentStart + CHUNK_SIZE;
    
    if (currentEnd < lines.length) {
      // Look for a natural boundary near the target end
      let foundBoundary = false;
      
      // Look ahead up to 50 lines for a good boundary
      for (let i = 0; i < 50 && (currentEnd + i) < lines.length; i++) {
        const line = lines[currentEnd + i].trim();
        if (BOUNDARY_REGEX.test(line) || line === '}') {
          currentEnd = currentEnd + i + 1; // Include the boundary
          foundBoundary = true;
          break;
        }
      }
      
      // If no boundary ahead, look behind up to 50 lines
      if (!foundBoundary) {
        for (let i = 0; i < 50 && (currentEnd - i) > currentStart + 10; i++) {
          const line = lines[currentEnd - i].trim();
          if (BOUNDARY_REGEX.test(line) || line === '}') {
            currentEnd = currentEnd - i + 1;
            foundBoundary = true;
            break;
          }
        }
      }
    } else {
      currentEnd = lines.length;
    }

    const chunkLines = lines.slice(currentStart, currentEnd);
    
    chunks.push({
      chunkIndex,
      content: chunkLines.join('\n'),
      startLine: currentStart + 1, // 1-indexed
      endLine: currentEnd
    });
    
    chunkIndex++;
    
    // Advance start, ensuring some overlap unless we are at the end
    if (currentEnd >= lines.length) {
      break;
    }
    
    // Try to start the next chunk near a boundary
    currentStart = Math.max(currentStart + 10, currentEnd - CHUNK_OVERLAP);
    
    // Look ahead to find a clean start
    for (let i = 0; i < CHUNK_OVERLAP && (currentStart + i) < lines.length; i++) {
      if (BOUNDARY_REGEX.test(lines[currentStart + i].trim())) {
        currentStart = currentStart + i;
        break;
      }
    }
  }

  return chunks;
};

module.exports = {
  chunkContent
};
