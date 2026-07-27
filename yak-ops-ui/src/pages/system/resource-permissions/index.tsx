import {
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Segmented,
  Space,
  Switch,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';

import { PermissionGuard } from '@/components/security';
import {
  getResourceViewControlStatus,
  setResourceViewControlStatus,
} from '@/services/security/resourcePermissions';

import ByResourceAuthorization from './components/ByResourceAuthorization';
import ByUserAuthorization from './components/ByUserAuthorization';

type AuthorizationMode = 'user' | 'resource';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const permission = (action: string): string =>
  `security:resource-permission:${action}`;

export default function ResourcePermissionsPage() {
  const [mode, setMode] = useState<AuthorizationMode>('user');
  const [viewControlEnabled, setViewControlEnabled] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const loadViewControlStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      setViewControlEnabled(await getResourceViewControlStatus());
    } catch (error) {
      setViewControlEnabled(false);
      message.error(errorText(error, '查看权限控制状态加载失败'));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadViewControlStatus();
  }, [loadViewControlStatus]);

  const changeViewControlStatus = async (enabled: boolean) => {
    if (statusSaving) return;
    setStatusSaving(true);

    try {
      await setResourceViewControlStatus(enabled);
      setViewControlEnabled(enabled);
      message.success(
        enabled
          ? '查看权限控制已开启，可为用户单独分配查看权限'
          : '查看权限控制已关闭，未授予管理权限的用户默认可查看资源',
      );
    } catch (error) {
      message.error(errorText(error, '查看权限控制状态更新失败'));
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <section
      className="box-border flex min-h-[680px] flex-col overflow-hidden bg-slate-50/50 p-6"
      style={{ height: 'calc(100vh - 64px)' }}
      aria-labelledby="resource-permission-title"
    >
      <div className="mb-4 flex shrink-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1
            id="resource-permission-title"
            className="font-semibold"
            style={{ fontSize: 18, color: '#282828' }}
          >
            资源授权
          </h1>
          <div className="mt-1 text-sm text-slate-500">
            按用户或按资源维护项目、资源类型和具体资源三级权限。
          </div>
        </div>

        <Space size={16} wrap>
          <Segmented<AuthorizationMode>
            value={mode}
            options={[
              {
                label: (
                  <Space size={6}>
                    <TeamOutlined />
                    按用户授权
                  </Space>
                ),
                value: 'user',
              },
              {
                label: (
                  <Space size={6}>
                    <SafetyCertificateOutlined />
                    按资源授权
                  </Space>
                ),
                value: 'resource',
              },
            ]}
            onChange={setMode}
          />

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
            <div>
              <div className="text-sm font-medium text-slate-700">
                查看权限控制
              </div>
              <div className="text-xs text-slate-400">
                {viewControlEnabled
                  ? '未授权用户不可查看资源'
                  : '关闭时默认拥有查看权限'}
              </div>
            </div>

            <PermissionGuard
              mode="one"
              permission={permission('toggle')}
              behavior="disable"
            >
              <Tooltip
                title={
                  viewControlEnabled
                    ? '关闭后，未授予管理权限的用户默认可查看资源'
                    : '开启时会清理历史查看授权，并从空授权开始配置'
                }
              >
                <Switch
                  checked={viewControlEnabled}
                  loading={statusLoading || statusSaving}
                  onChange={(checked) =>
                    void changeViewControlStatus(checked)
                  }
                />
              </Tooltip>
            </PermissionGuard>
          </div>
        </Space>
      </div>

      {!viewControlEnabled && (
        <Alert
          showIcon
          type="info"
          className="mb-4 shrink-0"
          message="查看权限控制当前处于关闭状态"
          description="页面仍可维护管理权限；查看权限将在开启控制后才需要单独分配。"
          action={<Tag>默认可查看</Tag>}
        />
      )}

      <div className="min-h-0 flex-1">
        {mode === 'user' ? (
          <ByUserAuthorization
            viewControlEnabled={viewControlEnabled}
          />
        ) : (
          <ByResourceAuthorization
            viewControlEnabled={viewControlEnabled}
          />
        )}
      </div>
    </section>
  );
}
