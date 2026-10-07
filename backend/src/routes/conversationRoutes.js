const express = require('express');
const conversationController = require('../controllers/conversationController');
const askController = require('../controllers/askController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/:conversationId', conversationController.getConversation);
router.delete('/:conversationId', conversationController.deleteConversation);

// This replaces the old /repositories/:id/ask and implements Phase 7
router.post('/:conversationId/messages', askController.askInConversation);

module.exports = router;
