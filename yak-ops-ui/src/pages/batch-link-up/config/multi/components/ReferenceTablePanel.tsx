import React from "react";
import {Spin, Table} from "antd";
import {TableItem} from "../types";


interface Props {
  loading: boolean;
  data: TableItem[];
}

const ReferenceTablePanel: React.FC<Props> = ({loading, data}) => {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4" style={{marginTop: 16}}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-800">匹配结果预览</div>
        <div className="text-xs text-slate-400">当前共 {data.length} 张表</div>
      </div>

      <Spin spinning={loading}>
        <Table
          rowKey="key"
          dataSource={data}
          loading={loading}
          bordered={false}
          pagination={false}
          scroll={{y: 360}}
          size="middle"
          columns={[
            {
              title: "表名",
              dataIndex: "title",
              key: "title",
              ellipsis: true,
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default ReferenceTablePanel;
