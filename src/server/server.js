require('dotenv').config();
const { server, PORT } = require('./webhookServer');
const { isGitHubAppConfigured } = require('../integrations/githubAppAuth');
const logger = require('../utils/logger');

server.listen(PORT, () => {
  logger.info(`GitGuardian AI Server running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Webhook endpoint: http://localhost:${PORT}/api/webhook`);

  if (!isGitHubAppConfigured()) {
    logger.warn('GitHub App not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env');
    logger.info('The server will only accept requests with a valid GITHUB_TOKEN (PAT mode).');
  } else {
    logger.info('GitHub App authentication is configured.');
  }
});
