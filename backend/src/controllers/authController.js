const crypto = require('crypto');
const githubService = require('../services/githubService');
const userService = require('../services/userService');
const sessionService = require('../services/sessionService');

const startOAuth = (req, res) => {
  const forceConsent = req.query.prompt === 'consent';
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, { 
    httpOnly: true, 
    maxAge: 10 * 60 * 1000, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
  }); // 10 min
  const url = githubService.getAuthorizationUrl(state, forceConsent);
  res.redirect(url);
};

const oauthCallback = async (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies.oauth_state;
    
    res.clearCookie('oauth_state');

    if (error === 'access_denied') {
      return res.redirect(`${frontendUrl}/login?oauth_error=access_denied`);
    } else if (error) {
      return res.redirect(`${frontendUrl}/login?oauth_error=unknown`);
    }
    
    if (!state || state !== storedState) {
      return res.redirect(`${frontendUrl}/login?oauth_error=invalid_state`);
    }

    let accessToken, githubUser;
    try {
      accessToken = await githubService.getAccessToken(code);
      githubUser = await githubService.getAuthenticatedUser(accessToken);
    } catch (apiErr) {
      console.error('GitHub API Error:', apiErr);
      return res.redirect(`${frontendUrl}/login?oauth_error=github_api_error`);
    }

    let user;
    try {
      user = await userService.findUserByGithubId(githubUser.githubId);
      if (user) {
        user = await userService.updateUser(user.id, {
          githubUsername: githubUser.githubUsername,
          displayName: githubUser.displayName,
          email: githubUser.email,
          avatarUrl: githubUser.avatarUrl
        });
      } else {
        user = await userService.createUser(githubUser);
      }
    } catch (dbErr) {
      console.error('Database user Error:', dbErr);
      return res.redirect(`${frontendUrl}/login?oauth_error=session_creation_failed`);
    }

    let session;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    try {
      session = await sessionService.createSession({
        userId: user.id,
        expiresAt,
        accessToken
      });
    } catch (sessionErr) {
      console.error('Database session Error:', sessionErr);
      return res.redirect(`${frontendUrl}/login?oauth_error=session_creation_failed`);
    }

    res.cookie('sessionId', session.id, { 
      httpOnly: true, 
      expires: expiresAt,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.redirect(`${frontendUrl}/auth/success`);
  } catch (err) {
    console.error('Unexpected OAuth Error:', err);
    const frontendUrlFallback = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrlFallback}/login?oauth_error=unknown`);
  }
};

const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user.id,
      githubUsername: req.user.githubUsername,
      username: req.user.githubUsername,
      displayName: req.user.displayName,
      name: req.user.displayName,
      email: req.user.email,
      avatarUrl: req.user.avatarUrl,
      avatar_url: req.user.avatarUrl
    }
  });
};

const logout = async (req, res, next) => {
  try {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await sessionService.deleteSession(sessionId).catch(() => {});
    }
    res.clearCookie('sessionId', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    res.json({ success: true, message: 'Successfully logged out' });
  } catch(err) {
    next(err);
  }
};

module.exports = {
  startOAuth,
  oauthCallback,
  getMe,
  logout
};
