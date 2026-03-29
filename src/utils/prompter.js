const inquirer = require('inquirer');
const diff = require('diff');
const chalk = require('chalk');

const promptFixConfirmation = async (fileName, score, issuesCount) => {
  console.log("\n");
  console.log(`File: ${chalk.cyan(fileName)}`);
  
  let scoreColor;
  if (score >= 80) scoreColor = chalk.green;
  else if (score >= 60) scoreColor = chalk.yellow;
  else scoreColor = chalk.red;
  
  console.log(`Score: ${scoreColor(`${score}/100`)}`);
  console.log(`Issues: ${chalk.bold(issuesCount)}\n`);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Do you want to apply AI-generated fix?',
      choices: [
        { name: 'Yes (apply fix)', value: 'yes' },
        { name: 'No (skip)', value: 'no' },
        { name: 'View Fix (preview changes before applying)', value: 'view' }
      ]
    }
  ]);

  return answers.action;
};

const previewFix = (originalCode, fixedCode) => {
  console.log(chalk.bold.underline("\nFix Preview:"));
  
  const differences = diff.diffLines(originalCode, fixedCode);
  
  differences.forEach((part) => {
    const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.gray;
    const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
    
    // Remove the trailing newline for accurate printing on console
    const value = part.value.replace(/\n$/, '');
    const lines = value.split('\n');
    
    lines.forEach(line => {
      console.log(color(`${prefix}${line}`));
    });
  });
  console.log("");
};

const promptApplyAfterPreview = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'apply',
      message: 'Apply this fix?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false }
      ]
    }
  ]);
  return answers.apply;
};

module.exports = {
  promptFixConfirmation,
  previewFix,
  promptApplyAfterPreview
};
