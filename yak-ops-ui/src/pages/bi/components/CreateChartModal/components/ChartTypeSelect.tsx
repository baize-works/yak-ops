import {Select} from "antd";
import React, {useMemo, useState} from "react";

import {chartRegistryList} from "../chartRegistry";
import type {ChartType} from "../types";

interface ChartTypeSelectProps {
  value: ChartType;
  onChange: (value: ChartType) => void;
}

const ChartTypeSelect: React.FC<ChartTypeSelectProps> = ({value, onChange}) => {
  const [open, setOpen] = useState(false);

  const chartGroups = useMemo(() => {
    const groupMap = new Map<string, typeof chartRegistryList>();

    chartRegistryList.forEach((item) => {
      const groupItems = groupMap.get(item.group) || [];
      groupMap.set(item.group, [...groupItems, item]);
    });

    return Array.from(groupMap.entries()).map(([title, options]) => ({
      title,
      options,
    }));
  }, []);

  return (
    <Select
      value={value}
      open={open}
      onOpenChange={setOpen}
      className="w-full"
      popupClassName="create-chart-type-dropdown"
      onChange={(nextValue) => {
        onChange(nextValue);
        setOpen(false);
      }}
      options={chartRegistryList.map((item) => ({
        label: (
          <div className="flex items-center gap-2">
            {item.icon}
            <span>{item.label}</span>
          </div>
        ),
        value: item.value,
      }))}
      popupRender={() => (
        <div className="rounded-xl bg-white p-3">
          {chartGroups.map((group) => (
            <div key={group.title} className="mb-4 last:mb-0">
              <div className="mb-2 text-sm font-semibold text-slate-800">
                {group.title}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {group.options.map((item) => {
                  const active = item.value === value;

                  return (
                    <button
                      key={`${group.title}-${item.value}-${item.label}`}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      className={[
                        "flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs transition",
                        active
                          ? "border-[hsl(231_48%_48%)] bg-[hsl(231_48%_96%)] text-[hsl(231_48%_48%)] shadow-[0_0_0_1px_hsl(231_48%_48%_/_0.18)]"
                          : "border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
};

export default ChartTypeSelect;
