const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createConversation = async (userId, repositoryId, title = 'New Conversation') => {
  return await prisma.conversation.create({
    data: { userId, repositoryId, title }
  });
};

const getConversations = async (userId, repositoryId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return await prisma.conversation.findMany({
    where: { userId, repositoryId },
    orderBy: { updatedAt: 'desc' },
    skip,
    take: limit
  });
};

const getConversation = async (userId, conversationId) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  return conversation;
};

const deleteConversation = async (userId, conversationId) => {
  // Use deleteMany to avoid throwing if not found, and strictly enforce userId
  const result = await prisma.conversation.deleteMany({
    where: { id: conversationId, userId }
  });
  return result.count > 0;
};

const addMessage = async (conversationId, role, content, sources = null) => {
  return await prisma.$transaction(async (tx) => {
    if (role === 'USER') {
      const existingUserMessage = await tx.conversationMessage.findFirst({
        where: { conversationId, role: 'USER' }
      });
      
      if (!existingUserMessage) {
        // Clean question: trim and collapse spaces
        const title = content.replace(/\s+/g, ' ').trim();
        await tx.conversation.update({
          where: { id: conversationId },
          data: { title }
        });
      }
    }

    return await tx.conversationMessage.create({
      data: {
        conversationId,
        role,
        content,
        sources: sources ? sources : undefined
      }
    });
  });
};

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  addMessage
};
