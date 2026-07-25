import {Form, Input, Radio} from "antd";
import DataSourceSelect, {generateDataSourceOptions} from "../../DataSourceSelect";
import IconRightArrow from "../../IconRightArrow";
import ModeCard from "./ModeCard";
import type {SyncMode} from "../types";

const {TextArea} = Input;

interface Props {
  sourceType: any;
  targetType: any;
  handleSourceChange: (value: string, option: any) => void;
  handleTargetChange: (value: string, option: any) => void;
  mode?: SyncMode;
  setMode: (value: SyncMode) => void;
}

const BaseConfigSection: React.FC<Props> = ({
                                              sourceType,
                                              targetType,
                                              handleSourceChange,
                                              handleTargetChange,
                                              mode,
                                              setMode,
                                            }) => {
  return (
    <div className="p-6">
      {/* 整体卡片 */}
      <div className="rounded-[24px] bg-white shadow-sm space-y-6">

        {/* ① 数据同步方式（主视觉块） */}
        <div className="rounded-2xl border border-[#E4E7EC] bg-[#FAFBFC] p-5">
          <div className="mb-3 text-[14px] font-medium text-[#344054]">
            数据同步方式
          </div>

          <div className="flex items-center gap-3">
            <DataSourceSelect
              value={sourceType}
              onChange={handleSourceChange}
              dataSourceOptions={generateDataSourceOptions()}
              placeholder="请选择来源"
              prefix="来源"
              width="48%"
            />

            <div className="text-[#98A2B3]">
              <IconRightArrow/>
            </div>

            <DataSourceSelect
              value={targetType}
              onChange={handleTargetChange}
              dataSourceOptions={generateDataSourceOptions()}
              placeholder="请选择去向"
              prefix="去向"
              width="48%"
            />
          </div>
        </div>

        {/* ② 任务信息 */}
        <div className="space-y-4">
          <div className="text-[14px] font-medium text-[#344054]">
            任务信息
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Form.Item
              label="任务名称"
              name="jobName"
              rules={[{required: true, message: "请输入任务名称"}]}
              className="mb-0"
            >
              <Input
                placeholder="例如：MySQL → Oracle 用户表同步"
                className="!h-[36px] !rounded-[12px]"
              />
            </Form.Item>

            <Form.Item label="任务描述" name="jobDesc" className="mb-0">
              <TextArea
                placeholder="描述同步范围、用途、注意事项等"
                rows={3}
                className="!rounded-xl"
              />
            </Form.Item>
          </div>
        </div>

        {/* ③ 配置模式 */}
        <div>
          <div className="mb-3 text-[14px] font-medium text-[#344054]">
            配置模式
          </div>

          <Form.Item name="mode" initialValue="GUIDE_SINGLE" className="mb-0">
            <Radio.Group className="w-full">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ModeCard
                  value="GUIDE_SINGLE"
                  current={mode}
                  title="单表向导"
                  desc="适合快速创建单表同步任务，配置路径更清晰。"
                  tag="推荐"
                  onSelect={setMode}
                />

                <ModeCard
                  value="GUIDE_MULTI"
                  current={mode}
                  title="多表向导"
                  desc="适合批量配置多张表，统一管理同步关系。"
                  tag="批量"
                  onSelect={setMode}
                />

                <ModeCard
                  value="SCRIPT"
                  current={mode}
                  title="脚本模式"
                  desc="适合更复杂的同步场景，灵活度更高。"
                  tag="高级"
                  onSelect={setMode}
                />
              </div>
            </Radio.Group>
          </Form.Item>
        </div>
      </div>
    </div>
  );
};

export default BaseConfigSection;
