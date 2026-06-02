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

export async function generateWithNvidia(prompt: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    throw new Error('NVIDIA_API_KEY environment variable is not configured');
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nvidiaKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

export async function generateWithFallback(prompt: string): Promise<string> {
  try {
    return await generateContent(prompt);
  } catch (error) {
    console.error('[Gemini Flash Error] Falling back to Gemini Pro:', error);
    try {
      const result = await geminiPro.generateContent(prompt);
      return result.response.text();
    } catch (proError) {
      console.error('[Gemini Pro Error] Falling back to NVIDIA Llama 3.3:', proError);
      try {
        return await generateWithNvidia(prompt);
      } catch (nvError) {
        console.error('[NVIDIA Fallback Error] All model pipelines exhausted:', nvError);
        throw nvError;
      }
    }
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
