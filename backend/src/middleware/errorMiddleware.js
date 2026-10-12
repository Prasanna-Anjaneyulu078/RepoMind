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

  // Preserve status code and message from custom errors or upstream axios responses
  let statusCode = err.status || err.statusCode;
  let message = err.message || 'Something went wrong';

  if (err.response) {
    statusCode = err.response.status || statusCode;
    if (err.response.data?.message) {
      message = err.response.data.message;
    }
  }

  statusCode = statusCode && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorMiddleware;
