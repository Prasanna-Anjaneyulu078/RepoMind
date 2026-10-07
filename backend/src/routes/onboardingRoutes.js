const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', onboardingController.getOnboarding);
router.post('/generate', onboardingController.generateOnboarding);

module.exports = router;
