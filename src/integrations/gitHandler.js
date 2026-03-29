const simpleGit = require('simple-git');
const logger = require('../utils/logger');

const git = simpleGit();

const defaultIgnorePatterns = [
  'node_modules/',
  '.git/',
  'package-lock.json'
];

const isIgnored = (filePath) => {
  return defaultIgnorePatterns.some(pattern => {
    if (pattern.endsWith('/')) {
      return filePath.startsWith(pattern) || filePath.includes(`/${pattern}`);
    }
    return filePath === pattern || filePath.endsWith(`/${pattern}`);
  });
};

const getModifiedFiles = async () => {
  try {
    const status = await git.status();
    // Get both not-added (created) and modified files, but exclude deleted files
    const modifiedFiles = [...status.not_added, ...status.modified, ...status.staged];
    // Remove duplicates and filter out ignored paths
    return [...new Set(modifiedFiles)].filter(f => !isIgnored(f));
  } catch (err) {
    logger.error("Failed to get modified files");
    return [];
  }
};

const commitChanges = async (files, message) => {
  try {
    await git.add(files);
    await git.commit(message);
    logger.success(`Committed changes: ${message}`);
  } catch (err) {
    logger.error("Failed to commit changes");
  }
};

module.exports = {
  getModifiedFiles,
  commitChanges
};
