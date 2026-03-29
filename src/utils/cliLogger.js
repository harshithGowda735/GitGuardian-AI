const chalk = require('chalk');

class CliLogger {
  constructor() {
    this.indent = '  ';
  }

  // Render a file header with cyan color
  renderFileHeader(fileName) {
    console.log(chalk.cyan(fileName));
    console.log(chalk.gray('─'.repeat(fileName.length)));
  }

  // Render score with visualization and color based on value
  renderScore(score) {
    const filledDots = Math.round(score / 10);
    const emptyDots = 10 - filledDots;
    
    let scoreColor;
    if (score >= 80) scoreColor = chalk.green;
    else if (score >= 60) scoreColor = chalk.yellow;
    else scoreColor = chalk.red;
    
    const dots = '●'.repeat(filledDots) + '○'.repeat(emptyDots);
    console.log(`Score: ${scoreColor(`${score}/100`)}  ${dots}`);
  }

  // Render issues with icons and truncated suggestions
  renderIssues(issues) {
    if (!issues || issues.length === 0) return;
    
    issues.forEach(issue => {
      const typeIcon = issue.type === 'BUG' ? '⚠' : issue.type === 'STYLE' ? '💡' : 'ℹ️';
      const typeColor = issue.type === 'BUG' ? chalk.red : issue.type === 'STYLE' ? chalk.yellow : chalk.blue;
      
      console.log(`${this.indent}${typeColor(typeIcon)} Line ${issue.line}  (${typeColor(issue.type)})`);
      
      // Truncate description if too long
      const description = issue.description.length > 100 
        ? issue.description.substring(0, 97) + '...' 
        : issue.description;
      console.log(`${this.indent}${this.indent}${description}`);
      
      // Truncate suggestion if too long
      if (issue.suggestion) {
        const suggestion = issue.suggestion.length > 100 
          ? issue.suggestion.substring(0, 97) + '...' 
          : issue.suggestion;
        console.log(`${this.indent}${this.indent}→ ${suggestion}`);
      }
      console.log(''); // Empty line after each issue
    });
  }

  // Render progress indicator while processing (without newline)
  renderProcessing(fileName) {
    process.stdout.write(chalk.gray(`→ Reviewing: ${fileName}...`));
  }

  // Render completion indicator
  renderCompleted(fileName, score) {
    // Clear the processing line and move to beginning
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    
    const checkMark = chalk.green('✔');
    let scoreColor;
    if (score >= 80) scoreColor = chalk.green;
    else if (score >= 60) scoreColor = chalk.yellow;
    else scoreColor = chalk.red;
    
    console.log(`${checkMark} Completed: ${chalk.cyan(fileName)} (${scoreColor(`${score}/100`)})`);
  }

  // Render final summary
  renderSummary(data) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('GitGuardian AI Summary'));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(`Files Scanned: ${data.filesScanned}`);
    console.log(`Total Issues: ${data.totalIssues}`);
    console.log(`Average Score: ${data.averageScore}/100`);
    
    if (data.criticalFiles && data.criticalFiles.length > 0) {
      console.log('');
      console.log(chalk.bold('Critical Files:'));
      data.criticalFiles.forEach(file => {
        console.log(`- ${chalk.red(file.name)} (${file.issues})`);
      });
    }
  }

  // Simple success message
  success(message) {
    console.log(chalk.green('✔') + ' ' + message);
  }

  // Simple warning message
  warn(message) {
    console.log(chalk.yellow('⚠') + ' ' + message);
  }

  // Simple error message
  error(message) {
    console.log(chalk.red('✖') + ' ' + message);
  }

  // Info message
  info(message) {
    console.log(chalk.blue('ℹ ') + message);
  }
}

module.exports = new CliLogger();