const sessionService = require('../services/sessionService');
const userService = require('../services/userService');

const authMiddleware = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId;
    if (!sessionId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No session token provided' });
    }

    const session = await sessionService.findSessionById(sessionId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid session' });
    }

    if (new Date() > new Date(session.expiresAt)) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Session expired' });
    }

    const user = await userService.findUserById(session.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User not found' });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authMiddleware;
