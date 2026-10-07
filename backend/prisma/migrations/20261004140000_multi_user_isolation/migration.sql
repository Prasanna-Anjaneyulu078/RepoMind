-- DropIndex
DROP INDEX "Repository_githubRepositoryId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Repository_userId_githubRepositoryId_key" ON "Repository"("userId", "githubRepositoryId");
