const fs = require('fs');
const path = require('path');
const { aiClient, provider } = require('../config/aiConfig');

const fixCode = async (filePath, content, issues) => {
  const promptTemplate = fs.readFileSync(path.resolve(process.cwd(), 'prompts/fixPrompt.txt'), 'utf8');
  const issuesStr = JSON.stringify(issues, null, 2);
  const prompt = promptTemplate
    .replace('{{filePath}}', filePath)
    .replace('{{codeContent}}', content)
    .replace('{{issues}}', issuesStr);

  try {
    let resultText = '';
    if (!aiClient) {
        return null;
    }
    if (provider === 'gemini') {
      const result = await aiClient.generateContent(prompt);
      resultText = result.response.text();
    } else if (provider === 'openai') {
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
      });
      resultText = response.choices[0].message.content;
    }

    // Clean up markdown block if present
    resultText = resultText.replace(/^```[a-z]*\n/gm, '').replace(/```$/gm, '').trim();
    return resultText;
  } catch (err) {
    return null;
  }
};

module.exports = { fixCode };
