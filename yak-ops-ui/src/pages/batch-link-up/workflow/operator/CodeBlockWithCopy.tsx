import {
  CheckCircleOutlined,
  CloseOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import { defaultKeymap } from "@codemirror/commands";
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import React, { useEffect, useRef, useState } from "react";

interface CodeBlockWithCopyProps {
  content?: string;
  height?: number;
  title?: string;
  onClose?: () => void;
}

type HoconState = {
  inBlockComment: boolean;
};

const hoconLanguage = StreamLanguage.define<HoconState>({
  startState() {
    return { inBlockComment: false };
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

    if (stream.match(/\b\d+(\.\d+)?\b/)) {
      return "number";
    }

    if (stream.match(/\b(env|job|source|sink|transform|include)\b/)) {
      return "keyword";
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
    color: "#2563eb",
    fontWeight: "600",
  },
  {
    tag: tags.comment,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  {
    tag: tags.string,
    color: "#0f766e",
  },
  {
    tag: tags.number,
    color: "#d97706",
    fontWeight: "500",
  },
  {
    tag: tags.bool,
    color: "#7c3aed",
    fontWeight: "600",
  },
  {
    tag: tags.propertyName,
    color: "#334155",
    fontWeight: "500",
  },
  {
    tag: tags.typeName,
    color: "#4f46e5",
    fontWeight: "600",
  },
  {
    tag: tags.variableName,
    color: "#475569",
  },
  {
    tag: [tags.brace, tags.squareBracket],
    color: "#0284c7",
    fontWeight: "600",
  },
  {
    tag: tags.operator,
    color: "#94a3b8",
  },
]);

const createPreviewTheme = (height: number) =>
  EditorView.theme({
    "&": {
      height: `calc(${height}px - 58px)`,
      fontSize: "13px",
      backgroundColor: "#FCFDFE",
      color: "#334155",
      outline: "none !important",
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
      padding: "14px 0 16px 0",
      caretColor: "transparent",
      outline: "none !important",
    },

    ".cm-line": {
      padding: "0 20px 0 14px",
    },

    ".cm-gutters": {
      backgroundColor: "#F8FAFC",
      color: "#94A3B8",
      borderRight: "1px solid rgba(226, 232, 240, 0.9)",
      padding: "14px 0 16px 0",
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
      backgroundColor: "rgba(59, 130, 246, 0.14) !important",
    },

    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(59, 130, 246, 0.14) !important",
    },

    ".cm-cursor": {
      display: "none",
    },
  });

const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({
  content = "",
  height = 460,
  title = "HOCON Preview",
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (viewRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        keymap.of(defaultKeymap),
        hoconLanguage,
        syntaxHighlighting(hoconHighlightStyle),
        lineNumbers(),
        createPreviewTheme(height),
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
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

    if (content !== current) {
      view.dispatch({
        changes: {
          from: 0,
          to: current.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return (
    <div
      className="overflow-hidden rounded-[18px] border border-slate-200 bg-[#FCFDFE] shadow-sm"
      style={{ height }}
    >
      <div className="flex h-[58px] items-center justify-between border-b border-slate-200 bg-[#FCFDFE] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <span> H</span>
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-800">
              {title}
            </div>
            {/* <div className="mt-0.5 text-[11px] text-slate-400">
              Generated LinkUp HOCON configuration
            </div> */}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
              copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
            ].join(" ")}
          >
            {copied ? <CheckCircleOutlined /> : <CopyOutlined />}
            <span>{copied ? "已复制" : "复制代码"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="关闭"
            >
              <CloseOutlined />
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} />
    </div>
  );
};

export default CodeBlockWithCopy;
