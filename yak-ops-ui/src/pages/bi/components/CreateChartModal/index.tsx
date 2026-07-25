import {Input, Modal} from "antd";
import React, {useMemo, useState} from "react";

import {chartRegistryMap} from "./chartRegistry";
import {defaultChartConfigValues, defaultFieldOptions, previewData, themeOptions,} from "./constants";
import ChartPreview from "./components/ChartPreview";
import ChartSettingBlock from "./components/ChartSettingBlock";
import ChartTypeSelect from "./components/ChartTypeSelect";
import ThemeSelect from "./components/ThemeSelect";
import type {ChartConfigValues, ChartType, CreateChartValues, FieldOption,} from "./types";

interface CreateChartModalProps {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: CreateChartValues) => void;
  fieldOptions?: FieldOption[];
}

const CreateChartModal: React.FC<CreateChartModalProps> = ({
                                                             open,
                                                             onCancel,
                                                             onCreate,
                                                             fieldOptions = defaultFieldOptions,
                                                           }) => {
  const [name, setName] = useState("默认名");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [theme, setTheme] = useState("yellow");

  const [chartConfig, setChartConfig] = useState<ChartConfigValues>(
    defaultChartConfigValues
  );

  const selectedTheme = useMemo(() => {
    return themeOptions.find((item) => item.value === theme) || themeOptions[0];
  }, [theme]);

  const selectedChart = chartRegistryMap[chartType];
  const ConfigPanel = selectedChart.ConfigPanel;

  const updateChartConfig = (patch: Partial<ChartConfigValues>) => {
    setChartConfig((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const handleChartTypeChange = (nextChartType: ChartType) => {
    const nextChart = chartRegistryMap[nextChartType];

    setChartType(nextChartType);

    setChartConfig((prev) => ({
      ...prev,
      ...nextChart.defaultConfig,
    }));
  };

  const handleCreate = () => {
    onCreate({
      name: name?.trim() || "默认名",
      chartType,
      theme,
      ...chartConfig,
    });
  };

  return (
    <Modal
      open={open}
      width="88vw"
      centered
      footer={null}
      closable
      destroyOnClose={false}
      onCancel={onCancel}
      className="create-chart-modal"
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      <div className="flex h-[88vh] min-h-[640px] overflow-hidden rounded-2xl bg-white">
        <section className="flex min-w-0 flex-1 flex-col p-6">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            variant="borderless"
            className="!w-[280px] !px-0 !text-base !font-semibold"
            placeholder="请输入图表名称"
          />

          <div className="flex flex-1 items-center justify-center rounded-2xl border border-slate-100 bg-white p-5">
            <ChartPreview
              chartType={chartType}
              chartConfig={chartConfig}
              themeColors={selectedTheme.colors}
              previewData={previewData}
            />
          </div>
        </section>

        <aside className="flex w-[360px] shrink-0 flex-col border-l border-slate-100 bg-white">
          <div className="flex h-12 shrink-0 items-center justify-center border-b border-slate-100">
            <div className="rounded-md bg-[hsl(231_48%_96%)] px-3 py-1 text-sm font-medium text-[hsl(231_48%_48%)]">
              数据配置
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
            <div className="space-y-5">
              <ChartSettingBlock title="图表类型">
                <ChartTypeSelect
                  value={chartType}
                  onChange={handleChartTypeChange}
                />
              </ChartSettingBlock>

              <ConfigPanel
                chartType={chartType}
                value={chartConfig}
                fieldOptions={fieldOptions}
                onChange={updateChartConfig}
              />

              <ChartSettingBlock title="主题颜色">
                <ThemeSelect
                  value={theme}
                  options={themeOptions}
                  onChange={setTheme}
                />
              </ChartSettingBlock>

              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                当前选择：
                <span className="font-medium text-slate-700">
                  {selectedChart?.label || "柱状图"}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 p-5">
            <button
              type="button"
              onClick={handleCreate}
              className="h-10 w-full rounded-lg bg-[hsl(231_48%_48%)] text-sm font-medium text-white transition hover:bg-[hsl(231_48%_42%)]"
            >
              保存
            </button>
          </div>
        </aside>
      </div>
    </Modal>
  );
};

export default CreateChartModal;
