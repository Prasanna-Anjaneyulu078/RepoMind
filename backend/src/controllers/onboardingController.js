const onboardingService = require('../services/onboardingService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getOnboarding = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;

    // Verify repository exists and belongs to user
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, userId: req.user.id }
    });
    if (!repo) {
      return res.status(403).json({ success: false, message: 'Repository not found or unauthorized' });
    }

    const onboarding = await onboardingService.getOnboarding(repositoryId);
    
    if (!onboarding) {
      return res.json({ success: true, onboarding: null });
    }

    res.json({ success: true, onboarding });
  } catch (err) {
    next(err);
  }
};

const generateOnboarding = async (req, res, next) => {
  try {
    const { id: repositoryId } = req.params;

    // Verify repository exists and belongs to user
    const repo = await prisma.repository.findFirst({
      where: { id: repositoryId, userId: req.user.id }
    });
    if (!repo) {
      return res.status(403).json({ success: false, message: 'Repository not found or unauthorized' });
    }

    if (['NOT_INGESTED', 'QUEUED', 'INGESTING', 'EMBEDDING'].includes(repo.ingestionStatus)) {
      return res.status(409).json({ success: false, message: 'Repository is not fully indexed yet' });
    }

    // Start background generation
    onboardingService.generateOnboarding(repositoryId).catch(err => {
      console.error('Background onboarding generation error:', err);
    });

    res.json({ success: true, message: 'Onboarding generation started' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOnboarding,
  generateOnboarding
};
