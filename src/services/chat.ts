import { generateWithFallback } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { searchSimilarDocumentation } from '@/services/embeddings';
import { logger } from '@/lib/logger';

const NO_CONTEXT_RESPONSE =
  'I could not find sufficient documentation to answer this question. Please ensure the repository has been analyzed and documentation has been generated.';

export async function chat(
  repositoryId: string,
  userId: string,
  message: string
): Promise<string> {
  logger.info('Chat request', { repositoryId, userId, message: message.slice(0, 100) });

  // Step 1: Search for relevant documentation using vector similarity
  let relevantDocs: Awaited<ReturnType<typeof searchSimilarDocumentation>> = [];
  try {
    relevantDocs = await searchSimilarDocumentation(message, repositoryId, 5);
  } catch (error) {
    logger.warn('Embedding search failed', { error });
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
        `### Context ${i + 1}: \`${doc.name}\` (similarity: ${(doc.similarity * 100).toFixed(1)}%)\n\n${doc.markdown}`
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

  const prompt = `You are an expert documentation assistant for a software project. 
Answer the developer's question using ONLY the provided documentation context.
If the answer is not in the context, say you don't have enough information.
Never hallucinate or invent API behavior.

## Documentation Context
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
