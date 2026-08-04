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
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
        (value) => ({
          label: value,
          value,
        }),
      ),
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
      key: 'requestTimeoutSeconds',
      label: '请求超时',
      type: 'number',
      min: 1,
      max: 3600,
    },
    {
      key: 'successCodes',
      label: '成功状态码',
      type: 'text',
      placeholder: '留空表示 200-299；也可填写 200,201,204',
    },
    {
      key: 'maxResponseBodyCharacters',
      label: '最大响应体字符数',
      type: 'number',
      min: 1,
      max: 10_000_000,
    },
  ],
};

export const httpPlugin: NodePluginDefinition = {
  type: 'HTTP',
  version: 1,
  metadata: {
    label: 'HTTP 请求',
    description: '调用 HTTP 接口并保存状态码、响应头与响应体。',
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
      requestTimeoutSeconds: 60,
      successCodes: '',
      maxResponseBodyCharacters: 1_000_000,
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
