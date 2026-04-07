require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log('Using API Key:', apiKey.substring(0, 5) + '...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent("Hello, are you working?");
        console.log('Response:', result.response.text());
    } catch (err) {
        console.error('Test Failed:', err);
    }
}

test();
