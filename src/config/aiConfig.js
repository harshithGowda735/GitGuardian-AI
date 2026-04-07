require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const provider = process.env.AI_PROVIDER || 'gemini';

let aiClient = null;

if (provider === 'gemini') {
  if (process.env.GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    aiClient = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  } else {
    console.warn("[WARN] GEMINI_API_KEY is not set.");
  }
} else if (provider === 'openai') {
  if (process.env.OPENAI_API_KEY) {
    aiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  } else {
    console.warn("[WARN] OPENAI_API_KEY is not set.");
  }
}

module.exports = {
  aiClient,
  provider
};