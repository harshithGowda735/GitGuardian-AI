const { getModifiedFiles, commitChanges } = require('../integrations/gitHandler');
const { runWorkflow } = require('./workflowEngine');
const logger = require('../utils/logger');

const startAgent = async () => {
  logger.info('Initializing GitGuardian AI Agent...');

  // 1. Detect modified files using git
  const modifiedFiles = await getModifiedFiles();
   
  if (modifiedFiles.length === 0) {
    logger.info('No modified files detected. Agent sleeping.');
    return;
  }

  logger.info(`Detected ${modifiedFiles.length} modified file(s). Triggering review pipeline.`);

  // 2. Run Workflow (Review -> Score -> Fix)
  const fixedFiles = await runWorkflow(modifiedFiles);

  // 3. Commit auto-fixes if any
  if (fixedFiles.length > 0) {
    logger.success(`Auto-fixed ${fixedFiles.length} file(s). Committing changes...`);
    const commitMsg = `🤖 GitGuardian AI: Auto-refactored and fixed issues in ${fixedFiles.length} file(s)

Updated files:
${fixedFiles.map(f => `- ${f}`).join('\n')}`;

    await commitChanges(fixedFiles, commitMsg);
  } else {
    logger.info('Review complete. No auto-fixes applied.');
  }
};

module.exports = { startAgent };
