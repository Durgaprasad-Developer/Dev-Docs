import { parse } from '@babel/parser';
import type { ParsedCodeUnit } from '@/types';
import { logger } from '@/lib/logger';

type BabelNode = {
  type: string;
  start?: number;
  end?: number;
  loc?: {
    start: { line: number };
    end: { line: number };
  };
  id?: { name?: string; type?: string };
  key?: { name?: string; type?: string };
  kind?: string;
  async?: boolean;
  params?: unknown[];
  returnType?: { typeAnnotation?: { type?: string; typeName?: { name?: string }; elementType?: unknown } };
  typeParameters?: unknown;
  body?: {
    body?: BabelNode[];
    type?: string;
  };
  declaration?: BabelNode;
  exported?: { name?: string } | { type: string };
  specifiers?: unknown[];
  superClass?: { name?: string };
  implements?: Array<{ expression?: { name?: string } }>;
  decorators?: Array<{ expression?: { callee?: { name?: string }; name?: string } }>;
  accessibility?: string;
  static?: boolean;
};

function extractReturnType(node: BabelNode): string {
  const rt = node.returnType?.typeAnnotation;
  if (!rt) return 'void';
  if (rt.type === 'TSTypeReference' && rt.typeName) {
    if ('name' in rt.typeName) return rt.typeName.name ?? 'unknown';
  }
  if (rt.type === 'TSStringKeyword') return 'string';
  if (rt.type === 'TSNumberKeyword') return 'number';
  if (rt.type === 'TSBooleanKeyword') return 'boolean';
  if (rt.type === 'TSVoidKeyword') return 'void';
  if (rt.type === 'TSArrayType') return 'Array';
  if (rt.type === 'TSPromiseType') return 'Promise';
  return rt.type ?? 'unknown';
}

function extractParams(params: unknown[]): { name: string; type?: string; optional?: boolean }[] {
  return params.map((p) => {
    const param = p as Record<string, unknown>;
    const name =
      param.type === 'Identifier'
        ? (param.name as string) ?? 'param'
        : param.type === 'AssignmentPattern'
        ? ((param.left as Record<string, unknown>)?.name as string) ?? 'param'
        : 'param';
    const optional = Boolean(param.optional);
    const typeAnnotation = param.typeAnnotation as Record<string, unknown> | undefined;
    const typeRef = typeAnnotation?.typeAnnotation as Record<string, unknown> | undefined;
    const type = typeRef?.type
      ? typeRef.type === 'TSStringKeyword'
        ? 'string'
        : typeRef.type === 'TSNumberKeyword'
        ? 'number'
        : typeRef.type === 'TSBooleanKeyword'
        ? 'boolean'
        : (((typeRef as Record<string, unknown>)?.typeName as Record<string, unknown>)?.name as string) ?? 'unknown'
      : undefined;
    return { name, type, optional };
  });
}

export function parsePythonSource(code: string): ParsedCodeUnit[] {
  const units: ParsedCodeUnit[] = [];
  const lines = code.split('\n');

  let currentClass: string | null = null;
  let currentClassIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const matchIndent = line.match(/^([ \t]*)/);
    const indent = matchIndent ? matchIndent[0].length : 0;

    if (currentClass !== null && indent <= currentClassIndent && trimmed !== '') {
      currentClass = null;
      currentClassIndent = -1;
    }

    // Match class: class ClassName(Base): or class ClassName:
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\(([^)]*)\))?\s*:/);
    if (classMatch) {
      const className = classMatch[1];
      const baseClasses = classMatch[2] ? classMatch[2].split(',').map((b) => b.trim()) : [];
      const startLine = i + 1;

      let endLine = startLine;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed) continue;
        const nextIndent = nextLine.match(/^([ \t]*)/)?.[0].length ?? 0;
        if (nextIndent <= indent) {
          break;
        }
        endLine = j + 1;
      }

      const rawCode = lines.slice(startLine - 1, endLine).join('\n');

      units.push({
        name: className,
        type: 'CLASS',
        startLine,
        endLine,
        rawCode: rawCode.slice(0, 4000),
        metadata: {
          extends: baseClasses,
          implements: [],
          isExported: true,
        },
      });

      currentClass = className;
      currentClassIndent = indent;
      continue;
    }

    // Match def: def func_name(params):
    const defMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/);
    if (defMatch) {
      const funcName = defMatch[1];
      const paramsString = defMatch[2];
      const returnType = defMatch[3] ? defMatch[3].trim() : 'void';
      const startLine = i + 1;

      const parameters = paramsString
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p && p !== 'self' && p !== 'cls')
        .map((p) => {
          const parts = p.split('=')[0].split(':');
          return {
            name: parts[0].trim(),
            type: parts[1] ? parts[1].trim() : undefined,
            optional: p.includes('='),
          };
        });

      let endLine = startLine;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed) continue;
        const nextIndent = nextLine.match(/^([ \t]*)/)?.[0].length ?? 0;
        if (nextIndent <= indent) {
          break;
        }
        endLine = j + 1;
      }

      const rawCode = lines.slice(startLine - 1, endLine).join('\n');

      if (currentClass) {
        units.push({
          name: `${currentClass}.${funcName}`,
          type: 'METHOD',
          startLine,
          endLine,
          rawCode: rawCode.slice(0, 2000),
          metadata: {
            parameters,
            returnType,
            isAsync: trimmed.startsWith('async '),
          },
        });
      } else {
        units.push({
          name: funcName,
          type: 'FUNCTION',
          startLine,
          endLine,
          rawCode: rawCode.slice(0, 4000),
          metadata: {
            parameters,
            returnType,
            isAsync: trimmed.startsWith('async '),
            isExported: true,
          },
        });
      }
    }
  }

  return units;
}

export function parseSourceFile(code: string, filePath: string): ParsedCodeUnit[] {
  if (filePath.endsWith('.py')) {
    return parsePythonSource(code);
  }

  const units: ParsedCodeUnit[] = [];
  const lines = code.split('\n');

  const isTS = /\.(ts|tsx)$/.test(filePath);

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: isTS
        ? ['typescript', 'jsx', 'decorators-legacy', 'classProperties']
        : ['jsx', 'decorators-legacy', 'classProperties'],
      errorRecovery: true,
    });
  } catch (error) {
    logger.warn(`Parse error for ${filePath}`, { error });
    return units;
  }

  function getCode(start: number, end: number): string {
    return code.slice(start, end);
  }

  function visitNode(node: BabelNode, parentName?: string): void {
    if (!node || !node.type) return;

    // Function declarations
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      const name =
        node.id?.name ?? parentName ?? 'anonymous';
      const startLine = node.loc?.start.line ?? 0;
      const endLine = node.loc?.end.line ?? 0;
      const rawCode = node.start != null && node.end != null ? getCode(node.start, node.end) : '';

      units.push({
        name,
        type: 'FUNCTION',
        startLine,
        endLine,
        rawCode: rawCode.slice(0, 4000), // limit size
        metadata: {
          parameters: extractParams(node.params ?? []),
          returnType: extractReturnType(node),
          isAsync: node.async ?? false,
          isExported: false,
        },
      });
    }

    // Class declarations
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      const name = node.id?.name ?? parentName ?? 'AnonymousClass';
      const startLine = node.loc?.start.line ?? 0;
      const endLine = node.loc?.end.line ?? 0;
      const rawCode = node.start != null && node.end != null ? getCode(node.start, node.end) : '';

      const superClass = node.superClass?.name;
      const implementsList = (node.implements ?? []).map(
        (i) => i.expression?.name ?? ''
      );

      units.push({
        name,
        type: 'CLASS',
        startLine,
        endLine,
        rawCode: rawCode.slice(0, 4000),
        metadata: {
          extends: superClass ? [superClass] : [],
          implements: implementsList,
          isExported: false,
        },
      });

      // Visit class body
      if (node.body?.body) {
        for (const member of node.body.body) {
          if (
            member.type === 'ClassMethod' ||
            member.type === 'ClassPrivateMethod'
          ) {
            const methodName = member.key?.name ?? 'method';
            const ms = member.loc?.start.line ?? 0;
            const me = member.loc?.end.line ?? 0;
            const methodCode = member.start != null && member.end != null ? getCode(member.start, member.end) : '';
            units.push({
              name: `${name}.${methodName}`,
              type: 'METHOD',
              startLine: ms,
              endLine: me,
              rawCode: methodCode.slice(0, 2000),
              metadata: {
                parameters: extractParams(member.params ?? []),
                returnType: extractReturnType(member),
                isAsync: member.async ?? false,
              },
            });
          }
        }
      }
    }

    // TypeScript interfaces
    if (node.type === 'TSInterfaceDeclaration') {
      const name = (node as unknown as { id: { name: string } }).id?.name ?? 'Interface';
      const startLine = node.loc?.start.line ?? 0;
      const endLine = node.loc?.end.line ?? 0;
      const rawCode = node.start != null && node.end != null ? getCode(node.start, node.end) : '';
      units.push({
        name,
        type: 'INTERFACE',
        startLine,
        endLine,
        rawCode: rawCode.slice(0, 2000),
        metadata: {},
      });
    }

    // Export declarations (mark as exported)
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      visitNode(node.declaration);
      // Mark last unit as exported
      if (units.length > 0) {
        units[units.length - 1].metadata.isExported = true;
      }
    } else if (node.type === 'ExportDefaultDeclaration' && node.declaration) {
      visitNode(node.declaration, 'default');
      if (units.length > 0) {
        units[units.length - 1].metadata.isExported = true;
      }
    }

    // Variable declarations (looking for function assignments)
    if (node.type === 'VariableDeclaration') {
      const decl = node as unknown as { declarations: Array<{ id: { name?: string }; init?: BabelNode }> };
      for (const d of decl.declarations) {
        if (
          d.init &&
          (d.init.type === 'ArrowFunctionExpression' ||
            d.init.type === 'FunctionExpression')
        ) {
          visitNode(d.init, d.id?.name);
        }
      }
    }
  }

  // Walk the AST body
  for (const node of (ast.program.body as unknown as BabelNode[])) {
    visitNode(node);
  }

  return units;
}

export function getLanguageFromPath(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.py')) return 'python';
  return 'unknown';
}

