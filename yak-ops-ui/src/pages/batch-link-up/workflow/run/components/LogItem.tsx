import type {LogEntry} from "../types";

export const LogItem = ({entry}: { entry: LogEntry }) => {
  return (
    <div
      style={{
        padding: "4px 8px",
        marginBottom: "4px",
        lineHeight: "14px",
        background:
          entry.type === "metric" ? "rgb(15, 23, 42)" : "transparent",
        borderLeft: `2px solid ${
          entry.type === "metric" ? "#1890ff" : "#00ff88"
        }`,
        display: "flex",
        gap: "8px",
      }}
    >
      <span style={{color: "white", minWidth: "70px"}}>
        [{entry.timestamp}]
      </span>
      <span
        style={{
          color: entry.type === "metric" ? "#4ec9b0" : "#00ff88",
        }}
      >
        {entry.content}
      </span>
    </div>
  );
};
