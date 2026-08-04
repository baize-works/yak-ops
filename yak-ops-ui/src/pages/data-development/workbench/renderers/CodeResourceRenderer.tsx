import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  type ViewUpdate,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { commandRegistry } from '../core/registry';
import type { ResourceRendererProps } from '../core/types';
import { useWorkbenchStore } from '../store/workbench.store';
import {
  createSqlStatementExtensions,
  type SqlStatementRange,
} from './sql/sqlStatementExtension';

const CodeResourceRenderer = ({
  resource,
  document,
  plugin,
  onChange,
}: ResourceRendererProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  const documentRef = useRef(document);
  const resourceRef = useRef(resource);
  const pluginRef = useRef(plugin);

  const content = document.content.kind === 'text' ? document.content : undefined;

  useEffect(() => {
    onChangeRef.current = onChange;
    documentRef.current = document;
    resourceRef.current = resource;
    pluginRef.current = plugin;
  }, [document, onChange, plugin, resource]);

  useEffect(() => {
    if (!hostRef.current || !content) return undefined;

    const languageExtensions: Extension[] =
      content.language === 'sql' ? [sql()] : [];

    const runSqlStatement = (statement: SqlStatementRange) => {
      const currentDocument = documentRef.current;
      const currentResource = resourceRef.current;
      const currentPlugin = pluginRef.current;

      if (currentDocument.content.kind !== 'text') return;

      const statementDocument = {
        ...currentDocument,
        content: {
          ...currentDocument.content,
          value: statement.sql,
        },
      };
      const executionStatus =
        useWorkbenchStore.getState().executionStatusByResourceId[
          currentResource.id
        ] ?? 'IDLE';

      void commandRegistry.execute('sql.run-statement', {
        resource: currentResource,
        document: statementDocument,
        plugin: currentPlugin,
        executionStatus,
      });
    };

    const sqlStatementExtensions: Extension[] =
      content.language === 'sql'
        ? createSqlStatementExtensions(runSqlStatement)
        : [];

    const state = EditorState.create({
      doc: content.value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        EditorState.tabSize.of(2),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        ...languageExtensions,
        ...sqlStatementExtensions,
        highlightActiveLine(),
        EditorView.contentAttributes.of({ 'aria-label': '代码编辑器' }),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (!update.docChanged) return;
          const currentDocument = documentRef.current;
          if (currentDocument.content.kind !== 'text') return;

          onChangeRef.current({
            ...currentDocument,
            content: {
              ...currentDocument.content,
              value: update.state.doc.toString(),
            },
            dirty: true,
          });
        }),
        EditorView.theme({
          '&': {
            height: '100%',
            backgroundColor: '#ffffff',
            color: '#25272d',
            fontSize: '13px',
          },
          '&.cm-focused': { outline: 'none' },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily:
              'JetBrains Mono, SFMono-Regular, Consolas, Liberation Mono, monospace',
            lineHeight: '1.72',
          },
          '.cm-content': { padding: '10px 0 48px' },
          '.cm-line': { padding: '0 20px' },
          '.cm-gutters': {
            backgroundColor: '#fbfbfc',
            color: '#a1a5ad',
            border: 'none',
            borderRight: '1px solid #f0f1f3',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(22,24,35,0.028)',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(22,24,35,0.04)',
            color: '#4a4d55',
          },
          '.cm-cursor': {
            borderLeftColor: 'var(--yak-brand-color)',
          },
          '.cm-selectionBackground, ::selection': {
            backgroundColor:
              'var(--yak-brand-color-soft-hover) !important',
          },
          '.cm-foldPlaceholder': {
            backgroundColor: '#f2f3f5',
            border: 'none',
            color: '#62656d',
          },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = undefined;
    };
  }, [content?.language, document.resourceId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !content) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === content.value) return;

    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: content.value,
      },
    });
  }, [content?.value]);

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[rgba(22,24,35,0.48)]">
        当前资源不是文本内容，无法使用代码编辑器打开。
      </div>
    );
  }

  return <div ref={hostRef} className="h-full min-h-0" />;
};

export default CodeResourceRenderer;
