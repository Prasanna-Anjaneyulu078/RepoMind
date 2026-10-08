const prisma = require('./src/config/database');
async function main() {
  const repo = await prisma.repository.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (repo) {
    console.log('Status:', repo.ingestionStatus);
    console.log('Error:', repo.lastIngestionError);
  } else {
    console.log('No repos found');
  }
}
main().finally(() => prisma.$disconnect());
