const prisma = require('../config/database');

const createUser = async (data) => {
  return await prisma.user.create({ data });
};

const findUserById = async (id) => {
  return await prisma.user.findUnique({ where: { id } });
};

const findUserByGithubId = async (githubId) => {
  return await prisma.user.findUnique({ where: { githubId } });
};

const updateUser = async (id, data) => {
  return await prisma.user.update({
    where: { id },
    data,
  });
};

const deleteUser = async (id) => {
  return await prisma.user.delete({ where: { id } });
};

module.exports = {
  createUser,
  findUserById,
  findUserByGithubId,
  updateUser,
  deleteUser,
};
