const fs = require('fs');
const path = require('path');
const { aiClient, provider } = require('../config/aiConfig');
const logger = require('../utils/logger');

const reviewCode = async (filePath, content) => {
  const promptTemplate = fs.readFileSync(path.resolve(process.cwd(), 'prompts/reviewPrompt.txt'), 'utf8');
  const prompt = promptTemplate.replace('{{filePath}}', filePath).replace('{{codeContent}}', content);

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

    // Clean up potential markdown formatting
    resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(resultText);
  } catch (err) {
    logger.error(`AI Review failed for ${filePath}:\n${err.message}`);
    return null;
  }
};

module.exports = { reviewCode };
