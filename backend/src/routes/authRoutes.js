const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/github', authController.startOAuth);
router.get('/github/callback', authController.oauthCallback);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
