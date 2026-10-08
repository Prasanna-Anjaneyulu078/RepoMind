const ragService = require('../services/ragService');

const askRepository = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;
    const { question, topK } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    if (question.length > 1000) {
      return res.status(400).json({ success: false, message: 'Question is too long' });
    }

    const safeTopK = Math.min(topK || 8, 20); // Cap topK securely

    const result = await ragService.askQuestion(req.user.id, repositoryId, question, safeTopK);

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    if (err.message === 'Repository not found or unauthorized') {
      return res.status(403).json({ success: false, message: err.message });
    }
    next(err);
  }
};

const conversationService = require('../services/conversationService');

const askInConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    console.log(`[AskRepo] conversationId=${conversationId} stage=REQUEST_RECEIVED`);
    const { question, topK } = req.body;


    if (!question || question.trim() === '') {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }
    if (question.length > 1000) {
      return res.status(400).json({ success: false, message: 'Question is too long' });
    }

    const safeTopK = Math.min(topK || 8, 20);

    // 1. Verify Conversation Authorization
    const conversation = await conversationService.getConversation(req.user.id, conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    console.log(`[AskRepo] conversationId=${conversationId} stage=CONVERSATION_VALIDATED`);

    const repository = await require('../config/database').repository.findUnique({
      where: { id: conversation.repositoryId }
    });

    if (repository && (repository.ingestionStatus === 'QUEUED' || repository.ingestionStatus === 'INGESTING' || repository.ingestionStatus === 'INDEXING_COMPLETED')) {
      return res.status(409).json({ success: false, message: 'This repository is still being indexed. Please try again shortly.', code: 'REPOSITORY_NOT_READY' });
    }

    // 2. Fetch recent conversation context (last 10 messages)
    const history = conversation.messages.slice(-10);


    // 3. Persist User Question (Prevent duplicate if retrying)
    const lastMessage = history.length > 0 ? history[history.length - 1] : null;
    let userMessageSaved = false;
    if (!lastMessage || lastMessage.role !== 'USER' || lastMessage.content !== question) {
      await conversationService.addMessage(conversationId, 'USER', question);
      userMessageSaved = true;
    }
    console.log(`[AskRepo] conversationId=${conversationId} stage=USER_MESSAGE_SAVED`);

    console.log(`[AskRepo] conversationId=${conversationId} stage=EMBEDDING_STARTED`);
    // 4. Generate RAG Answer
    const result = await ragService.askQuestion(
      req.user.id, 
      conversation.repositoryId, 
      question, 
      safeTopK, 
      history,
      conversation.componentContext
    );
    console.log(`[AskRepo] conversationId=${conversationId} stage=GEMINI_COMPLETED`);

    if (repository && repository.ingestionStatus === 'EMBEDDING') {
      result.answer = "AI indexing is still in progress. Some repository context may not be available yet.\n\n" + result.answer;
    }

    // 5. Persist Assistant Answer
    const assistantMessage = await conversationService.addMessage(
      conversationId, 
      'ASSISTANT', 
      result.answer, 
      result.sources
    );
    console.log(`[AskRepo] conversationId=${conversationId} stage=ASSISTANT_MESSAGE_SAVED`);

    // 6. Return response conforming to existing schema
    const updatedConversation = await conversationService.getConversation(req.user.id, conversationId);
    res.json({
      success: true,
      conversation: {
        id: updatedConversation.id,
        title: updatedConversation.title,
        repositoryId: updatedConversation.repositoryId
      },
      message: assistantMessage,
      sources: result.sources
    });
    console.log(`[AskRepo] conversationId=${conversationId} stage=RESPONSE_SENT`);

  } catch (err) {
    if (err.message === 'Repository not found or unauthorized') {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message === 'Conversation not found') {
      return res.status(404).json({ success: false, message: err.message });
    }

    // Embedding and Gemini API error handling
    if (err.isQuotaExhausted || (err.message && err.message.includes('Quota exhausted'))) {
      console.error(`[AskRepo] message request failed\nconversationId: ${req.params.conversationId}\nuserId: ${req.user.id}\nstage: EMBEDDING_FAILED\nerror: ${err.message}`);
      return res.status(429).json({ success: false, message: "AI search is temporarily rate-limited (Quota Exhausted). Please try again shortly." });
    }

    if (err.message === 'Failed to generate query embedding' || (err.message && err.message.includes('No embeddings returned by Gemini API'))) {
      console.error(`[AskRepo] message request failed\nconversationId: ${req.params.conversationId}\nuserId: ${req.user.id}\nstage: EMBEDDING_FAILED\nerror: ${err.message}`);
      return res.status(503).json({ success: false, message: "AI search is temporarily unavailable because the repository's semantic index is not ready. Please try again later." });
    }

    if (err.status || err.name === 'ApiError') {
      console.error(`[AskRepo] message request failed\nconversationId: ${req.params.conversationId}\nuserId: ${req.user.id}\nstage: GEMINI_API\nerror: ${err.message}`);
      
      if (err.status === 429) {
        return res.status(429).json({ success: false, message: "AI search is temporarily rate-limited. Please try again shortly." });
      }

      return res.status(503).json({ success: false, message: "AI search is temporarily unavailable (Upstream API Error)." });
    }

    next(err);
  }
};

const getRecommendedQuestions = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;
    
    // We can do a small deterministic check if we want, but for now we'll return a static 
    // set of highly relevant generic architecture questions as allowed by the prompt 
    // ("small deterministic recommendation service...").
    // Ideally we'd look at file extensions to be smarter, but a safe deterministic fallback:
    const recommendations = [
      { id: 'architecture', question: 'What is the overall architecture of this repository?' },
      { id: 'auth', question: 'Where is authentication implemented?' },
      { id: 'db', question: 'Where is the database schema defined?' },
      { id: 'api', question: 'What are the main API endpoints?' }
    ];

    res.json({ success: true, data: recommendations });
  } catch (err) {
    next(err);
  }
};

const getRecentQuestions = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;
    
    // Get latest user messages for this repository
    const prisma = require('../config/database');
    
    const recentQuestions = await prisma.conversationMessage.findMany({
      where: {
        role: 'USER',
        conversation: {
          repositoryId,
          userId: req.user.id
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        conversation: {
          select: { id: true, repositoryId: true }
        }
      }
    });

    const mapped = recentQuestions.map(msg => ({
      id: msg.id,
      question: msg.content,
      conversationId: msg.conversation.id,
      repositoryId: msg.conversation.repositoryId,
      createdAt: msg.createdAt
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  askRepository,
  askInConversation,
  getRecommendedQuestions,
  getRecentQuestions
};
