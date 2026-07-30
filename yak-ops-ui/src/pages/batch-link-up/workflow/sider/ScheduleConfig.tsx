import { API_SUCCESS_CODE } from '@/services/http/response';
import Header from "@/components/Header";
import { Col, Form, Input, message, Popover, Radio, Row } from "antd";
import { useState } from "react";
import { taskScheduleApi } from "../../type";
import { useIntl } from "@umijs/max";

function ScheduleConfig({ form }) {
  const intl = useIntl();
  const [preview, setPreview] = useState<string[]>([]);

  const previewCron = async () => {
    const cron = form.getFieldValue("cronExpression");
    if (!cron) {
      message.error(
        intl.formatMessage({
          id: "pages.job.config.schedule.cronRequired",
          defaultMessage: "Please input cron expression first",
        }),
      );
      return;
    }

    const res = await taskScheduleApi.getLast5ExecutionTimes(cron);
    if (res?.code === API_SUCCESS_CODE) {
      setPreview(res.data || []);
    }
  };

  return (
    <>
      <Header
        title={
          <span style={{ fontSize: 12, fontWeight: 500 }}>
            {intl.formatMessage({
              id: "pages.job.config.schedule.title",
              defaultMessage: "Schedule Setting",
            })}
          </span>
        }
      />

      <Row gutter={24}>
        <Col>
          <Form.Item
            name="cronExpression"
            label={intl.formatMessage({
              id: "pages.job.config.schedule.cronExpression",
              defaultMessage: "Cron Expression",
            })}
            rules={[
              {
                required: true,
                message: intl.formatMessage({
                  id: "pages.job.config.schedule.cronExpression.required",
                  defaultMessage: "Cron expression is required",
                }),
              },
            ]}
          >
            <Input size="small" />
          </Form.Item>
        </Col>

        <Col>
          <Popover
            title={intl.formatMessage({
              id: "pages.job.config.schedule.last5Runs.title",
              defaultMessage: "Last 5 Runs",
            })}
            content={
              preview.length > 0 ? (
                preview.map((t, i) => <div key={i}>{t}</div>)
              ) : (
                <div style={{ color: "gray" }}>
                  {intl.formatMessage({
                    id: "pages.job.config.schedule.last5Runs.empty",
                    defaultMessage: "No preview yet",
                  })}
                </div>
              )
            }
          >
            <a onClick={previewCron} style={{ fontSize: 12 }}>
              {intl.formatMessage({
                id: "pages.job.config.schedule.last5Runs.link",
                defaultMessage: "Last 5 Runs",
              })}
            </a>
          </Popover>
        </Col>
      </Row>

      <Form.Item
        name="scheduleStatus"
        label={intl.formatMessage({
          id: "pages.job.config.schedule.enableScheduling",
          defaultMessage: "Enable Scheduling",
        })}
        rules={[
          {
            required: true,
            message: intl.formatMessage({
              id: "pages.job.config.schedule.enableScheduling.required",
              defaultMessage: "Please choose scheduling status",
            }),
          },
        ]}
      >
        <Radio.Group>
          <Radio value="ACTIVE">
            {intl.formatMessage({
              id: "pages.job.config.schedule.status.active",
              defaultMessage: "ACTIVE",
            })}
          </Radio>
          <Radio value="PAUSED">
            {intl.formatMessage({
              id: "pages.job.config.schedule.status.paused",
              defaultMessage: "PAUSED",
            })}
          </Radio>
        </Radio.Group>
      </Form.Item>
    </>
  );
}

export default ScheduleConfig;