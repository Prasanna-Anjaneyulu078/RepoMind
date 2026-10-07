const prisma = require('../config/database');

const createSession = async (data) => {
  return await prisma.session.create({ data });
};

const findSessionById = async (id) => {
  return await prisma.session.findUnique({ where: { id } });
};

const findActiveSessionsForUser = async (userId) => {
  return await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });
};

const deleteSession = async (id) => {
  return await prisma.session.delete({ where: { id } });
};

module.exports = {
  createSession,
  findSessionById,
  findActiveSessionsForUser,
  deleteSession,
};
