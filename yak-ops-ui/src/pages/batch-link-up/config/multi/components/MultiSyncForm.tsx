import React from "react";
import {Col, Form, Input, Radio, Row, Select} from "antd";

const {TextArea} = Input;

interface Props {
  form: any;
  sourceOption: any[];
  targetOption: any[];
  matchMode: string;
  tableKeyword: string;
  onSourceIdChange: (value: string) => void;
  onMatchModeChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
}

const formItemClass = "[&_.ant-form-item-label>label]:text-[13px] [&_.ant-form-item-label>label]:text-slate-600";

const MultiSyncForm: React.FC<Props> = ({
                                          form,
                                          sourceOption,
                                          targetOption,
                                          matchMode,
                                          tableKeyword,
                                          onSourceIdChange,
                                          onMatchModeChange,
                                          onKeywordChange,
                                        }) => {
  return (
    <div className="rounded-2xl ">
      <Form
        form={form}
        initialValues={{matchMode: "1"}}
        layout="vertical"
      >
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item
              label="来源数据源"
              name="sourceId"
              rules={[{required: true, message: "请选择来源数据源"}]}
              className={formItemClass}
            >
              <Select
                size="middle"
                placeholder="请选择来源库"
                showSearch
                options={sourceOption}
                onChange={onSourceIdChange}
                className="st-round-select"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="目标数据源"
              name="sinkId"
              rules={[{required: true, message: "请选择目标数据源"}]}
              className={formItemClass}
            >
              <Select
                size="middle"
                placeholder="请选择目标库"
                showSearch
                options={targetOption}
                className="st-round-select"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="matchMode"
          label="表名匹配方式"
          className={`${formItemClass} mb-3`}
        >
          <Radio.Group
            value={matchMode}
            onChange={(e) => onMatchModeChange(e.target.value)}
            className="st-match-radio"
          >
            <Radio value="1">自定义</Radio>
            <Radio value="2">正则匹配</Radio>
            <Radio value="3">精准匹配</Radio>
            <Radio value="4">整库同步</Radio>
          </Radio.Group>
        </Form.Item>

        {(matchMode === "2" || matchMode === "3") && (
          <Form.Item
            name="sourceTable"
            label={matchMode === "2" ? "正则表达式" : "表名关键字"}
            className={`${formItemClass} mb-0`}
          >
            <TextArea
              placeholder={
                matchMode === "2"
                  ? "请输入正则表达式，例如：ods_.*, ..*"
                  : "英文逗号隔开的表名"
              }
              rows={4}
              value={tableKeyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              className="st-round-textarea"
            />
          </Form.Item>
        )}
      </Form>
    </div>
  );
};

export default MultiSyncForm;
