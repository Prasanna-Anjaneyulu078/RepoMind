const conversationService = require('../services/conversationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createConversation = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;
    
    // Verify repository exists and belongs to user
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, userId: req.user.id }
    });
    if (!repo) {
      return res.status(403).json({ success: false, message: 'Repository not found or unauthorized' });
    }

    const conversation = await conversationService.createConversation(req.user.id, repositoryId);
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const conversations = await conversationService.getConversations(req.user.id, repositoryId, page, limit);
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};

const getConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await conversationService.getConversation(req.user.id, conversationId);
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const deleted = await conversationService.deleteConversation(req.user.id, conversationId);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation
};
