import {Database, GitCompareArrows, MoveRight, Table2} from "lucide-react";
import React, {useMemo} from "react";
import TableColumnsPopover from "../components/TableColumnsPopover";

interface TableTabProps {
  instanceItem: any;
}

interface TableItem {
  sourceId?: string;
  table: string;
}

const parseTableList = (tableValue?: string): TableItem[] => {
  if (!tableValue) return [];

  const value = tableValue.trim();

  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.map((table) => ({
        table: String(table),
      }));
    }

    if (typeof parsed === "object" && parsed !== null) {
      const result: TableItem[] = [];

      Object.entries(parsed).forEach(([sourceId, tables]) => {
        if (Array.isArray(tables)) {
          tables.forEach((table) => {
            result.push({
              sourceId,
              table: String(table),
            });
          });
        }
      });

      return result;
    }

    return [
      {
        table: String(parsed),
      },
    ];
  } catch {
    return [
      {
        table: value,
      },
    ];
  }
};

const EmptyTableState: React.FC<{ text: string }> = ({text}) => {
  return (
    <div
      className="flex h-[92px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-400">
      {text}
    </div>
  );
};

const TableNode: React.FC<{
  item: TableItem;
  type: "source" | "sink";
  instanceItem: any;
}> = ({item, type, instanceItem}) => {
  const isSource = type === "source";
  const datasourceId =
    item.sourceId ||
    (isSource
      ? instanceItem?.sourceDatasourceId
      : instanceItem?.sinkDatasourceId);
  return (
    <TableColumnsPopover sourceId={datasourceId} table={item.table} type={type}>
      <button
        type="button"
        className={[
          "group flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left",
          "bg-white transition-all duration-200 ease-out",
          "hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]",
          isSource
            ? "border-transparent bg-blue-50 hover:bg-blue-100"
            : "border-transparent bg-emerald-50 hover:bg-emerald-100",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            isSource
              ? "border-blue-100 bg-blue-50 text-blue-600"
              : "border-emerald-100 bg-emerald-50 text-emerald-600",
          ].join(" ")}
        >
          <Table2 size={15} strokeWidth={1.9}/>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">
            {item.table}
          </span>
          <span className="mt-0.5 block text-[11px] text-slate-400">
            {isSource ? "来源表" : "目标表"}
          </span>
        </span>
      </button>
    </TableColumnsPopover>
  );
};

const TableGroup: React.FC<{
  title: string;
  typeLabel: string;
  dbType?: string;
  items: TableItem[];
  emptyText: string;
  type: "source" | "sink";
  instanceItem: any;
}> = ({title, typeLabel, dbType, items, emptyText, type, instanceItem}) => {
  const isSource = type === "source";

  return (
    <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              isSource
                ? "border-blue-100 bg-blue-50 text-blue-600"
                : "border-emerald-100 bg-emerald-50 text-emerald-600",
            ].join(" ")}
          >
            <Database size={16} strokeWidth={1.9}/>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-0.5 text-xs text-slate-400">{typeLabel}</div>
          </div>
        </div>

        <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          {dbType || "-"}
        </div>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <TableNode
              key={`${type}-${item.sourceId || "single"}-${
                item.table
              }-${index}`}
              item={item}
              type={type}
              instanceItem={instanceItem}
            />
          ))
        ) : (
          <EmptyTableState text={emptyText}/>
        )}
      </div>
    </div>
  );
};

const TableTab: React.FC<TableTabProps> = ({instanceItem}) => {
  const sourceTableList = useMemo(
    () => parseTableList(instanceItem?.sourceTable),
    [instanceItem?.sourceTable]
  );

  const sinkTableList = useMemo(
    () => parseTableList(instanceItem?.sinkTable),
    [instanceItem?.sinkTable]
  );

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
            <GitCompareArrows size={16} strokeWidth={1.9}/>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">
              表映射关系
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              查看当前运行实例的来源表与目标表关系
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)]">
        <TableGroup
          type="source"
          title="来源端"
          typeLabel="读取数据"
          dbType={instanceItem?.sourceType}
          items={sourceTableList}
          emptyText="暂无来源表"
          instanceItem={instanceItem}
        />

        <div className="hidden h-full items-center justify-center xl:flex">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
            <MoveRight size={18} strokeWidth={1.8}/>
          </div>
        </div>

        <TableGroup
          type="sink"
          title="目标端"
          typeLabel="写入数据"
          dbType={instanceItem?.sinkType}
          items={sinkTableList}
          emptyText="暂无目标表"
          instanceItem={instanceItem}
        />
      </div>
    </div>
  );
};

export default TableTab;
