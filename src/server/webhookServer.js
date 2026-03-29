const http = require('http');
const { verifyWebhookSignature, WEBHOOK_SECRET, isGitHubAppConfigured } = require('../integrations/githubAppAuth');
const { getChangedFiles, getOctokit } = require('../integrations/githubAPI');
const { runWebhookWorkflow } = require('../core/webhookWorkflow');
const logger = require('../utils/logger');

const PORT = process.env.PORT || 3000;
const activeJobs = new Set();

function handlePayload(req, body) {
  const event = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];

  if (WEBHOOK_SECRET && !verifyWebhookSignature(body, signature)) {
    logger.warn('Webhook signature verification failed. Rejecting request.');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  if (event === 'pull_request' && ['opened', 'synchronize'].includes(payload.action)) {
    if (payload.pull_request.user && payload.pull_request.user.type === 'Bot') {
      logger.info('Ignoring PR created by a Bot to prevent loops.');
      return { statusCode: 200, body: 'Ignored Bot PR' };
    }
    
    const prKey = `${payload.repository.owner.login}/${payload.repository.name}#${payload.pull_request.number}`;
    if (activeJobs.has(prKey)) {
      logger.warn(`Debouncing duplicate/concurrent request for ${prKey}`);
      return { statusCode: 429, body: 'Too Many Requests - Job already processing' };
    }
    
    handlePR(payload, prKey);
    return { statusCode: 202, body: 'Processing PR' };
  }

  if (event === 'installation') {
    if (payload.action === 'created') {
      const repos = payload.repositories || [];
      logger.info(`App installed on ${payload.installation.account.login}. Repos: ${repos.length}`);
    }
    return { statusCode: 200, body: 'OK' };
  }

  if (event === 'installation_repositories') {
    if (payload.action === 'added') {
      const repoNames = payload.repositories_added.map(r => r.full_name);
      logger.info(`New repos added: ${repoNames.join(', ')}`);
    }
    return { statusCode: 200, body: 'OK' };
  }

  if (event === 'ping') {
    logger.info(`Ping received from GitHub App (installation ${payload.installation?.id})`);
    return { statusCode: 200, body: 'Pong' };
  }

  return { statusCode: 200, body: 'Event ignored' };
}

async function handlePR(payload, prKey) {
  activeJobs.add(prKey);
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const installationId = payload.installation.id;

  logger.info(`Processing PR #${prNumber} on ${owner}/${repo} (installation ${installationId})`);

  try {
    const octokit = await getOctokit(owner, repo, installationId);
    if (!octokit) {
      logger.error('Failed to authenticate. Check GitHub App configuration.');
      return;
    }

    const changedFiles = await getChangedFiles(octokit, owner, repo, prNumber);
    if (changedFiles.length === 0) {
      logger.info(`PR #${prNumber}: No files to analyze.`);
      return;
    }

    const commentBody = `## GitGuardian AI Review\n\nAnalyzing ${changedFiles.length} file(s)... Please wait.`;
    const { createPRComment } = require('../integrations/githubAPI');
    await createPRComment(octokit, owner, repo, prNumber, commentBody);

    await runWebhookWorkflow(octokit, owner, repo, prNumber, changedFiles);

    logger.success(`PR #${prNumber}: Review complete.`);
  } catch (err) {
    logger.error(`Error processing PR #${prNumber}: ${err.message}`);
  } finally {
    activeJobs.delete(prKey);
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      githubApp: isGitHubAppConfigured() ? 'configured' : 'not configured',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/webhook') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      const result = handlePayload(req, body);
      res.writeHead(result.statusCode, { 'Content-Type': 'text/plain' });
      res.end(result.body);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

module.exports = { server, PORT };
