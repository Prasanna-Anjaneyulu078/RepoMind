-- AlterTable
ALTER TABLE "FileChunk" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- AlterTable
ALTER TABLE "ChunkEmbedding" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FileChunk_contentHash_idx" ON "FileChunk"("contentHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ChunkEmbedding_contentHash_model_idx" ON "ChunkEmbedding"("contentHash", "model");
