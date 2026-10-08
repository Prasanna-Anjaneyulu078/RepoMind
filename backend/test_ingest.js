const prisma = require('./src/config/database');
const { ingestRepository } = require('./src/services/repositoryIngestionService');

async function main() {
  const repo = await prisma.repository.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!repo) return console.log('No repo');
  
  // Find a user token
  const session = await prisma.session.findFirst({ where: { userId: repo.userId, accessToken: { not: null } }});
  const token = session ? session.accessToken : process.env.GITHUB_ACCESS_TOKEN;
  
  // reset status to allow ingestion
  await prisma.repository.update({ where: { id: repo.id }, data: { ingestionStatus: 'QUEUED' }});
  
  console.log(`Starting ingestion for ${repo.owner}/${repo.name}...`);
  try {
    await ingestRepository(token, repo.id, repo.userId);
    console.log('Ingestion success!');
  } catch(e) {
    console.error('Ingestion failed:', e);
  }
}
main().finally(() => prisma.$disconnect());
