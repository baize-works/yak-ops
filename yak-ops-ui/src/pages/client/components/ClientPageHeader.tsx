import React from "react";
import {Button} from "antd";
import {CloudServerOutlined, PlusOutlined} from "@ant-design/icons";
import {BLUE} from "../constants";

interface Props {
  onAdd: () => void;
}

const ClientPageHeader: React.FC<Props> = ({onAdd}) => {
  return (
    <div className="mb-1 flex items-start justify-between gap-4">
      <div className="mb-4 flex items-center gap-4">
        <div
          className="flex items-center justify-center text-indigo-600"
          style={{
            backgroundColor: "#eef2ff",
            height: 44,
            width: 44,
            fontSize: 20,
            borderRadius: 14,
          }}
        >
          <CloudServerOutlined/>
        </div>

        <div>
          <h1
            className="m-0 font-bold tracking-tight text-slate-950"
            style={{fontSize: 18, lineHeight: "26px"}}
          >
            Client 管理
          </h1>
          <p className="mt-1 text-slate-500" style={{fontSize: 13}}>
            统一管理 LinkUp / Zeta Client，查看节点健康状态与核心资源指标，让任务提交与运行监控更清晰。
          </p>
        </div>
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined/>}
        size="large"
        onClick={onAdd}
        className="h-10 rounded-full px-5 shadow-[0_6px_16px_rgba(63,92,214,0.18)]"
        style={{background: BLUE, borderColor: BLUE}}
      >
        新建 Client
      </Button>
    </div>
  );
};

export default ClientPageHeader;
