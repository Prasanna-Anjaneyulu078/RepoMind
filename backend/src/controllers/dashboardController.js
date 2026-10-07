const dashboardService = require('../services/dashboardService');

const getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData(req.user.id);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};
