import {Card} from "antd";
import {TerminalSquare} from "lucide-react";
import React from "react";

interface LogTabProps {
  content: string;
  loading: boolean;
}

const LogTab: React.FC<LogTabProps> = ({content, loading}) => {
  return (
    <Card
      size="small"
      loading={loading}
      className="mt-2 !rounded-2xl !border-slate-200 !shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      bodyStyle={{padding: 16, marginBottom: 116}}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          <TerminalSquare size={16} strokeWidth={1.9}/>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">运行日志</div>
          <div className="mt-0.5 text-xs text-slate-400">
            查看当前运行实例的执行日志
          </div>
        </div>
      </div>

      <pre className=" rounded-xl bg-[#1E1E1E] p-4 font-mono text-xs leading-5 text-[#00FF88]" style={{paddingTop: 12}}>
        {content || "No log available"}
      </pre>
    </Card>
  );
};

export default LogTab;
