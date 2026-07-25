import {Select} from "antd";
import React, {useMemo, useState} from "react";

import type {ThemeOption} from "../types";
import ThemeColorBar from "./ThemeColorBar";

interface ThemeSelectProps {
  value: string;
  options: ThemeOption[];
  onChange: (value: string) => void;
}

const ThemeSelect: React.FC<ThemeSelectProps> = ({
                                                   value,
                                                   options,
                                                   onChange,
                                                 }) => {
  const [open, setOpen] = useState(false);

  const selectedTheme = useMemo(() => {
    return options.find((item) => item.value === value) || options[0];
  }, [options, value]);

  return (
    <Select
      value={value}
      open={open}
      onOpenChange={setOpen}
      className="w-full create-theme-select"
      popupClassName="create-theme-dropdown"
      suffixIcon={<span className="text-slate-400">⌄</span>}
      options={options.map((item) => ({
        value: item.value,
        label: <ThemeColorBar colors={item.colors} compact/>,
      }))}
      onChange={(nextValue) => {
        onChange(nextValue);
        setOpen(false);
      }}
      labelRender={() => <ThemeColorBar colors={selectedTheme.colors} compact/>}
      popupRender={() => (
        <div className="rounded-xl bg-white p-3">
          <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
            {options.map((item) => {
              const active = item.value === value;

              return (
                <button
                  key={item.value}
                  type="button"
                  title={item.label}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center rounded-lg px-3 py-2 transition",
                    active ? "bg-[hsl(231_48%_96%)]" : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  <ThemeColorBar colors={item.colors}/>
                </button>
              );
            })}
          </div>
        </div>
      )}
    />
  );
};

export default ThemeSelect;
