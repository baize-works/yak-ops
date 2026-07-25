import {Spin, Transfer, type TransferProps} from "antd";
import React from "react";
import {TableItem} from "../types";
import {Table2} from "lucide-react";

interface Props {
  loading: boolean;
  data: TableItem[];
  targetKeys: string[];
  matchMode: string;
  onChange: (keys: string[]) => void;
}

const TableTransferPanel: React.FC<Props> = ({
                                               loading,
                                               data,
                                               targetKeys,
                                               matchMode,
                                               onChange,
                                             }) => {
  const renderFooter: TransferProps["footer"] = (_, info) => {
    const totalTables = data.length;
    const selectedTables = targetKeys.length;

    if (info?.direction === "left") {
      return (
        <div className="px-3 py-2 text-xs text-slate-500">
          共 {totalTables} 张表
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <span className="text-slate-500">已选 {selectedTables} 张表</span>
        <span className="text-rose-500">最多支持 100 张表</span>
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-800">选择同步表</div>
        <div className="text-xs text-slate-400">
          {matchMode === "4" ? "整库模式下自动全选" : "支持手动筛选与勾选"}
        </div>
      </div>

      <Spin spinning={loading}>
        <div className="st-transfer-wrap">
          <Transfer
            dataSource={data}
            listStyle={{width: "100%", height: 420}}
            operations={["", ""]}
            targetKeys={targetKeys}
            onChange={(nextKeys) => {
              if (matchMode === "4") return;
              onChange(nextKeys as string[]);
            }}
            render={(item) => (
              <div className="flex min-w-0 items-center gap-2 py-0.5">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <Table2 className="h-3.5 w-3.5"/>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-700">
                    {item.key}
                  </div>
                  {item.title ? (
                    <div className="truncate text-xs text-slate-400">
                      {item.title}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            footer={renderFooter}
            showSearch
            filterOption={(inputValue, item) =>
              item.rawTitle.toLowerCase().includes(inputValue.toLowerCase())
            }
            titles={["源表列表", "已选表"]}
            locale={{
              itemUnit: "项",
              itemsUnit: "项",
              searchPlaceholder: "搜索表名",
              notFoundContent: "暂无数据",
            }}
          />
        </div>
      </Spin>
    </div>
  );
};

export default TableTransferPanel;
