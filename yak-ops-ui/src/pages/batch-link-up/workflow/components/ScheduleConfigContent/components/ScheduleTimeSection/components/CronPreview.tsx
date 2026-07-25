import { linkupJobScheduleApi } from "@/pages/batch-link-up/api";
import { ClockCircleOutlined, CopyOutlined } from "@ant-design/icons";
import { Badge, Form, Popover, Typography, message } from "antd";
import React, { useState } from "react";
import { labelNodeStyle } from "../constants";

const { Text } = Typography;

interface Props {
  cronExpression: string;
}

const CronPreview: React.FC<Props> = ({ cronExpression }) => {
  const [nextExecutionTimes, setNextExecutionTimes] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleCopyCron = async () => {
    try {
      await navigator.clipboard.writeText(cronExpression);
      message.success("Cron 表达式已复制");
    } catch {
      
    }
  };

  const handlePreviewNextRuns = async () => {
    if (!cronExpression) {
      
      return;
    }

    try {
      setPreviewLoading(true);
      const data = await linkupJobScheduleApi.getLast5ExecutionTimes(
        cronExpression
      );
      setNextExecutionTimes(data?.data || []);
      setPreviewOpen(true);
    } catch {
      
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Form.Item
      style={{ marginBottom: 2 }}
      label={<span style={labelNodeStyle}>Cron表达式</span>}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex min-h-8 items-center gap-3 rounded-md bg-[#F8FAFC] px-3 py-1.5">
          <Text className="text-[13px] font-medium text-[#344054]">
            {cronExpression}
          </Text>
          <a
            className="inline-flex items-center gap-1 text-[12px]"
            onClick={handleCopyCron}
          >
            <CopyOutlined />
            复制
          </a>
        </div>

        <Popover
          trigger="click"
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          placement="bottomRight"
          title="⏰未来 5 次执行时间"
          content={
            <div style={{ minWidth: 240, padding: "2px 0 0 2px" }}>
              {previewLoading ? (
                <Text className="text-[12px] text-[#98A2B3]">加载中...</Text>
              ) : nextExecutionTimes.length ? (
                nextExecutionTimes.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 6,
                      fontSize: 12,
                    }}
                  >
                    <Badge status="processing" text={item || "-"} />
                  </div>
                ))
              ) : (
                <Text className="text-[12px] text-[#98A2B3]">
                  暂无执行时间
                </Text>
              )}
            </div>
          }
        >
          <ClockCircleOutlined
            onClick={handlePreviewNextRuns}
            style={{
              cursor: "pointer",
              color: "#475467",
              fontSize: 16,
            }}
          />
        </Popover>
      </div>
    </Form.Item>
  );
};

export default CronPreview;