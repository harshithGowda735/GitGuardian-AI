const fs = require('fs');
const path = require('path');
const { readFiles, writeFiles } = require('../utils/fileReader');
const { reviewCode } = require('../modules/reviewer');
const { fixCode } = require('../modules/fixer');
const { calculateScore } = require('../modules/scorer');
const logger = require('../utils/logger');
const { promptFixConfirmation, previewFix, promptApplyAfterPreview } = require('../utils/prompter');
const { createPRComment, createInlineComment, getOctokit } = require('../integrations/githubAPI');

const runWorkflow = async (modifiedFiles) => {
  logger.info(`Starting Workflow Engine. Analyzing ${modifiedFiles.length} file(s).`);

  const GITHUB_OWNER = process.env.GITHUB_OWNER;
  const GITHUB_REPO = process.env.GITHUB_REPO;
  const PR_NUMBER = process.env.PR_NUMBER;
  const isGithubMode = GITHUB_OWNER && GITHUB_REPO && PR_NUMBER;

  let octokit = null;
  if (isGithubMode) {
    octokit = await getOctokit(GITHUB_OWNER, GITHUB_REPO);
  }
  
  if (isGithubMode) {
    logger.info(`GitHub Integration Active -> Repo: ${GITHUB_OWNER}/${GITHUB_REPO} | PR: #${PR_NUMBER}`);
  }

  // Load configuration
  const agentConfigPath = path.resolve(process.cwd(), '.gitagent/agent.json');
  let config = {};
  if (fs.existsSync(agentConfigPath)) {
    config = JSON.parse(fs.readFileSync(agentConfigPath, 'utf8'));
  }

  const filesContent = readFiles(modifiedFiles);
  const fixedFiles = [];

  const stats = {
    filesScanned: 0,
    totalIssues: 0,
    totalScore: 0,
    criticalFiles: []
  };

  for (const file of filesContent) {
    // Basic filter for source files vs binaries or large assets
    if (!file.path.endsWith('.js') && !file.path.endsWith('.ts')) {
        continue;
    }
  
    stats.filesScanned++;

    // 1. Review
    if (config.modules?.reviewer?.enabled !== false) {
      logger.renderProcessing(file.path);
      
      const reviewResult = await reviewCode(file.path, file.content);
      if (reviewResult) {
        // Calculate score first
        let score = 100;
        if (config.modules?.scorer?.enabled !== false) {
          score = calculateScore(reviewResult);
        }
        stats.totalScore += score;
        
        // Render completion with actual score
        logger.renderCompleted(file.path, score);
        
        // Output file header
        logger.renderFileHeader(file.path);
        
        // Output issues
        if (reviewResult.issues && reviewResult.issues.length > 0) {
          stats.totalIssues += reviewResult.issues.length;
          logger.renderIssues(reviewResult.issues);
          
          if (score < 60) {
             stats.criticalFiles.push({ name: file.path, issues: reviewResult.issues.length });
          }
          
          // GitHub Integration - File summary
          if (isGithubMode) {
             let prBody = `📄 File: ${file.path}\n📊 Score: ${score}/100\n\n⚠ Issues:\n`;
             for (const issue of reviewResult.issues) {
                 prBody += `- Line ${issue.line} (${issue.type.toUpperCase()})\n  ${issue.description}\n`;
                 if (issue.suggestion) {
                     prBody += `  → ${issue.suggestion}\n`;
                 }
                 prBody += `\n`;
                 
                 // GitHub Integration - Inline Comment
                 let inlineBody = `⚠ **${issue.type.toUpperCase()}**: ${issue.description}`;
                 if (issue.suggestion) {
                   inlineBody += `\n\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
                 } else {
                   inlineBody += `\n💡 **Fix**: None provided`;
                 }
                  await createInlineComment(octokit, GITHUB_OWNER, GITHUB_REPO, PR_NUMBER, file.path, issue.line, inlineBody);
              }
              await createPRComment(octokit, GITHUB_OWNER, GITHUB_REPO, PR_NUMBER, prBody);
          }
        } else {
          logger.success('No issues found');
          console.log('');
        }
        
        // 2. Score (already calculated above)
        if (config.modules?.scorer?.enabled !== false) {
          logger.renderScore(score);
        }

        // 3. Fix (Interactive Confirmation Flow)
        if (config.modules?.fixer?.enabled !== false && reviewResult.issues && reviewResult.issues.length > 0) {
          let userChoice = await promptFixConfirmation(file.path, score, reviewResult.issues.length);
          
          let fixedContent = null;
          
          if (userChoice === 'view') {
             try {
               logger.info(`Generating preview for ${file.path}...`);
               fixedContent = await fixCode(file.path, file.content, reviewResult.issues);
               if (fixedContent) {
                  previewFix(file.content, fixedContent);
                  const confirmApply = await promptApplyAfterPreview();
                  userChoice = confirmApply ? 'yes' : 'no';
               } else {
                  logger.warn(`Failed to generate a valid fix for ${file.path}. Skipping.`);
                  userChoice = 'no';
               }
             } catch (err) {
               logger.error(`Error generating fix preview for ${file.path}. Skipping.`);
               userChoice = 'no';
             }
          }

          if (userChoice === 'yes') {
             try {
               if (!fixedContent) {
                 logger.info(`Generating fix for ${file.path}...`);
                 fixedContent = await fixCode(file.path, file.content, reviewResult.issues);
               }
               
               if (fixedContent && fixedContent !== file.content) {
                 fixedFiles.push({ path: file.path, content: fixedContent });
                 logger.success(`Fix applied to ${file.path}`);
               } else if (!fixedContent) {
                 logger.warn(`Failed to generate a valid fix for ${file.path}. Skipping.`);
               } else {
                 logger.info(`No changes needed for ${file.path}. Skipping.`);
               }
             } catch (err) {
               logger.error(`Error applying fix to ${file.path}. Skipping.`);
             }
          } else if (userChoice === 'no') {
             logger.info(`Skipped fixing ${file.path}`);
          }
        }
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        logger.error(`Failed to generate a valid review for ${file.path}`);
      }
    }
  }

  // Print Summary
  const averageScore = stats.filesScanned > 0 ? Math.round(stats.totalScore / stats.filesScanned) : 100;
  logger.renderSummary({
    filesScanned: stats.filesScanned,
    totalIssues: stats.totalIssues,
    averageScore,
    criticalFiles: stats.criticalFiles
  });

  // GitHub Integration - Final Summary
  if (isGithubMode) {
     let summaryBody = `🤖 GitGuardian AI Review Summary\n\nFiles Scanned: ${stats.filesScanned}  \nTotal Issues: ${stats.totalIssues}  \nAverage Score: ${averageScore}/100  \n\n`;
     if (stats.criticalFiles.length > 0) {
         summaryBody += `🔴 Critical Files:\n`;
         for (const cFile of stats.criticalFiles) {
             summaryBody += `- ${cFile.name} (${cFile.issues} issues)\n`;
         }
     }
     await createPRComment(octokit, GITHUB_OWNER, GITHUB_REPO, PR_NUMBER, summaryBody);
  }

  // 4. Act
  if (fixedFiles.length > 0) {
    writeFiles(fixedFiles);
    return fixedFiles.map(f => f.path);
  }

  return [];
};

module.exports = { runWorkflow };
