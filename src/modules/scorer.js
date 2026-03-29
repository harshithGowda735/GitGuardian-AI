const calculateScore = (reviewResult) => {
  if (!reviewResult || !reviewResult.issues) {
    return 100; // Perfect score if no issues
  }
  
  let score = 100;
  reviewResult.issues.forEach(issue => {
    switch (issue.type) {
      case 'bug':
        score -= 20;
        break;
      case 'security':
        score -= 30;
        break;
      case 'performance':
        score -= 10;
        break;
      case 'style':
      default:
        score -= 5;
        break;
    }
  });

  // Ensure score doesn't drop below 0
  return Math.max(0, score);
};

module.exports = { calculateScore };
