require('dotenv').config();
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');

const APP_ID = process.env.GITHUB_APP_ID;
const PRIVATE_KEY = (process.env.GITHUB_APP_PRIVATE_KEY || process.env.GITHUB_PRIVATE_KEY)?.replace(/\\n/g, '\n');
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

const installationClients = new Map();

function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + (10 * 60),
    iss: APP_ID
  };

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${body}`)
    .sign(PRIVATE_KEY, 'base64url');

  return `${header}.${body}.${signature}`;
}

async function getInstallationOctokit(installationId) {
  if (installationClients.has(installationId)) {
    const cached = installationClients.get(installationId);
    if (cached.expiresAt > Date.now() + 5 * 60 * 1000) {
      return cached.octokit;
    }
  }

  const jwt = generateJWT();

  const tempOctokit = new Octokit({ auth: jwt });
  const { data: installationToken } = await tempOctokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  });

  const octokit = new Octokit({ auth: installationToken.token });

  installationClients.set(installationId, {
    octokit,
    expiresAt: new Date(installationToken.expires_at).getTime()
  });

  return octokit;
}

function verifyWebhookSignature(payload, signature) {
  if (!WEBHOOK_SECRET) {
    logger.warn('GITHUB_WEBHOOK_SECRET not set. Skipping signature verification.');
    return true;
  }

  if (!signature) return false;

  const sig = Buffer.from(signature);
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'));

  return sig.length === digest.length && crypto.timingSafeEqual(sig, digest);
}

function isGitHubAppConfigured() {
  return !!(APP_ID && PRIVATE_KEY);
}

module.exports = {
  generateJWT,
  getInstallationOctokit,
  verifyWebhookSignature,
  isGitHubAppConfigured,
  WEBHOOK_SECRET
};
