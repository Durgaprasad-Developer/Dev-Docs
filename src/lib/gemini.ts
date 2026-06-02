import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 8192,
  },
});

export const geminiPro = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.2,
    topP: 0.8,
    maxOutputTokens: 16384,
  },
});

export async function generateContent(prompt: string): Promise<string> {
  const result = await geminiFlash.generateContent(prompt);
  const response = result.response;
  return response.text();
}

export async function generateWithFallback(prompt: string): Promise<string> {
  try {
    return await generateContent(prompt);
  } catch (error) {
    console.error('[Gemini Flash Error] Falling back to Pro:', error);
    const result = await geminiPro.generateContent(prompt);
    return result.response.text();
  }
}

// Generate embeddings (using text-embedding model)
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({
    model: 'text-embedding-004',
  });

  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}
