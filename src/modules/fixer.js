const fs = require('fs');
const path = require('path');
const { aiClient, provider } = require('../config/aiConfig');

const fixCode = async (filePath, content, issues, retries = 3) => {
  const promptTemplate = fs.readFileSync(path.resolve(process.cwd(), 'prompts/fixPrompt.txt'), 'utf8');
  const issuesStr = JSON.stringify(issues, null, 2);
  const prompt = promptTemplate
    .replace('{{filePath}}', filePath)
    .replace('{{codeContent}}', content)
    .replace('{{issues}}', issuesStr);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let resultText = '';
      if (!aiClient) return null;

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
      if (attempt === retries) return null;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

module.exports = { fixCode };
