const fs = require('fs');
const path = require('path');
const { reviewCode } = require('../modules/reviewer');
const { calculateScore } = require('../modules/scorer');
const logger = require('../utils/logger');
const { createPRComment, createInlineComment, getFileContent } = require('../integrations/githubAPI');

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rb', '.rs', '.php'];

const runWebhookWorkflow = async (octokit, owner, repo, prNumber, changedFiles) => {
  const agentConfigPath = path.resolve(process.cwd(), '.gitagent/agent.json');
  let config = {};
  if (fs.existsSync(agentConfigPath)) {
    config = JSON.parse(fs.readFileSync(agentConfigPath, 'utf8'));
  }

  const stats = {
    filesScanned: 0,
    totalIssues: 0,
    totalScore: 0,
    criticalFiles: []
  };

  const prInfo = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  });
  const headSha = prInfo.data.head.sha;

  const filesToAnalyze = changedFiles.filter(f =>
    SUPPORTED_EXTENSIONS.some(ext => f.filename.endsWith(ext))
  );

  if (filesToAnalyze.length === 0) {
    logger.info(`PR #${prNumber}: No supported files to analyze.`);
    return stats;
  }

  for (const file of filesToAnalyze) {
    stats.filesScanned++;

    const content = await getFileContent(octokit, owner, repo, file.filename, headSha);
    if (!content) continue;

    if (config.modules?.reviewer?.enabled !== false) {
      const reviewResult = await reviewCode(file.filename, content, file.patch);
      if (!reviewResult) continue;

      let score = 100;
      if (config.modules?.scorer?.enabled !== false) {
        score = calculateScore(reviewResult);
      }
      stats.totalScore += score;

      if (reviewResult.issues && reviewResult.issues.length > 0) {
        stats.totalIssues += reviewResult.issues.length;

        if (score < 60) {
          stats.criticalFiles.push({ name: file.filename, issues: reviewResult.issues.length });
        }

        let prBody = `### ${file.filename}\n**Score:** ${score}/100\n\n`;
        for (const issue of reviewResult.issues) {
          prBody += `- **Line ${issue.line}** (${issue.type.toUpperCase()}): ${issue.description}\n`;
          if (issue.suggestion) {
            prBody += `  - _Suggestion:_ ${issue.suggestion}\n`;
          }
          prBody += '\n';

          let inlineBody = `**${issue.type.toUpperCase()}**: ${issue.description}`;
          if (issue.suggestion) {
            inlineBody += `\n\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
          } else {
            inlineBody += `\n\n**Suggestion:** N/A`;
          }
          await createInlineComment(octokit, owner, repo, prNumber, file.filename, issue.line, inlineBody);
        }

        await createPRComment(octokit, owner, repo, prNumber, prBody);
      }
    }
  }

  const filesScanned = stats.filesScanned;
  const averageScore = filesScanned > 0 ? Math.round(stats.totalScore / filesScanned) : 100;

  let summaryBody = `## GitGuardian AI Review Summary\n\n`;
  summaryBody += `| Metric | Value |\n|--------|-------|\n`;
  summaryBody += `| Files Scanned | ${filesScanned} |\n`;
  summaryBody += `| Total Issues | ${stats.totalIssues} |\n`;
  summaryBody += `| Average Score | ${averageScore}/100 |\n\n`;

  if (stats.criticalFiles.length > 0) {
    summaryBody += `### Critical Files\n`;
    for (const cFile of stats.criticalFiles) {
      summaryBody += `- **${cFile.name}** (${cFile.issues} issues)\n`;
    }
  }

  if (averageScore >= 80) {
    summaryBody += `\n---\n*Review passed with a healthy score.*`;
  } else if (averageScore >= 60) {
    summaryBody += `\n---\n*Review completed with some concerns. Please address the issues above.*`;
  } else {
    summaryBody += `\n---\n*Review found significant issues. Please prioritize fixing the critical files.*`;
  }

  await createPRComment(octokit, owner, repo, prNumber, summaryBody);

  return stats;
};

module.exports = { runWebhookWorkflow };
