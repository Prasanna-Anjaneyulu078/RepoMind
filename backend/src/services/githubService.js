const axios = require('axios');
const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL } = require('../config/env');

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

const getAuthorizationUrl = (state, forceConsent = false) => {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: 'read:user user:email repo',
    state,
  });
  if (forceConsent) {
    params.append('prompt', 'consent');
  }
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

const getAccessToken = async (code) => {
  const response = await axios.post(GITHUB_TOKEN_URL, {
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: GITHUB_CALLBACK_URL
  }, {
    headers: { Accept: 'application/json' }
  });

  if (response.data.error) {
    throw new Error(response.data.error_description || response.data.error);
  }

  return response.data.access_token;
};

const getAuthenticatedUser = async (token) => {
  const response = await axios.get(`${GITHUB_API_URL}/user`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // optionally get primary email if needed
  let email = response.data.email;
  if (!email) {
    try {
      const emailResponse = await axios.get(`${GITHUB_API_URL}/user/emails`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const primary = emailResponse.data.find(e => e.primary);
      if (primary) email = primary.email;
    } catch(err) {
      // Ignore failure to fetch email
    }
  }

  return {
    githubId: String(response.data.id),
    githubUsername: response.data.login,
    displayName: response.data.name,
    avatarUrl: response.data.avatar_url,
    email: email
  };
};

const getRepositories = async (token, page = 1, perPage = 20) => {
  const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      sort: 'updated',
      direction: 'desc',
      page,
      per_page: perPage
    }
  });
  return response.data;
};

const getRepositoryById = async (token, githubRepositoryId) => {
  const response = await axios.get(`${GITHUB_API_URL}/repositories/${githubRepositoryId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

const getRepositoryByFullName = async (token, owner, repo) => {
  const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  getAuthenticatedUser,
  getRepositories,
  getRepositoryById,
  getRepositoryByFullName
};
