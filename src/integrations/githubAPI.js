const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');
const { getInstallationOctokit, isGitHubAppConfigured } = require('./githubAppAuth');
require('dotenv').config();

let patOctokit = null;

const initPatOctokit = () => {
  if (patOctokit) return true;
  if (!process.env.GITHUB_TOKEN) {
    return false;
  }
  patOctokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });
  return true;
};

async function getOctokit(owner, repo, installationId) {
  if (isGitHubAppConfigured() && installationId) {
    return await getInstallationOctokit(installationId);
  }
  if (initPatOctokit()) {
    return patOctokit;
  }
  logger.warn('No GitHub authentication configured. Set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY or GITHUB_TOKEN.');
  return null;
}

const getChangedFiles = async (octokit, owner, repo, prNumber) => {
  try {
    const files = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const { data } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
        page
      });
      files.push(...data);
      hasMore = data.length === 100;
      page++;
    }

    return files
      .filter(f => f.status !== 'removed')
      .map(f => ({ filename: f.filename, status: f.status, patch: f.patch }));
  } catch (err) {
    logger.error(`Failed to get PR files: ${err.message}`);
    return [];
  }
};

const getFileContent = async (octokit, owner, repo, filePath, ref) => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref
    });
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (err) {
    logger.warn(`Failed to get file content for ${filePath}: ${err.message}`);
    return null;
  }
};

const createPRComment = async (octokit, owner, repo, prNumber, body) => {
  if (!octokit) return false;
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: body.length > 50000 ? body.substring(0, 50000) + '\n\n...(truncated)' : body
    });
    return true;
  } catch (err) {
    logger.warn(`Failed to post PR comment: ${err.message}`);
    return false;
  }
};

const createInlineComment = async (octokit, owner, repo, prNumber, filePath, line, body) => {
  if (!octokit) return false;
  try {
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    await octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body: body.length > 50000 ? body.substring(0, 50000) + '\n\n...(truncated)' : body,
      commit_id: pullRequest.head.sha,
      path: filePath,
      line: Number(line),
      side: 'RIGHT'
    });
    return true;
  } catch (err) {
    logger.warn(`Skipping inline comment on ${filePath}:${line}: ${err.message}`);
    return false;
  }
};

module.exports = {
  getOctokit,
  getChangedFiles,
  getFileContent,
  createPRComment,
  createInlineComment
};
