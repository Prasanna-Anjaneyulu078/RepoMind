const express = require('express');
const repositoryController = require('../controllers/repositoryController');
const ingestionController = require('../controllers/ingestionController');
const askController = require('../controllers/askController');
const conversationController = require('../controllers/conversationController');
const codeExplorerController = require('../controllers/codeExplorerController');
const architectureController = require('../controllers/architectureController');
const onboardingRoutes = require('./onboardingRoutes');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/github', repositoryController.discoverRepositories);
router.post('/', repositoryController.connectRepository);
router.get('/', repositoryController.listConnectedRepositories);
router.delete('/:id', repositoryController.deleteRepository);

router.post('/:id/ingest', ingestionController.startIngestion);
router.get('/:id/ingestion', ingestionController.getIngestionStatus);
router.post('/:id/sync', ingestionController.startIngestion); // Same entry point for sync

// Code Explorer Phase
router.get('/:id/files/tree', codeExplorerController.getTree);
router.get('/:id/files/content', codeExplorerController.getFileContent);

// Architecture Phase
router.get('/:id/architecture', architectureController.getArchitecture);
router.post('/:id/architecture/generate', architectureController.generateArchitecture);

// Onboarding Phase
router.use('/:id/onboarding', onboardingRoutes);

// Phase 6 legacy entry
router.post('/:id/ask', askController.askRepository);

// Phase 7 Conversation sub-routes
router.get('/:id/recent-questions', askController.getRecentQuestions);
router.get('/:id/recommended-questions', askController.getRecommendedQuestions);
router.post('/:id/conversations', conversationController.createConversation);
router.get('/:id/conversations', conversationController.getConversations);

module.exports = router;
