import { generateWithFallback } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ParsedCodeUnit } from '@/types';

const SYSTEM_PROMPT = `You are an expert technical documentation writer for software engineers.
Generate comprehensive, accurate Markdown documentation for the provided code unit.
Documentation must be in Markdown format and include:
1. A clear purpose/description paragraph
2. Parameters table (if applicable)
3. Return value description (if applicable)
4. Usage example (realistic, not placeholder)
5. Notes about edge cases or side effects
Be concise but thorough. Never hallucinate or invent behavior not present in the code.`;

export async function generateDocumentation(
  codeUnit: ParsedCodeUnit,
  filePath: string
): Promise<string> {
  const fileExtension = filePath.split('.').pop() ?? 'ts';
  const lang = fileExtension === 'py' ? 'python' : fileExtension === 'js' || fileExtension === 'jsx' ? 'javascript' : 'typescript';

  const paramsSection =
    codeUnit.metadata.parameters && codeUnit.metadata.parameters.length > 0
      ? `Parameters: ${codeUnit.metadata.parameters
          .map((p) => `${p.name}${p.optional ? '?' : ''}: ${p.type ?? 'unknown'}`)
          .join(', ')}`
      : 'No parameters';

  const prompt = `${SYSTEM_PROMPT}

## Code Unit Information
- **Name:** ${codeUnit.name}
- **Type:** ${codeUnit.type}
- **File:** ${filePath}
- **${paramsSection}**
- **Return Type:** ${codeUnit.metadata.returnType ?? 'void'}
- **Async:** ${codeUnit.metadata.isAsync ? 'Yes' : 'No'}
- **Exported:** ${codeUnit.metadata.isExported ? 'Yes' : 'No'}

## Source Code
\`\`\`${lang}
${codeUnit.rawCode}
\`\`\`

Generate complete Markdown documentation now:`;

  const rawMarkdown = await generateWithFallback(prompt);

  // Validate: ensure it's actually markdown with content
  if (!rawMarkdown || rawMarkdown.trim().length < 50) {
    throw new Error('Generated documentation is too short or empty');
  }

  return rawMarkdown.trim();
}

export async function generateAndStoreDocumentation(
  codeUnitId: string,
  filePath: string,
  parsedUnit: ParsedCodeUnit
): Promise<string> {
  logger.info(`Generating docs for ${parsedUnit.name}`, { codeUnitId });

  // Check if doc already exists
  const existing = await prisma.documentation.findFirst({
    where: { codeUnitId },
  });

  const markdown = await generateDocumentation(parsedUnit, filePath);

  if (existing) {
    // Create new version and update
    await prisma.documentationVersion.create({
      data: {
        documentationId: existing.id,
        version: existing.version,
        markdown: existing.markdown,
        changedBy: 'ai',
      },
    });

    await prisma.documentation.update({
      where: { id: existing.id },
      data: {
        markdown,
        status: 'CURRENT',
        version: existing.version + 1,
      },
    });

    logger.info(`Updated docs for ${parsedUnit.name}`, { version: existing.version + 1 });
    return existing.id;
  } else {
    const doc = await prisma.documentation.create({
      data: {
        codeUnitId,
        markdown,
        status: 'CURRENT',
        version: 1,
      },
    });

    // Save initial version
    await prisma.documentationVersion.create({
      data: {
        documentationId: doc.id,
        version: 1,
        markdown,
        changedBy: 'ai',
      },
    });

    logger.info(`Created docs for ${parsedUnit.name}`);
    return doc.id;
  }
}

export async function generateUpdatedDocumentation(
  docId: string,
  codeChanges: string,
  filePath: string
): Promise<string> {
  const doc = await prisma.documentation.findUniqueOrThrow({
    where: { id: docId },
    include: { codeUnit: true },
  });

  const prompt = `${SYSTEM_PROMPT}

## Task: Update Existing Documentation

The source code has changed. Review the current documentation and generate an updated version that accurately reflects the new code.

## Current Documentation
${doc.markdown}

## Code Changes
\`\`\`diff
${codeChanges}
\`\`\`

## File: ${filePath}
## Code Unit: ${doc.codeUnit.name}

Generate the COMPLETE updated Markdown documentation:`;

  const updated = await generateWithFallback(prompt);

  if (!updated || updated.trim().length < 50) {
    throw new Error('Updated documentation generation failed');
  }

  return updated.trim();
}
