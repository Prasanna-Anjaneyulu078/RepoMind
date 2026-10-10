require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testEmbedding() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: ['Text A', 'Text B'],
      config: { outputDimensionality: 768 }
    });
    console.log('Returned embeddings count:', response.embeddings.length);
  } catch (err) {
    console.error('Error:', err);
  }
}
testEmbedding();
