import { generateWithFallback } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { searchSimilarDocumentation } from '@/services/embeddings';
import { logger } from '@/lib/logger';

const NO_CONTEXT_RESPONSE =
  'I could not find sufficient documentation to answer this question. Please ensure the repository has been analyzed and documentation has been generated.';

// Text-similarity fallback: crude keyword match from DB docs when vector search is unavailable
async function fallbackDocSearch(query: string, repositoryId: string, limit: number = 5) {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 3);

  const docs = await prisma.documentation.findMany({
    where: {
      codeUnit: { repositoryId },
      status: { not: 'BROKEN' },
    },
    include: { codeUnit: true },
    take: 50,
  });

  const scored = docs.map((doc) => {
    const haystack = `${doc.codeUnit.name} ${doc.markdown}`.toLowerCase();
    const matches = keywords.filter((kw) => haystack.includes(kw)).length;
    return { documentationId: doc.id, markdown: doc.markdown, name: doc.codeUnit.name, similarity: matches / (keywords.length || 1) };
  });

  return scored
    .filter((d) => d.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function chat(
  repositoryId: string,
  userId: string,
  message: string
): Promise<string> {
  logger.info('Chat request', { repositoryId, userId, message: message.slice(0, 100) });

  // Step 1: Search for relevant documentation using vector similarity with fallback
  let relevantDocs: { documentationId: string; markdown: string; name: string; similarity: number }[] = [];
  try {
    relevantDocs = await searchSimilarDocumentation(message, repositoryId, 5);
  } catch (error) {
    logger.warn('Embedding search failed, using keyword fallback', { error });
    try {
      relevantDocs = await fallbackDocSearch(message, repositoryId, 5);
    } catch (fbError) {
      logger.warn('Keyword fallback also failed', { fbError });
    }
  }

  // If vector search returned nothing, try keyword fallback
  if (relevantDocs.length === 0) {
    try {
      relevantDocs = await fallbackDocSearch(message, repositoryId, 5);
    } catch {
      // ignore
    }
  }


  // Step 2: Store user message
  await prisma.chatHistory.create({
    data: {
      repositoryId,
      userId,
      role: 'USER',
      content: message,
    },
  });

  // Step 3: If no relevant docs found, return fallback
  if (relevantDocs.length === 0) {
    await prisma.chatHistory.create({
      data: {
        repositoryId,
        userId,
        role: 'ASSISTANT',
        content: NO_CONTEXT_RESPONSE,
      },
    });
    return NO_CONTEXT_RESPONSE;
  }

  // Step 4: Build RAG prompt
  const contextSection = relevantDocs
    .map(
      (doc, i) =>
        `### Source ${i + 1}: \`${doc.name}\`\n\n${doc.markdown}`
    )
    .join('\n\n---\n\n');

  // Get recent chat history for context
  const recentHistory = await prisma.chatHistory.findMany({
    where: { repositoryId, userId },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  const historySection = recentHistory
    .reverse()
    .slice(0, -1) // exclude last (the one we just added)
    .map((h) => `**${h.role}:** ${h.content}`)
    .join('\n');

  const sourceNames = relevantDocs.map((d) => `\`${d.name}\``).join(', ');

  const prompt = `You are an expert documentation assistant for a software project. 
Answer the developer's question using ONLY the provided documentation context.
After your answer, always include a "**Sources:**" line citing the relevant function/class names from the context (e.g. Sources: \`functionName\`).
If the answer is not in the context, say: "I don't have documentation for that in this repository."
Never hallucinate or invent API behavior.

## Documentation Context (from: ${sourceNames})
${contextSection}

${historySection ? `## Conversation History\n${historySection}\n` : ''}
## Developer Question
${message}

## Answer (in Markdown):`;


  const answer = await generateWithFallback(prompt);

  if (!answer || answer.trim().length < 10) {
    await prisma.chatHistory.create({
      data: { repositoryId, userId, role: 'ASSISTANT', content: NO_CONTEXT_RESPONSE },
    });
    return NO_CONTEXT_RESPONSE;
  }

  // Step 5: Store assistant response
  await prisma.chatHistory.create({
    data: {
      repositoryId,
      userId,
      role: 'ASSISTANT',
      content: answer.trim(),
    },
  });

  return answer.trim();
}

export async function getChatHistory(repositoryId: string, userId: string) {
  return prisma.chatHistory.findMany({
    where: { repositoryId, userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function clearChatHistory(repositoryId: string, userId: string) {
  return prisma.chatHistory.deleteMany({
    where: { repositoryId, userId },
  });
}
