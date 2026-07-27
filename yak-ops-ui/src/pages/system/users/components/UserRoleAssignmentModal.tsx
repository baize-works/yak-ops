import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';

import {
  type AssignInfo,
  type SystemUser,
  assignRolesToUser,
  getUserRoleAssignments,
} from '@/services/security/users';

import { errorText } from '../shared';

export interface UserRoleAssignmentModalRef {
  open: (user: SystemUser) => Promise<void>;
}

interface UserRoleAssignmentModalProps {
  onSuccess: () => void;
}

const UserRoleAssignmentModal = forwardRef<
  UserRoleAssignmentModalRef,
  UserRoleAssignmentModalProps
>(({ onSuccess }, ref) => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<SystemUser>();
  const [assignments, setAssignments] = useState<
    AssignInfo[]
  >([]);
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * 关闭角色分配抽屉并清理状态。
   */
  const close = useCallback(() => {
    if (saving) {
      return;
    }

    setOpen(false);
    setTarget(undefined);
    setAssignments([]);
    setSelectedRoleIds([]);
    setLoading(false);
  }, [saving]);

  /**
   * 打开角色分配抽屉。
   */
  const show = useCallback(async (row: SystemUser) => {
    setTarget(row);
    setAssignments([]);
    setSelectedRoleIds([]);
    setOpen(true);
    setLoading(true);

    try {
      const data = await getUserRoleAssignments(row.id);
      const result = Array.isArray(data) ? data : [];

      setAssignments(result);
      setSelectedRoleIds(
        result
          .filter((item) => item.has)
          .map((item) => Number(item.id))
          .filter(Number.isFinite),
      );
    } catch (error) {
      message.error(
        errorText(error, '角色分配信息加载失败'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: show,
    }),
    [show],
  );

  /**
   * 保存用户角色。
   */
  const save = async () => {
    if (!target || saving || loading) {
      return;
    }

    setSaving(true);

    try {
      await assignRolesToUser(
        target.id,
        selectedRoleIds,
      );

      message.success('用户角色已更新');

      setOpen(false);
      setTarget(undefined);
      setAssignments([]);
      setSelectedRoleIds([]);

      onSuccess();
    } catch (error) {
      message.error(
        errorText(error, '角色分配失败'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title="分配角色"
      width={520}
      forceRender
      maskClosable={false}
      keyboard={!saving}
      onClose={close}
      extra={
        <div className="flex items-center gap-2">
          <Button
            disabled={saving}
            onClick={close}
          >
            取消
          </Button>

          <Button
            type="primary"
            loading={saving}
            disabled={loading || !target}
            onClick={() => void save()}
          >
            保存
          </Button>
        </div>
      }
    >
      {target && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-xs text-gray-500">
            当前用户
          </div>

          <div className="mt-1 font-medium text-gray-900">
            {target.realName || target.userName}
          </div>

          {target.realName && (
            <div className="mt-0.5 text-sm text-gray-500">
              用户名：{target.userName}
            </div>
          )}
        </div>
      )}

      <Spin spinning={loading}>
        {!loading && assignments.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无可分配角色"
          />
        ) : (
          <Checkbox.Group
            className="grid w-full grid-cols-2 gap-3"
            value={selectedRoleIds}
            onChange={(values) => {
              setSelectedRoleIds(
                values
                  .map((value) => Number(value))
                  .filter(Number.isFinite),
              );
            }}
          >
            {assignments.map((item) => {
              const roleId = Number(item.id);
              const checked =
                selectedRoleIds.includes(roleId);

              return (
                <Checkbox
                  key={item.id}
                  value={roleId}
                  disabled={saving}
                  className={[
                    'm-0 flex min-h-12 items-center',
                    'rounded-lg border px-4 py-3',
                    'transition-colors duration-200',
                    checked
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <span className="ml-1 text-sm">
                    {item.name}
                  </span>
                </Checkbox>
              );
            })}
          </Checkbox.Group>
        )}
      </Spin>
    </Drawer>
  );
});

UserRoleAssignmentModal.displayName =
  'UserRoleAssignmentModal';

export default UserRoleAssignmentModal;