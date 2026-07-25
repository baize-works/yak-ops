import React from "react";
import {Col, Form, InputNumber, Row, Select, Switch} from "antd";
import {DATA_SAVE_MODE_OPTIONS, FIELD_IDE_OPTIONS, SCHEMA_SAVE_MODE_OPTIONS,} from "../config";

const MultiWorkflowParamConfig: React.FC = () => {
  return (
    <div className="mt-6 rounded-2xl bg-white" style={{marginBottom: 40}}>
      <div className="mb-5 text-base font-semibold text-slate-800">参数设置</div>

      <Row gutter={24}>
        <Col span={12}>
          <Form.Item
            label="每次拉取行数（Fetch Size）"
            name="fetchSize"
            rules={[{required: true, message: "请输入每次拉取行数"}]}
          >
            <InputNumber min={0} style={{width: "100%"}} placeholder="0"/>
          </Form.Item>

          <Form.Item
            label="读取分片大小（Split Size）"
            name="splitSize"
            rules={[{required: true, message: "请输入读取分片大小"}]}
          >
            <InputNumber min={1} style={{width: "100%"}} placeholder="8096"/>
          </Form.Item>
        </Col>

        <Col span={12}>
          <Row gutter={[16, 4]}>
            <Col span={12}>
              <Form.Item
                label="Schema 保存模式"
                name="schemaSaveMode"
                rules={[{required: true, message: "请选择 Schema 保存模式"}]}
              >
                <Select placeholder="请选择" options={SCHEMA_SAVE_MODE_OPTIONS}/>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="数据保存模式"
                name="dataSaveMode"
                rules={[{required: true, message: "请选择数据保存模式"}]}
              >
                <Select placeholder="请选择" options={DATA_SAVE_MODE_OPTIONS}/>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="启用 Upsert" name="enableUpsert" valuePropName="checked">
                <Switch/>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 4]}>
            <Col span={12}>
              <Form.Item
                label="批次大小"
                name="batchSize"
                rules={[{required: true, message: "请输入批次大小"}]}
              >
                <InputNumber
                  min={1}
                  placeholder="默认 10000"
                  style={{width: "100%"}}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="字段标识格式" name="fieldIde">
                <Select placeholder="请选择" options={FIELD_IDE_OPTIONS}/>
              </Form.Item>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default MultiWorkflowParamConfig;
