import { Globe2 } from 'lucide-react';
import type {
  NodePluginDefinition,
  WorkbenchFormSchema,
} from '../core/types';
import { CODE_CAPABILITIES } from './shared';

const HTTP_SCHEMA: WorkbenchFormSchema = {
  columns: 2,
  fields: [
    {
      key: 'method',
      label: '请求方式',
      type: 'select',
      required: true,
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      key: 'url',
      label: '请求地址',
      type: 'text',
      required: true,
      placeholder: 'https://api.example.com/data',
      span: 2,
    },
    {
      key: 'headers',
      label: '请求头（JSON）',
      type: 'textarea',
      rows: 5,
      span: 2,
      placeholder: '{\n  "Authorization": "Bearer ${token}"\n}',
    },
    {
      key: 'body',
      label: '请求体',
      type: 'textarea',
      rows: 9,
      span: 2,
      placeholder: '{\n  "date": "${bizdate}"\n}',
    },
  ],
};

const HTTP_RUNTIME_SCHEMA: WorkbenchFormSchema = {
  columns: 1,
  fields: [
    {
      key: 'connectTimeoutSeconds',
      label: '连接超时',
      type: 'number',
      min: 1,
      max: 300,
    },
    {
      key: 'readTimeoutSeconds',
      label: '读取超时',
      type: 'number',
      min: 1,
      max: 3600,
    },
    {
      key: 'successCodes',
      label: '成功状态码',
      type: 'text',
      placeholder: '200,201,204',
    },
    {
      key: 'followRedirects',
      label: '自动跟随重定向',
      type: 'switch',
    },
  ],
};

export const httpPlugin: NodePluginDefinition = {
  type: 'HTTP',
  version: 1,
  metadata: {
    label: 'HTTP 请求',
    description: '通过 JSON Schema 驱动的表单配置 HTTP API 调用。',
    category: '数据处理',
    folderId: 'http',
    folderLabel: 'HTTP',
    folderOrder: 70,
    icon: Globe2,
    iconClassName: 'text-[#1677ff]',
    defaultEngine: 'HTTP',
    engineOptions: [{ label: 'HTTP', value: 'HTTP' }],
  },
  capabilities: {
    ...CODE_CAPABILITIES,
    formatable: true,
  },
  authoring: {
    rendererKey: 'schema-form',
    schema: HTTP_SCHEMA,
    createDefaultContent: () => ({
      kind: 'form',
      value: {
        method: 'GET',
        url: '',
        headers: '{\n  "Accept": "application/json"\n}',
        body: '',
      },
    }),
  },
  runtime: {
    schema: HTTP_RUNTIME_SCHEMA,
    defaultValue: () => ({
      connectTimeoutSeconds: 10,
      readTimeoutSeconds: 60,
      successCodes: '200,201,204',
      followRedirects: true,
    }),
  },
  toolbar: [
    'http.test',
    'execution.stop',
    'document.save',
    'document.format',
    'version.publish',
    'http.show-response',
    'resource.share',
  ],
};
