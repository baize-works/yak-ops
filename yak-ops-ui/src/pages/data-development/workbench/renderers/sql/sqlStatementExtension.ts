import { type EditorState, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  gutter,
  keymap,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

export interface SqlStatementRange {
  from: number;
  to: number;
  fromLine: number;
  toLine: number;
  sql: string;
  source: 'selection' | 'statement';
}

export type SqlStatementRunHandler = (range: SqlStatementRange) => void;

interface ParsedSqlStatement {
  rawFrom: number;
  rawTo: number;
  from: number;
  to: number;
}

const isWhitespace = (value: string) => /\s/.test(value);

const skipLineComment = (source: string, position: number, limit: number) => {
  let cursor = position + 2;
  while (cursor < limit && source[cursor] !== '\n') cursor += 1;
  return cursor;
};

const skipBlockComment = (source: string, position: number, limit: number) => {
  let cursor = position + 2;
  while (cursor < limit - 1) {
    if (source[cursor] === '*' && source[cursor + 1] === '/') {
      return cursor + 2;
    }
    cursor += 1;
  }
  return limit;
};

const skipLeadingTrivia = (source: string, from: number, to: number) => {
  let cursor = from;

  while (cursor < to) {
    if (isWhitespace(source[cursor])) {
      cursor += 1;
      continue;
    }

    if (source[cursor] === '-' && source[cursor + 1] === '-') {
      cursor = skipLineComment(source, cursor, to);
      continue;
    }

    if (source[cursor] === '/' && source[cursor + 1] === '*') {
      cursor = skipBlockComment(source, cursor, to);
      continue;
    }

    break;
  }

  return cursor;
};

const trimTrailingWhitespace = (source: string, from: number, to: number) => {
  let cursor = to;
  while (cursor > from && isWhitespace(source[cursor - 1])) cursor -= 1;
  return cursor;
};

const normalizeStatement = (
  source: string,
  rawFrom: number,
  rawTo: number,
): ParsedSqlStatement | undefined => {
  const from = skipLeadingTrivia(source, rawFrom, rawTo);
  const to = trimTrailingWhitespace(source, from, rawTo);

  if (from >= to) return undefined;

  const executable = source
    .slice(from, to)
    .replace(/;/g, '')
    .trim();

  if (!executable) return undefined;

  return { rawFrom, rawTo, from, to };
};

/**
 * Split SQL on semicolons while preserving semicolons inside quoted values and
 * comments. This is intentionally dialect-neutral—the SQL language service can
 * still provide syntax parsing separately.
 */
export const parseSqlStatements = (source: string): ParsedSqlStatement[] => {
  const statements: ParsedSqlStatement[] = [];
  let statementStart = 0;
  let quote: "'" | '"' | '`' | undefined;
  let lineComment = false;
  let blockComment = false;

  const appendStatement = (rawTo: number) => {
    const statement = normalizeStatement(source, statementStart, rawTo);
    if (statement) statements.push(statement);
    statementStart = rawTo;
  };

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (current === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (current === '\\') {
        index += 1;
        continue;
      }

      if (current === quote) {
        if (next === quote) {
          index += 1;
        } else {
          quote = undefined;
        }
      }
      continue;
    }

    if (current === '-' && next === '-') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (current === "'" || current === '"' || current === '`') {
      quote = current;
      continue;
    }

    if (current === ';') appendStatement(index + 1);
  }

  if (statementStart < source.length) appendStatement(source.length);
  return statements;
};

const createRange = (
  state: EditorState,
  from: number,
  to: number,
  source: SqlStatementRange['source'],
): SqlStatementRange | undefined => {
  const text = state.doc.sliceString(from, to);
  let leading = 0;
  let trailing = text.length;

  while (leading < trailing && isWhitespace(text[leading])) leading += 1;
  while (trailing > leading && isWhitespace(text[trailing - 1])) trailing -= 1;

  const normalizedFrom = from + leading;
  const normalizedTo = from + trailing;
  if (normalizedFrom >= normalizedTo) return undefined;

  const lastCharacter = Math.max(normalizedFrom, normalizedTo - 1);

  return {
    from: normalizedFrom,
    to: normalizedTo,
    fromLine: state.doc.lineAt(normalizedFrom).number,
    toLine: state.doc.lineAt(lastCharacter).number,
    sql: state.doc.sliceString(normalizedFrom, normalizedTo),
    source,
  };
};

export const resolveSqlStatementRange = (
  state: EditorState,
): SqlStatementRange | undefined => {
  const selection = state.selection.main;

  if (!selection.empty) {
    return createRange(state, selection.from, selection.to, 'selection');
  }

  const source = state.doc.toString();
  const cursor = selection.head;
  const statements = parseSqlStatements(source);

  const current =
    statements.find(
      (statement) => cursor >= statement.rawFrom && cursor <= statement.rawTo,
    ) ??
    statements.find((statement) => cursor < statement.rawFrom) ??
    statements.at(-1);

  if (!current) return undefined;
  return createRange(state, current.from, current.to, 'statement');
};

const buildStatementDecorations = (
  view: EditorView,
  statement?: SqlStatementRange,
): DecorationSet => {
  if (!statement) return Decoration.none;

  const decorations = [];
  let line = view.state.doc.lineAt(statement.from);
  const lastLine = view.state.doc.lineAt(
    Math.max(statement.from, statement.to - 1),
  );

  while (line.number <= lastLine.number) {
    const classes = ['cm-sql-statement-line'];
    if (line.number === statement.fromLine) {
      classes.push('cm-sql-statement-line-first');
    }
    if (line.number === statement.toLine) {
      classes.push('cm-sql-statement-line-last');
    }

    decorations.push(
      Decoration.line({
        attributes: { class: classes.join(' ') },
      }).range(line.from),
    );

    if (line.number === lastLine.number) break;
    line = view.state.doc.line(line.number + 1);
  }

  return Decoration.set(decorations, true);
};

class SqlRunMarker extends GutterMarker {
  constructor(
    readonly statement: SqlStatementRange,
    readonly onRun: SqlStatementRunHandler,
  ) {
    super();
  }

  toDOM() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-sql-run-button';
    button.title = '运行当前 SQL（Ctrl+Enter）';
    button.setAttribute('aria-label', `运行第 ${this.statement.fromLine} 至 ${this.statement.toLine} 行 SQL`);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M7 4.8 18.5 12 7 19.2Z');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    button.appendChild(svg);

    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onRun(this.statement);
    });

    return button;
  }
}

const sqlRunSpacer = new (class extends GutterMarker {
  toDOM() {
    const spacer = document.createElement('span');
    spacer.className = 'cm-sql-run-spacer';
    return spacer;
  }
})();

export const createSqlStatementExtensions = (
  onRun: SqlStatementRunHandler,
): Extension[] => {
  const statementPlugin = ViewPlugin.fromClass(
    class {
      statement?: SqlStatementRange;
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.statement = resolveSqlStatementRange(view.state);
        this.decorations = buildStatementDecorations(view, this.statement);
      }

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;
        this.statement = resolveSqlStatementRange(update.state);
        this.decorations = buildStatementDecorations(
          update.view,
          this.statement,
        );
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );

  return [
    statementPlugin,
    gutter({
      class: 'cm-sql-run-gutter',
      initialSpacer: () => sqlRunSpacer,
      lineMarker: (view, line) => {
        const statement = view.plugin(statementPlugin)?.statement;
        if (!statement) return null;

        const firstLine = view.state.doc.lineAt(statement.from);
        return line.from === firstLine.from
          ? new SqlRunMarker(statement, onRun)
          : null;
      },
      lineMarkerChange: (update) => update.docChanged || update.selectionSet,
    }),
    keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: (view) => {
          const statement = resolveSqlStatementRange(view.state);
          if (!statement) return false;
          onRun(statement);
          return true;
        },
      },
    ]),
    EditorView.baseTheme({
      '.cm-sql-run-gutter': {
        minWidth: '26px',
      },
      '.cm-sql-run-gutter .cm-gutterElement': {
        boxSizing: 'border-box',
        minWidth: '26px',
        padding: '0 3px',
      },
      '.cm-sql-run-spacer': {
        display: 'block',
        width: '20px',
        height: '20px',
      },
      '.cm-sql-run-button': {
        display: 'inline-flex',
        width: '20px',
        height: '20px',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0',
        padding: '0',
        border: '0',
        borderRadius: '4px',
        background: 'transparent',
        color: 'rgba(22,24,35,0.58)',
        cursor: 'pointer',
      },
      '.cm-sql-run-button:hover': {
        backgroundColor: 'var(--yak-brand-color-soft)',
        color: 'var(--yak-brand-color)',
      },
      '.cm-sql-run-button:focus-visible': {
        outline: '2px solid var(--yak-brand-color-border)',
        outlineOffset: '1px',
      },
      '.cm-sql-statement-line': {
        boxShadow: 'inset 2px 0 0 var(--yak-brand-color)',
        backgroundColor: 'var(--yak-brand-color-soft)',
      },
      '.cm-sql-statement-line.cm-activeLine': {
        backgroundColor: 'var(--yak-brand-color-soft-hover)',
      },
    }),
  ];
};
