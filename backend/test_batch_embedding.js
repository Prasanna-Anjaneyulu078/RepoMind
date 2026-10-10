require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testBatchEmbedding() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.batchEmbedContents({
      model: 'gemini-embedding-2',
      requests: [
        { content: 'Text A' },
        { content: 'Text B' }
      ],
      config: { outputDimensionality: 768 }
    });
    console.log('Returned embeddings count:', response.embeddings.length);
  } catch (err) {
    if (err.message.includes('batchEmbedContents is not a function')) {
      console.error('No such method');
    } else {
      console.error('Error:', err);
    }
  }
}
testBatchEmbedding();
