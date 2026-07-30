import { API_SUCCESS_CODE } from '@/services/http/response';
import { Badge, message, Popover } from "antd";
import { useState } from "react";
import { linkupJobScheduleApi } from "../../../api";
import { useIntl } from "@umijs/max";

interface ExecutionStatusProps {
  record: any;
}

const ScheduleInfo: React.FC<ExecutionStatusProps> = ({ record }) => {
  const intl = useIntl();
  const [cronExpression, setCronExpression] = useState<any[]>([]);

  const renderStatus = (status: string) => {

    const label =
      status === "NORMAL"
        ? "启用"
        : "暂停";

    if (status === "NORMAL") {
      return <span style={{ color: "green" }}>{label}</span>;
    }
    return <span style={{ color: "red" }}>{label}</span>;
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 19, marginRight: 8 }}>·</span>
        <span style={{ marginRight: 45, fontWeight: 700 }}>
          {intl.formatMessage({
            id: "pages.job.schedule.cron",
            defaultMessage: "Cron:",
          })}{" "}
        </span>

        <Popover
          content={
            <div style={{ padding: "0 0 0 6px" }}>
              {cronExpression.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <Badge status="success" text={item || "-"} />
                </div>
              ))}
            </div>
          }
          title={intl.formatMessage({
            id: "pages.job.schedule.last5RunsTitle",
            defaultMessage: "⏰ Last 5 Run Times",
          })}
          trigger="click"
        >
          <a
            onClick={() => {
              if (record?.cronExpression) {
                linkupJobScheduleApi
                  .getLast5ExecutionTimes(record?.cronExpression)
                  .then((data) => {
                    if (data?.code === API_SUCCESS_CODE) {
                      setCronExpression(data?.data || []);
                    } else {
                      message.error(data?.msg);
                    }
                  });
              } else {
                message.error(
                  intl.formatMessage({
                    id: "pages.job.message.unknownError",
                    defaultMessage: "Unknown Error",
                  }),
                );
              }
            }}
            style={{
              fontSize: 12,
              marginLeft: 8,
              color: "#1890ff",
              cursor: "pointer",
            }}
          >
            {record?.cronExpression || "-"}
          </a>
        </Popover>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 19, marginRight: 8 }}>·</span>
        <span style={{ marginRight: 66, fontWeight: 700 }}>
          状态
        </span>
        <span style={{ color: "gray" }}>{renderStatus(record?.scheduleStatus)}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 19, marginRight: 8 }}>·</span>
        <span style={{ marginRight: 12, fontWeight: 700 }}>
          {intl.formatMessage({
            id: "pages.job.schedule.lastRunTime",
            defaultMessage: "Last Run Time:",
          })}{" "}
        </span>
        <span style={{ color: "gray" }}>{record?.lastScheduleTime || "-"}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 19, marginRight: 8 }}>·</span>
        <span style={{ marginRight: 12, fontWeight: 700 }}>
          {intl.formatMessage({
            id: "pages.job.schedule.nextRunTime",
            defaultMessage: "Next Run Time:",
          })}{" "}
        </span>
        <span style={{ color: "gray" }}>{record?.nextScheduleTime || "-"}</span>
      </div>
    </>
  );
};

export default ScheduleInfo;