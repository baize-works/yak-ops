import {defaultKeymap, history, historyKeymap} from "@codemirror/commands";
import {HighlightStyle, StreamLanguage, syntaxHighlighting,} from "@codemirror/language";
import {EditorState, Text} from "@codemirror/state";
import {EditorView, keymap, lineNumbers} from "@codemirror/view";
import {tags} from "@lezer/highlight";
import {useEffect, useRef, useState} from "react";

import DatabaseIcons from "@/pages/data-source/icon/DatabaseIcons";
import {fetchDataSourceOptions} from "@/pages/data-source/service";

interface Props {
  value: string;
  onChange: (value: string) => void;

  /**
   * source 域要查询的数据源类型
   * 例如：MYSQL / MYSQL_CDC / POSTGRESQL / ORACLE
   */
  sourceDbType?: string;

  /**
   * sink 域要查询的数据源类型
   * 例如：MYSQL / POSTGRESQL / ORACLE
   */
  sinkDbType?: string;
}

type DatasourceOption = {
  id: string | number;
  name: string;
  dbType?: string;
  description?: string;
};

type HoconState = {
  inBlockComment: boolean;
};

type HoconArea = "source" | "sink";

type HoconBlockInfo = {
  area?: HoconArea;
  pluginName?: string;
};

type AtRange = {
  from: number;
  to: number;
  text: string;
};

type DropdownState = {
  visible: boolean;
  loading: boolean;
  left: number;
  top: number;
  from: number;
  to: number;
  keyword: string;
  area?: HoconArea;
  dbType?: string;
  options: DatasourceOption[];
  message?: string;
};

const DEFAULT_DROPDOWN_STATE: DropdownState = {
  visible: false,
  loading: false,
  left: 0,
  top: 0,
  from: 0,
  to: 0,
  keyword: "",
  options: [],
};

const DEFAULT_TEMPLATE = `env {
  jobMode = "BATCH"
  parallelism = 1
}

source {
  Jdbc {
    datasourceId = @
  }
}

sink {
  Jdbc {
    datasourceId = @
  }
}
`;

function normalizeDatasourceOptions(data: any): DatasourceOption[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.records)
      ? data.records
      : Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.items)
          ? data.items
          : [];

  return list
    .map((item: any) => {
      const id =
        item?.id ?? item?.datasourceId ?? item?.dataSourceId ?? item?.value;

      const name =
        item?.name ??
        item?.datasourceName ??
        item?.dataSourceName ??
        item?.label ??
        item?.datasource_name ??
        `Datasource-${id}`;

      const dbType =
        item?.dbType ??
        item?.type ??
        item?.datasourceType ??
        item?.dataSourceType;

      const description =
        item?.description ??
        item?.url ??
        item?.jdbcUrl ??
        item?.jdbc_url ??
        item?.remark;

      return {
        id,
        name,
        dbType,
        description,
      };
    })
    .filter((item) => item.id !== undefined && item.id !== null);
}

/**
 * 获取当前光标前面的 @xxx。
 *
 * 例如：
 * datasourceId = @
 * datasourceId = @mysql
 */
function getAtRange(doc: Text, pos: number): AtRange | null {
  const line = doc.lineAt(pos);
  const lineTextBeforeCursor = doc.sliceString(line.from, pos);
  const match = lineTextBeforeCursor.match(/@[\w.-]*$/);

  if (!match) {
    return null;
  }

  const text = match[0];

  return {
    from: pos - text.length,
    to: pos,
    text,
  };
}

/**
 * 判断当前光标属于 source 还是 sink。
 *
 * 支持：
 *
 * source {
 *   Jdbc {
 *     datasourceId = @
 *   }
 * }
 */
function getCurrentHoconBlockInfo(doc: Text, pos: number): HoconBlockInfo {
  const text = doc.sliceString(0, pos);

  const stack: string[] = [];
  let lastIdentifier = "";

  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === "\\") {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inString = false;
      }

      continue;
    }

    if (ch === "#") {
      inLineComment = true;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;

      while (j < text.length && /[\w.-]/.test(text[j])) {
        j += 1;
      }

      lastIdentifier = text.slice(i, j);
      i = j - 1;
      continue;
    }

    if (ch === "{") {
      stack.push(lastIdentifier);
      lastIdentifier = "";
      continue;
    }

    if (ch === "}") {
      stack.pop();
      lastIdentifier = "";
    }
  }

  const lowerStack = stack.map((item) => item.toLowerCase());

  const sourceIndex = lowerStack.lastIndexOf("source");
  const sinkIndex = lowerStack.lastIndexOf("sink");

  if (sourceIndex === -1 && sinkIndex === -1) {
    return {};
  }

  const area: HoconArea = sourceIndex > sinkIndex ? "source" : "sink";
  const areaIndex = area === "source" ? sourceIndex : sinkIndex;

  return {
    area,
    pluginName: stack[areaIndex + 1],
  };
}

function filterDatasourceOptions(
  options: DatasourceOption[],
  keyword: string
): DatasourceOption[] {
  if (!keyword) {
    return options;
  }

  const lowerKeyword = keyword.toLowerCase();

  return options.filter((item) => {
    return (
      String(item.id).toLowerCase().includes(lowerKeyword) ||
      item.name.toLowerCase().includes(lowerKeyword) ||
      item.dbType?.toLowerCase().includes(lowerKeyword)
    );
  });
}

const hoconLanguage = StreamLanguage.define<HoconState>({
  startState() {
    return {inBlockComment: false};
  },

  token(stream, state) {
    if (state.inBlockComment) {
      while (!stream.eol()) {
        const ch = stream.next();

        if (ch === "*" && stream.peek() === "/") {
          stream.next();
          state.inBlockComment = false;
          break;
        }
      }

      return "comment";
    }

    if (stream.eatSpace()) return null;

    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match("//")) {
      stream.skipToEnd();
      return "comment";
    }

    if (stream.match("/*")) {
      state.inBlockComment = true;
      return "comment";
    }

    if (
      stream.match("{") ||
      stream.match("}") ||
      stream.match("[") ||
      stream.match("]")
    ) {
      return "brace";
    }

    if (stream.match("=") || stream.match(":") || stream.match(",")) {
      return "operator";
    }

    if (stream.match(/"(?:[^"\\]|\\.)*"?/)) {
      return "string";
    }

    if (stream.match(/\b(true|false|null)\b/)) {
      return "bool";
    }

    if (stream.match(/\b\d+(\.\d)?\b/)) {
      return "number";
    }

    if (stream.match(/\b(env|job|source|sink|transform|include)\b/)) {
      return "keyword";
    }

    if (stream.match(/@[\w.-]*/)) {
      return "variableName";
    }

    if (stream.match(/[A-Za-z_][\w.-]*/)) {
      const cur = stream.current();
      const rest = stream.string.slice(stream.pos);

      if (/^\s*[=:]/.test(rest)) {
        return "propertyName";
      }

      if (/^[A-Z][\w-]*/.test(cur)) {
        return "typeName";
      }

      return "variableName";
    }

    stream.next();
    return null;
  },
});

const hoconHighlightStyle = HighlightStyle.define([
  {
    tag: tags.keyword,
    color: "#0284c7",
    fontWeight: "600",
  },
  {
    tag: tags.comment,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  {
    tag: tags.string,
    color: "#d97706",
  },
  {
    tag: tags.number,
    color: "#7c3aed",
  },
  {
    tag: tags.bool,
    color: "#e11d48",
    fontWeight: "600",
  },
  {
    tag: tags.propertyName,
    color: "#0f766e",
  },
  {
    tag: tags.typeName,
    color: "#334155",
    fontWeight: "600",
  },
  {
    tag: tags.variableName,
    color: "#2563eb",
    fontWeight: "600",
  },
  {
    tag: [tags.brace, tags.squareBracket],
    color: "#64748b",
  },
  {
    tag: tags.operator,
    color: "#94a3b8",
  },
]);

const editorTheme = EditorView.theme({
  "&": {
    height: "calc(100vh - 220px)",
    minHeight: "42vh",
    fontSize: "13px",
    backgroundColor: "#FCFDFE",
    outline: "none !important",
    borderRadius: "14px",
    overflow: "hidden",
  },

  "&.cm-focused": {
    outline: "none !important",
  },

  ".cm-scroller": {
    overflow: "auto",
    fontFamily:
      'JetBrains Mono, Fira Code, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    lineHeight: "28px",
    outline: "none !important",
  },

  ".cm-content": {
    padding: "8px 0",
    caretColor: "#0f172a",
    outline: "none !important",
  },

  ".cm-line": {
    padding: "0 16px",
  },

  ".cm-gutters": {
    backgroundColor: "#F8FAFC",
    color: "#94A3B8",
    borderRight: "1px solid rgba(226, 232, 240, 0.9)",
    padding: "8px 0",
  },

  ".cm-lineNumbers": {
    minWidth: "44px",
  },

  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 14px",
    fontSize: "12px",
    lineHeight: "28px",
  },

  ".cm-activeLine": {
    backgroundColor: "rgba(241, 245, 249, 0.72)",
  },

  ".cm-activeLineGutter": {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
  },

  ".cm-selectionBackground": {
    backgroundColor: "rgba(59, 130, 246, 0.16) !important",
  },

  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "rgba(59, 130, 246, 0.16) !important",
  },

  ".cm-cursor": {
    borderLeftColor: "#0f172a",
  },
});

export default function HoconEditorPanel({
                                           value,
                                           onChange,
                                           sourceDbType,
                                           sinkDbType,
                                         }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorBoxRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const onChangeRef = useRef(onChange);
  const sourceDbTypeRef = useRef<string | undefined>(sourceDbType);
  const sinkDbTypeRef = useRef<string | undefined>(sinkDbType);
  const datasourceCacheRef = useRef<Map<string, DatasourceOption[]>>(new Map());
  const dropdownStateRef = useRef<DropdownState>(DEFAULT_DROPDOWN_STATE);
  const requestSeqRef = useRef(0);

  const [dropdownState, setDropdownState] = useState<DropdownState>(
    DEFAULT_DROPDOWN_STATE
  );

  const updateDropdownState = (nextState: DropdownState) => {
    dropdownStateRef.current = nextState;
    setDropdownState(nextState);
  };

  const hideDropdown = () => {
    updateDropdownState({
      ...dropdownStateRef.current,
      visible: false,
      loading: false,
      options: [],
      message: undefined,
    });
  };

  const openDatasourceDropdown = async (view: EditorView, atRange: AtRange) => {
    const editorBox = editorBoxRef.current;
    const cursorCoords = view.coordsAtPos(atRange.to);

    if (!editorBox || !cursorCoords) {
      hideDropdown();
      return;
    }

    const editorBoxRect = editorBox.getBoundingClientRect();

    const left = cursorCoords.left - editorBoxRect.left;
    const top = cursorCoords.bottom - editorBoxRect.top + 6;

    const blockInfo = getCurrentHoconBlockInfo(view.state.doc, atRange.to);
    const keyword = atRange.text.slice(1);

    if (!blockInfo.area) {
      updateDropdownState({
        visible: true,
        loading: false,
        left,
        top,
        from: atRange.from,
        to: atRange.to,
        keyword,
        options: [],
        message: "请在 source 或 sink 域内使用 @",
      });
      return;
    }

    const dbType =
      blockInfo.area === "source"
        ? sourceDbTypeRef.current
        : sinkDbTypeRef.current;

    if (!dbType) {
      updateDropdownState({
        visible: true,
        loading: false,
        left,
        top,
        from: atRange.from,
        to: atRange.to,
        keyword,
        area: blockInfo.area,
        options: [],
        message:
          blockInfo.area === "source"
            ? "未选择 source 数据源类型"
            : "未选择 sink 数据源类型",
      });
      return;
    }

    const cacheKey = `${blockInfo.area}:${dbType}`;
    const cachedOptions = datasourceCacheRef.current.get(cacheKey);

    if (cachedOptions) {
      const filteredOptions = filterDatasourceOptions(cachedOptions, keyword);

      updateDropdownState({
        visible: true,
        loading: false,
        left,
        top,
        from: atRange.from,
        to: atRange.to,
        keyword,
        area: blockInfo.area,
        dbType,
        options: filteredOptions,
        message: filteredOptions.length
          ? undefined
          : `没有找到 ${dbType} 数据源`,
      });

      return;
    }

    const currentRequestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = currentRequestSeq;

    updateDropdownState({
      visible: true,
      loading: true,
      left,
      top,
      from: atRange.from,
      to: atRange.to,
      keyword,
      area: blockInfo.area,
      dbType,
      options: [],
      message: undefined,
    });

    try {
      const response = await fetchDataSourceOptions(dbType);

      if (requestSeqRef.current !== currentRequestSeq) {
        return;
      }

      const datasourceOptions = normalizeDatasourceOptions(response?.data);
      datasourceCacheRef.current.set(cacheKey, datasourceOptions);

      const latestState = dropdownStateRef.current;
      const latestKeyword = latestState.keyword;
      const filteredOptions = filterDatasourceOptions(
        datasourceOptions,
        latestKeyword
      );

      updateDropdownState({
        ...latestState,
        visible: true,
        loading: false,
        options: filteredOptions,
        message: filteredOptions.length
          ? undefined
          : `没有找到 ${dbType} 数据源`,
      });
    } catch (error) {
      if (requestSeqRef.current !== currentRequestSeq) {
        return;
      }

      updateDropdownState({
        ...dropdownStateRef.current,
        visible: true,
        loading: false,
        options: [],
        message: "数据源加载失败，请稍后重试",
      });
    }
  };

  const insertDatasourceId = (option: DatasourceOption) => {
    const view = viewRef.current;
    const currentDropdownState = dropdownStateRef.current;

    if (!view || !currentDropdownState.visible) {
      return;
    }

    const insertText = String(option.id);

    view.dispatch({
      changes: {
        from: currentDropdownState.from,
        to: currentDropdownState.to,
        insert: insertText,
      },
      selection: {
        anchor: currentDropdownState.from + insertText.length,
      },
    });

    view.focus();
    hideDropdown();
  };

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    sourceDbTypeRef.current = sourceDbType;
    sinkDbTypeRef.current = sinkDbType;
  }, [sourceDbType, sinkDbType]);

  useEffect(() => {
    datasourceCacheRef.current.clear();
  }, [sourceDbType, sinkDbType]);

  useEffect(() => {
    if (!value?.trim()) {
      onChangeRef.current(DEFAULT_TEMPLATE);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (viewRef.current) return;

    const startDoc = value?.trim() ? value : DEFAULT_TEMPLATE;

    const state = EditorState.create({
      doc: startDoc,
      extensions: [
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        hoconLanguage,
        syntaxHighlighting(hoconHighlightStyle),
        lineNumbers(),
        editorTheme,
        EditorView.lineWrapping,

        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const nextValue = update.state.doc.toString();
            onChangeRef.current(nextValue);
          }

          if (!update.docChanged && !update.selectionSet) {
            return;
          }

          const head = update.state.selection.main.head;
          const atRange = getAtRange(update.state.doc, head);

          if (!atRange) {
            if (dropdownStateRef.current.visible) {
              hideDropdown();
            }
            return;
          }

          openDatasourceDropdown(update.view, atRange);
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) return;

    const current = view.state.doc.toString();

    if (typeof value === "string" && value !== current) {
      view.dispatch({
        changes: {
          from: 0,
          to: current.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <div
          ref={editorBoxRef}
          className="relative h-full rounded-[18px] border border-slate-200 bg-[#FCFDFE] p-[1px] transition-all duration-200 focus-within:border-blue-200"
        >
          <div className="h-full overflow-hidden rounded-[14px]">
            <div ref={containerRef} className="h-full"/>
          </div>

          {dropdownState.visible && (
            <div
              className="absolute z-[9999] w-[320px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]"
              style={{
                left: dropdownState.left,
                top: dropdownState.top,
              }}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-slate-700">
                    {dropdownState.area === "source"
                      ? "选择 Source 数据源"
                      : dropdownState.area === "sink"
                        ? "选择 Sink 数据源"
                        : "选择数据源"}
                  </div>

                  {dropdownState.dbType ? (
                    <span
                      className="rounded-md border border-blue-100 bg-blue-50 px-2 py-[2px] text-[11px] font-medium text-blue-600">
            {dropdownState.dbType}
          </span>
                  ) : null}
                </div>

                <div className="mt-1 text-[12px] leading-5 text-slate-400">
                  选择后会自动填充 datasourceId
                </div>
              </div>

              {dropdownState.loading ? (
                <div className="px-3.5 py-4 text-[13px] text-slate-400">
                  正在加载数据源...
                </div>
              ) : dropdownState.message ? (
                <div className="px-3.5 py-4 text-[13px] text-slate-400">
                  {dropdownState.message}
                </div>
              ) : (
                <div className="max-h-[260px] overflow-auto py-1.5">
                  {dropdownState.options.map((item) => (
                    <button
                      key={`${item.id}-${item.name}`}
                      type="button"
                      className="group flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50"
                      onClick={() => insertDatasourceId(item)}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-white text-slate-500 shadow-sm">
                        <DatabaseIcons dbType={item.dbType}/>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium text-slate-700 group-hover:text-blue-600">
                  {item.name}
                </span>

                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-[1px] text-[11px] text-slate-500">
                  ID: {item.id}
                </span>
                        </div>

                        <div className="mt-[2px] truncate text-[12px] text-slate-400">
                          {item.description || item.dbType || "Datasource"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
