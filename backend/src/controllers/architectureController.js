const architectureService = require('../services/architectureService');
const repositoryService = require('../services/repositoryService');

const getArchitecture = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: repositoryId } = req.params;

    // Verify repository ownership
    const repository = await repositoryService.findRepositoryByIdAndUserId(repositoryId, userId);
    if (!repository) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    const architecture = await architectureService.getArchitecture(repositoryId);
    
    if (!architecture) {
      return res.json({
        success: true,
        data: { status: 'NOT_AVAILABLE' }
      });
    }

    return res.json({
      success: true,
      data: architecture
    });
  } catch (error) {
    console.error('Error fetching architecture:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch architecture analysis' });
  }
};

const generateArchitecture = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: repositoryId } = req.params;

    // Verify repository ownership
    const repository = await repositoryService.findRepositoryByIdAndUserId(repositoryId, userId);
    if (!repository) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    // Start generation asynchronously
    // Return early to not block the request
    architectureService.generateArchitecture(repositoryId).catch(err => {
      console.error('Background architecture generation failed:', err);
    });

    return res.json({
      success: true,
      data: { status: 'ANALYZING' }
    });
  } catch (error) {
    console.error('Error initiating architecture generation:', error);
    res.status(500).json({ success: false, message: 'Failed to start architecture analysis' });
  }
};

module.exports = {
  getArchitecture,
  generateArchitecture
};
