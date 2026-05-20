interface RenderContext {
  model: Record<string, any> | null;
  culture: string;
  variables: Record<string, any>;
}

export interface RenderResult {
  html: string;
  diagnostics: string[];
}

interface BalancedReadResult {
  content: string;
  end: number;
}

const IDENTIFIER_BOUNDARY = /[A-Za-z0-9_]/;

const hasOwn = (value: Record<string, any>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const isIdentifierBoundary = (char?: string) => !char || !IDENTIFIER_BOUNDARY.test(char);

const pushDiagnostic = (diagnostics: string[], message: string) => {
  if (!diagnostics.includes(message)) {
    diagnostics.push(message);
  }
};

const skipWhitespace = (input: string, start: number) => {
  let index = start;
  while (index < input.length && /\s/.test(input[index])) {
    index += 1;
  }
  return index;
};

const unwrapStringLiteral = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\([\\"'])/g, '$1');
  }

  return null;
};

const resolvePath = (source: any, path: string[]) => {
  let current = source;
  for (const segment of path) {
    if (current == null) {
      return undefined;
    }

    if (Array.isArray(current) && /^\d+$/.test(segment)) {
      current = current[Number(segment)];
      continue;
    }

    current = current[segment];
  }

  return current;
};

const splitTopLevel = (input: string, delimiter: string) => {
  const parts: string[] = [];
  let current = '';
  let quote: string | null = null;
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quote) {
      current += char;
      if (char === '\\') {
        current += input[index + 1] ?? '';
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '(') {
      roundDepth += 1;
      current += char;
      continue;
    }

    if (char === ')') {
      roundDepth = Math.max(0, roundDepth - 1);
      current += char;
      continue;
    }

    if (char === '[') {
      squareDepth += 1;
      current += char;
      continue;
    }

    if (char === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
      current += char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      current += char;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      current += char;
      continue;
    }

    if (
      char === delimiter &&
      roundDepth === 0 &&
      squareDepth === 0 &&
      braceDepth === 0
    ) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts.filter((part) => part.length > 0);
};

const findTopLevelOperator = (input: string, operators: string[]) => {
  let quote: string | null = null;
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      roundDepth += 1;
      continue;
    }

    if (char === ')') {
      roundDepth = Math.max(0, roundDepth - 1);
      continue;
    }

    if (char === '[') {
      squareDepth += 1;
      continue;
    }

    if (char === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (roundDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      const matched = operators.find((operator) => input.startsWith(operator, index));
      if (matched) {
        return { index, operator: matched };
      }
    }
  }

  return null;
};

const findStatementTerminator = (input: string, start: number) => {
  let quote: string | null = null;
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '(') {
      roundDepth += 1;
      continue;
    }

    if (char === ')') {
      roundDepth = Math.max(0, roundDepth - 1);
      continue;
    }

    if (char === '[') {
      squareDepth += 1;
      continue;
    }

    if (char === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (char === ';' && roundDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      return index;
    }
  }

  return -1;
};

export const readBalanced = (
  input: string,
  start: number,
  open: string,
  close: string,
): BalancedReadResult | null => {
  if (input[start] !== open) {
    return null;
  }

  let depth = 0;
  let quote: string | null = null;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (quote) {
      if (char === '\\') {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === open) {
      depth += 1;
      continue;
    }

    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          content: input.slice(start + 1, index),
          end: index + 1,
        };
      }
    }
  }

  return null;
};

export const evaluateExpression = (expr: string, ctx: RenderContext): any => {
  const trimmed = expr.trim();
  if (!trimmed) {
    return '';
  }

  const literal = unwrapStringLiteral(trimmed);
  if (literal !== null) {
    return literal;
  }

  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    const balanced = readBalanced(trimmed, 0, '(', ')');
    if (balanced && balanced.end === trimmed.length) {
      return evaluateExpression(balanced.content, ctx);
    }
  }

  if (findTopLevelOperator(trimmed, ['+'])) {
    return evaluateConcatExpression(trimmed, ctx);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true';
  }

  if (trimmed === 'null') {
    return null;
  }

  if (trimmed === 'Model') {
    return ctx.model;
  }

  if (trimmed === 'Culture.Name') {
    return ctx.culture;
  }

  if (trimmed === 'Culture.TwoLetterISOLanguageName') {
    return ctx.culture.slice(0, 2);
  }

  const segments = trimmed.split('.');
  const root = segments[0];

  if (root === 'Model') {
    return resolvePath(ctx.model, segments.slice(1));
  }

  if (root === 'Culture') {
    return undefined;
  }

  if (hasOwn(ctx.variables, root)) {
    return resolvePath(ctx.variables[root], segments.slice(1));
  }

  return undefined;
};

export const evaluateConcatExpression = (expr: string, ctx: RenderContext) =>
  splitTopLevel(expr, '+')
    .map((part) => {
      const value = evaluateExpression(part, ctx);
      return value == null ? '' : String(value);
    })
    .join('');

const isNullOrEmpty = (value: any) => value == null || String(value).length === 0;

export const evaluateCondition = (condition: string, ctx: RenderContext): boolean => {
  const trimmed = condition.trim();
  if (!trimmed) {
    return false;
  }

  const notNullOrEmptyMatch = trimmed.match(/^!\s*string\.IsNullOrEmpty\((.*)\)$/);
  if (notNullOrEmptyMatch) {
    return !isNullOrEmpty(evaluateExpression(notNullOrEmptyMatch[1], ctx));
  }

  const nullOrEmptyMatch = trimmed.match(/^string\.IsNullOrEmpty\((.*)\)$/);
  if (nullOrEmptyMatch) {
    return isNullOrEmpty(evaluateExpression(nullOrEmptyMatch[1], ctx));
  }

  const comparison = findTopLevelOperator(trimmed, ['==', '!=']);
  if (comparison) {
    const left = evaluateExpression(trimmed.slice(0, comparison.index), ctx);
    const right = evaluateExpression(trimmed.slice(comparison.index + comparison.operator.length), ctx);
    return comparison.operator === '==' ? left === right : left !== right;
  }

  if (trimmed.startsWith('!')) {
    return !evaluateCondition(trimmed.slice(1), ctx);
  }

  const value = evaluateExpression(trimmed, ctx);
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return Boolean(value);
};

const renderInternal = (template: string, ctx: RenderContext, diagnostics: string[]): string => {
  let output = '';
  let index = 0;

  while (index < template.length) {
    if (template[index] !== '@') {
      output += template[index];
      index += 1;
      continue;
    }

    if (template.startsWith('@@', index)) {
      output += '@';
      index += 2;
      continue;
    }

    if (template.startsWith('@if', index) && isIdentifierBoundary(template[index + 3])) {
      let cursor = skipWhitespace(template, index + 3);
      const conditionBlock = readBalanced(template, cursor, '(', ')');
      if (!conditionBlock) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed @if block.');
        index += 3;
        continue;
      }

      cursor = skipWhitespace(template, conditionBlock.end);
      const trueBlock = readBalanced(template, cursor, '{', '}');
      if (!trueBlock) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed @if block body.');
        index = conditionBlock.end;
        continue;
      }

      cursor = skipWhitespace(template, trueBlock.end);
      let falseBlock: BalancedReadResult | null = null;
      if (template.startsWith('else', cursor) && isIdentifierBoundary(template[cursor + 4])) {
        cursor = skipWhitespace(template, cursor + 4);
        falseBlock = readBalanced(template, cursor, '{', '}');
        if (!falseBlock) {
          pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed else block.');
        }
      }

      output += evaluateCondition(conditionBlock.content, ctx)
        ? renderInternal(trueBlock.content, ctx, diagnostics)
        : falseBlock
          ? renderInternal(falseBlock.content, ctx, diagnostics)
          : '';
      index = falseBlock ? falseBlock.end : trueBlock.end;
      continue;
    }

    if (template.startsWith('@foreach', index) && isIdentifierBoundary(template[index + 8])) {
      let cursor = skipWhitespace(template, index + 8);
      const loopDefinition = readBalanced(template, cursor, '(', ')');
      if (!loopDefinition) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed @foreach block.');
        index += 8;
        continue;
      }

      cursor = skipWhitespace(template, loopDefinition.end);
      const body = readBalanced(template, cursor, '{', '}');
      if (!body) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed @foreach body.');
        index = loopDefinition.end;
        continue;
      }

      const match = loopDefinition.content.match(/^\s*var\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+)$/s);
      if (!match) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: @foreach only supports var item in Model.Collection.');
        index = body.end;
        continue;
      }

      const [, itemName, collectionExpression] = match;
      const collection = evaluateExpression(collectionExpression, ctx);
      if (!Array.isArray(collection)) {
        pushDiagnostic(diagnostics, `@foreach expected an array for ${collectionExpression.trim()}.`);
        index = body.end;
        continue;
      }

      output += collection
        .map((item) =>
          renderInternal(body.content, { ...ctx, variables: { ...ctx.variables, [itemName]: item } }, diagnostics),
        )
        .join('');
      index = body.end;
      continue;
    }

    if (template.startsWith('@{', index)) {
      const codeBlock = readBalanced(template, index + 1, '{', '}');
      if (!codeBlock) {
        pushDiagnostic(diagnostics, 'Unsupported Razor construct: malformed code block.');
        index += 2;
        continue;
      }

      executeCodeBlock(codeBlock.content, ctx, diagnostics);
      index = codeBlock.end;
      continue;
    }

    if (template[index + 1] === '(') {
      const explicitExpression = readBalanced(template, index + 1, '(', ')');
      pushDiagnostic(diagnostics, 'Unsupported Razor construct: explicit @(...) expressions are not supported.');
      index = explicitExpression ? explicitExpression.end : index + 2;
      continue;
    }

    const expressionMatch = template.slice(index + 1).match(/^([A-Za-z_][A-Za-z0-9_.]*)/);
    if (expressionMatch) {
      const expression = expressionMatch[1];
      const root = expression.split('.')[0];
      if (root === 'Model' || root === 'Culture' || hasOwn(ctx.variables, root)) {
        const value = evaluateExpression(expression, ctx);
        output += value == null ? '' : String(value);
        index += expression.length + 1;
        continue;
      }

      if (/^[A-Z]/.test(root)) {
        pushDiagnostic(diagnostics, `Unsupported Razor expression: @${expression}`);
        index += expression.length + 1;
        continue;
      }
    }

    output += '@';
    index += 1;
  }

  return output;
};

const executeCodeBlock = (code: string, ctx: RenderContext, diagnostics: string[]) => {
  let index = 0;

  while (index < code.length) {
    index = skipWhitespace(code, index);
    if (index >= code.length) {
      break;
    }

    if (code.startsWith('if', index) && isIdentifierBoundary(code[index + 2])) {
      let cursor = skipWhitespace(code, index + 2);
      const conditionBlock = readBalanced(code, cursor, '(', ')');
      if (!conditionBlock) {
        pushDiagnostic(diagnostics, 'Unsupported Razor code block: malformed if statement.');
        return;
      }

      cursor = skipWhitespace(code, conditionBlock.end);
      const trueBlock = readBalanced(code, cursor, '{', '}');
      if (!trueBlock) {
        pushDiagnostic(diagnostics, 'Unsupported Razor code block: malformed if body.');
        return;
      }

      cursor = skipWhitespace(code, trueBlock.end);
      let falseBlock: BalancedReadResult | null = null;
      if (code.startsWith('else', cursor) && isIdentifierBoundary(code[cursor + 4])) {
        cursor = skipWhitespace(code, cursor + 4);
        falseBlock = readBalanced(code, cursor, '{', '}');
        if (!falseBlock) {
          pushDiagnostic(diagnostics, 'Unsupported Razor code block: malformed else body.');
          return;
        }
      }

      if (evaluateCondition(conditionBlock.content, ctx)) {
        executeCodeBlock(trueBlock.content, ctx, diagnostics);
      } else if (falseBlock) {
        executeCodeBlock(falseBlock.content, ctx, diagnostics);
      }

      index = falseBlock ? falseBlock.end : trueBlock.end;
      continue;
    }

    const statementEnd = findStatementTerminator(code, index);
    if (statementEnd === -1) {
      const remainder = code.slice(index).trim();
      if (remainder) {
        pushDiagnostic(diagnostics, `Unsupported Razor code block statement: ${remainder}`);
      }
      return;
    }

    const statement = code.slice(index, statementEnd).trim();
    if (statement) {
      const declarationMatch = statement.match(/^string\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/s);
      if (declarationMatch) {
        const [, name, expression] = declarationMatch;
        ctx.variables[name] = evaluateConcatExpression(expression, ctx);
      } else {
        const assignmentMatch = statement.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/s);
        if (assignmentMatch && hasOwn(ctx.variables, assignmentMatch[1])) {
          const [, name, expression] = assignmentMatch;
          ctx.variables[name] = evaluateConcatExpression(expression, ctx);
        } else {
          pushDiagnostic(diagnostics, `Unsupported Razor code block statement: ${statement}`);
        }
      }
    }

    index = statementEnd + 1;
  }
};

export const render = (
  template: string,
  model: Record<string, any> | null,
  culture: string,
): RenderResult => {
  const diagnostics: string[] = [];
  const html = renderInternal(template ?? '', { model, culture, variables: {} }, diagnostics);
  return { html, diagnostics };
};
