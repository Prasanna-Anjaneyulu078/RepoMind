const { Prisma } = require('@prisma/client');

const errorMiddleware = (err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Prisma-specific error handling
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A record with that unique field already exists.'
      });
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.'
      });
    }
    // Foreign key violation
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Related record does not exist.'
      });
    }
  }

  // Generic fallback
  res.status(500).json({
    success: false,
    message: 'Something went wrong'
  });
};

module.exports = errorMiddleware;
