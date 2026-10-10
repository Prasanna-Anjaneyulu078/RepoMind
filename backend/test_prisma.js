const prisma = require('./src/config/database');
async function testPrisma() {
  const vector = [0.1, 0.2, 0.3];
  try {
    // Just create a dummy table or run a simple query
    const res = await prisma.$queryRaw`SELECT ${vector}::vector as v`;
    console.log('Array works:', res);
  } catch (err) {
    console.error('Array failed:', err.message);
  }
  
  try {
    const res2 = await prisma.$queryRaw`SELECT ${JSON.stringify(vector)}::vector as v`;
    console.log('String works:', res2);
  } catch (err) {
    console.error('String failed:', err.message);
  }
}
testPrisma();
