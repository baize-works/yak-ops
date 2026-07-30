import {
  CheckCircleFilled,
  CloseCircleFilled,
  LoadingOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';
import type { ReactNode } from 'react';

import '../index.enhancements.less';

interface DataSourceStatusProps {
  status?: string;
}

interface StatusConfigItem {
  color: 'success' | 'error' | 'processing' | 'default' | 'warning';
  icon: ReactNode;
  text: string;
  tooltip?: string;
}

const connectedConfig: StatusConfigItem = {
  color: 'success',
  icon: <CheckCircleFilled />,
  text: '已连接',
  tooltip: '数据源连接正常',
};

const disconnectedConfig: StatusConfigItem = {
  color: 'error',
  icon: <CloseCircleFilled />,
  text: '连接失败',
  tooltip: '最近一次连接测试失败',
};

const unknownConfig: StatusConfigItem = {
  color: 'default',
  icon: <MinusCircleOutlined />,
  text: '待检测',
  tooltip: '尚未进行连接测试，或连接参数刚刚发生变化',
};

const statusConfigMap: Record<string, StatusConfigItem> = {
  CONNECTED: connectedConfig,
  CONNECTED_SUCCESS: connectedConfig,
  DISCONNECTED: disconnectedConfig,
  CONNECTED_FAILED: disconnectedConfig,
  UNKNOWN: unknownConfig,
  CONNECTED_NONE: unknownConfig,
  CONNECTING: {
    color: 'processing',
    icon: <LoadingOutlined spin />,
    text: '连接中',
    tooltip: '正在进行连接测试',
  },
};

const DataSourceStatus = ({ status }: DataSourceStatusProps) => {
  const normalized = String(status || 'UNKNOWN').trim().toUpperCase();
  const currentConfig = statusConfigMap[normalized] || unknownConfig;

  return (
    <Tooltip title={currentConfig.tooltip}>
      <Tag
        color={currentConfig.color}
        icon={currentConfig.icon}
        style={{
          marginInlineEnd: 0,
          borderRadius: 999,
          paddingInline: 10,
          fontSize: 12,
          lineHeight: '20px',
        }}
      >
        {currentConfig.text}
      </Tag>
    </Tooltip>
  );
};

export default DataSourceStatus;
