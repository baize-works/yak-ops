import type {MetricsData} from "../types";

export const MetricsSummary = ({data}: { data: MetricsData }) => {
  const metricsMap = data?.metrics || {};
  const entries = Object.entries(metricsMap);

  return (
    <div
      style={{
        marginBottom: "10px",
        padding: "10px 12px",
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              color: "#475569",
              fontWeight: 500,
            }}
          >
            实例ID：
            <span style={{color: "#0f172a", fontWeight: 600}}>
              {data.instanceId}
            </span>
          </span>

          <span style={{color: "#cbd5e1"}}>|</span>

          <span
            style={{
              fontSize: "12px",
              color: "#475569",
              fontWeight: 500,
            }}
          >
            引擎ID：
            <span style={{color: "#0f172a", fontWeight: 600}}>
              {data.engineId}
            </span>
          </span>
        </div>

        <span
          style={{
            padding: "2px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 600,
            background: "#ecfdf3",
            color: "#16a34a",
            border: "1px solid #bbf7d0",
          }}
        >
          RUNNING
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "8px",
          marginTop: "10px",
        }}
      >
        {entries.map(([key, v]) => {
          const status = (v as any)?.status ?? "RUNNING";
          const isRunning = status === "RUNNING";

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{minWidth: 0}}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0f172a",
                    marginBottom: "6px",
                  }}
                >
                  Pipeline {key}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  <span>
                    读{" "}
                    <span style={{color: "#0f172a", fontWeight: 600}}>
                      {v.readRowCount ?? 0}
                    </span>
                  </span>
                  <span>
                    写{" "}
                    <span style={{color: "#0f172a", fontWeight: 600}}>
                      {v.writeRowCount ?? 0}
                    </span>
                  </span>
                  <span>
                    QPS{" "}
                    <span style={{color: "#2563eb", fontWeight: 600}}>
                      {v.readQps ?? 0}
                    </span>
                    <span style={{color: "#cbd5e1", margin: "0 4px"}}>/</span>
                    <span style={{color: "#7c3aed", fontWeight: 600}}>
                      {v.writeQps ?? 0}
                    </span>
                  </span>
                </div>
              </div>

              <span
                style={{
                  flexShrink: 0,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: 600,
                  background: isRunning ? "#ecfdf3" : "#fef2f2",
                  color: isRunning ? "#16a34a" : "#dc2626",
                  border: `1px solid ${isRunning ? "#bbf7d0" : "#fecaca"}`,
                }}
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
