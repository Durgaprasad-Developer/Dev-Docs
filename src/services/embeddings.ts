import { generateEmbedding } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function generateAndStoreEmbedding(
  documentationId: string
): Promise<void> {
  const doc = await prisma.documentation.findUniqueOrThrow({
    where: { id: documentationId },
    include: { codeUnit: true },
  });

  // Build text for embedding: combine code unit name + type + markdown
  const textToEmbed = [
    `Name: ${doc.codeUnit.name}`,
    `Type: ${doc.codeUnit.type}`,
    `Documentation:\n${doc.markdown}`,
  ].join('\n\n');

  logger.info(`Generating embedding for doc ${documentationId}`);

  const embedding = await generateEmbedding(textToEmbed);

  // Store as pgvector
  // We use raw query because Prisma doesn't natively support pgvector
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO embeddings (id, "documentationId", embedding, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, $2::vector, NOW(), NOW())
    ON CONFLICT ("documentationId")
    DO UPDATE SET embedding = $2::vector, "updatedAt" = NOW()
    `,
    documentationId,
    `[${embedding.join(',')}]`
  );

  logger.info(`Stored embedding for doc ${documentationId}`);
}

export async function searchSimilarDocumentation(
  query: string,
  repositoryId: string,
  limit: number = 5
): Promise<
  {
    documentationId: string;
    markdown: string;
    name: string;
    similarity: number;
  }[]
> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRawUnsafe<
    { documentationId: string; markdown: string; name: string; similarity: number }[]
  >(
    `
    SELECT
      e."documentationId",
      d.markdown,
      cu.name,
      1 - (e.embedding <=> $1::vector) AS similarity
    FROM embeddings e
    JOIN documentation d ON d.id = e."documentationId"
    JOIN code_units cu ON cu.id = d."codeUnitId"
    WHERE cu."repositoryId" = $2
    ORDER BY e.embedding <=> $1::vector
    LIMIT $3
    `,
    embeddingStr,
    repositoryId,
    limit
  );

  return results.map((r) => ({
    documentationId: r.documentationId,
    markdown: r.markdown,
    name: r.name,
    similarity: r.similarity,
  }));
}

export async function batchGenerateEmbeddings(
  repositoryId: string
): Promise<{ success: number; failed: number }> {
  const docs = await prisma.documentation.findMany({
    where: {
      codeUnit: { repositoryId },
      status: 'CURRENT',
    },
    select: { id: true },
  });

  let success = 0;
  let failed = 0;

  // Process in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((doc) => generateAndStoreEmbedding(doc.id))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') success++;
      else failed++;
    }
    // Rate limit buffer
    if (i + batchSize < docs.length) {
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  logger.info('Batch embedding complete', { success, failed });
  return { success, failed };
}
