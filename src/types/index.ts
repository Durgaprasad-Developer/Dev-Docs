export type RepoStatus = 'PENDING' | 'ANALYZING' | 'READY' | 'ERROR';
export type CodeUnitType =
  | 'FUNCTION'
  | 'CLASS'
  | 'INTERFACE'
  | 'METHOD'
  | 'VARIABLE'
  | 'TYPE'
  | 'MODULE';
export type DocStatus =
  | 'CURRENT'
  | 'OUTDATED'
  | 'BROKEN'
  | 'REVIEW_REQUIRED'
  | 'PENDING_REVIEW';
export type ChatRole = 'USER' | 'ASSISTANT';

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  githubUrl: string;
  owner: string;
  description?: string | null;
  language?: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  userId: string;
  status: RepoStatus;
  lastCommit?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: string;
  repositoryId: string;
  path: string;
  hash: string;
  lastCommit?: string | null;
  language?: string | null;
  size?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeUnit {
  id: string;
  repositoryId: string;
  fileId: string;
  name: string;
  type: CodeUnitType;
  startLine?: number | null;
  endLine?: number | null;
  metadata: CodeUnitMetadata;
  rawCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodeUnitMetadata {
  parameters?: Parameter[];
  returnType?: string;
  isAsync?: boolean;
  isExported?: boolean;
  decorators?: string[];
  extends?: string[];
  implements?: string[];
  description?: string;
}

export interface Parameter {
  name: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
}

export interface Documentation {
  id: string;
  codeUnitId: string;
  markdown: string;
  status: DocStatus;
  version: number;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentationVersion {
  id: string;
  documentationId: string;
  version: number;
  markdown: string;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  repositoryId: string;
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export interface ParsedCodeUnit {
  name: string;
  type: CodeUnitType;
  startLine: number;
  endLine: number;
  rawCode: string;
  metadata: CodeUnitMetadata;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RepositoryStats {
  totalFiles: number;
  totalCodeUnits: number;
  totalDocumented: number;
  staleCount: number;
  brokenCount: number;
  coveragePercent: number;
}

export interface DiffResult {
  oldContent: string;
  newContent: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}
