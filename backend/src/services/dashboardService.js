const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getDashboardData = async (userId) => {
  const recentQuestions = await prisma.conversationMessage.findMany({
    where: {
      role: 'USER',
      conversation: { userId }
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: {
      conversation: {
        include: {
          repository: {
            select: { name: true }
          }
        }
      }
    }
  });

  const recentRepositories = await prisma.repository.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3
  });

  return {
    recentRepositories: recentRepositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      defaultBranch: repo.defaultBranch,
      isPrivate: repo.isPrivate,
      htmlUrl: repo.htmlUrl,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt
    })),
    recentQuestions: recentQuestions.map(msg => ({
      id: msg.id,
      question: msg.content,
      timestamp: msg.createdAt,
      conversationId: msg.conversationId,
      repositoryName: msg.conversation?.repository?.name || 'Unknown Repository'
    }))
  };
};

module.exports = {
  getDashboardData
};
