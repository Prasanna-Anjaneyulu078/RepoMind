const app = require('./app');
const { PORT } = require('./config/env');
const prisma = require('./config/database');
const { recoverStaleIngestions } = require('./services/startupRecoveryService');

const startServer = async () => {
  // 1. Recover stale ingestion jobs on startup
  await recoverStaleIngestions();

  // 2. Start accepting HTTP requests
  const server = app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });

  const gracefulShutdown = async () => {
    console.log('Received shutdown signal, shutting down gracefully...');
    
    // Close HTTP server first to stop accepting new requests
    server.close(async () => {
      console.log('HTTP server stopped');
      
      // Disconnect Prisma connections cleanly
      try {
        await prisma.$disconnect();
        console.log('Database connections closed');
      } catch (err) {
        console.error('Error closing database connections', err);
      }

      process.exit(0);
    });
    
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
