import { z } from 'zod';

export const AddRepositorySchema = z.object({
  githubUrl: z
    .string()
    .url()
    .regex(
      /github\.com/,
      'Must be a valid GitHub repository URL'
    ),
});

export const ChatMessageSchema = z.object({
  repositoryId: z.string().min(1, 'Repository ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const ApproveDocSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const WebhookPayloadSchema = z.object({
  ref: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  commits: z
    .array(
      z.object({
        id: z.string(),
        message: z.string(),
        modified: z.array(z.string()).optional(),
        added: z.array(z.string()).optional(),
        removed: z.array(z.string()).optional(),
      })
    )
    .optional(),
  repository: z
    .object({
      full_name: z.string(),
      default_branch: z.string().optional(),
    })
    .optional(),
});

export type AddRepositoryInput = z.infer<typeof AddRepositorySchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
export type ApproveDocInput = z.infer<typeof ApproveDocSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
