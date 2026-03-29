const fs = require('fs');
const path = require('path');
const { aiClient, provider } = require('../config/aiConfig');
const logger = require('../utils/logger');

const reviewCode = async (filePath, content, patch = '', retries = 3) => {
  const promptTemplate = fs.readFileSync(path.resolve(process.cwd(), 'prompts/reviewPrompt.txt'), 'utf8');
  const prompt = promptTemplate
    .replace('{{filePath}}', filePath)
    .replace('{{codeContent}}', content)
    .replace('{{diffContent}}', patch || 'No diff provided (New file)');

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

      // Clean up potential markdown formatting
      resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(resultText);
    } catch (err) {
      logger.warn(`AI Review attempt ${attempt} failed for ${filePath}: ${err.message}`);
      if (attempt === retries) {
        logger.error(`AI Review final failure for ${filePath} after ${retries} attempts.`);
        return null;
      }
      // Wait before retry (exponential backoff / simple delay)
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

module.exports = { reviewCode };
