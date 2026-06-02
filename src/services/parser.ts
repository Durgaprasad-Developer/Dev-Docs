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

export function parseSourceFile(code: string, filePath: string): ParsedCodeUnit[] {
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
  return 'unknown';
}
