const express = require('express');
const prisma = require('../config/database');
const router = express.Router();

router.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    // Lightweight database ping
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    console.error('Health check DB error:', err);
  }

  res.json({
    success: true,
    message: 'RepoMind API is running',
    database: dbStatus
  });
});

module.exports = router;
