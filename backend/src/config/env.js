require('dotenv').config();

const requiredEnvs = [
  'NODE_ENV', 
  'PORT', 
  'FRONTEND_URL',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'SESSION_SECRET'
];

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    console.error(`Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,
  SESSION_SECRET: process.env.SESSION_SECRET
};
