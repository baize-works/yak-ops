import {LogItem} from "./LogItem";
import type {LogEntry} from "../types";

interface Props {
  logs: LogEntry[];
  containerRef: any;
}

export const LogList = ({logs, containerRef}: Props) => {
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "auto",
        background: "#1e1e1e",
        padding: "8px",
        borderRadius: "4px",
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#d4d4d4",
      }}
    >
      {logs.length === 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "#888",
          }}
        >
          No logs yet, waiting for connection...
        </div>
      ) : (
        logs.map((entry) => <LogItem key={entry.id} entry={entry}/>)
      )}
    </div>
  );
};
