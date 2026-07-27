import { Checkbox, Modal, Spin, message } from 'antd';
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
  const [assignments, setAssignments] = useState<AssignInfo[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const show = useCallback(async (row: SystemUser) => {
    setTarget(row);
    setOpen(true);
    setLoading(true);
    setAssignments([]);
    setSelectedRoleIds([]);

    try {
      const data = await getUserRoleAssignments(row.id);
      const result = Array.isArray(data) ? data : [];

      setAssignments(result);
      setSelectedRoleIds(
        result.filter((item) => item.has).map((item) => Number(item.id)),
      );
    } catch (error) {
      message.error(errorText(error, '角色分配信息加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ open: show }), [show]);

  const close = () => {
    setOpen(false);
    setTarget(undefined);
    setAssignments([]);
    setSelectedRoleIds([]);
  };

  const save = async () => {
    if (!target) {
      return;
    }

    setSaving(true);

    try {
      await assignRolesToUser(target.id, selectedRoleIds);
      message.success('用户角色已更新');
      close();
      onSuccess();
    } catch (error) {
      message.error(errorText(error, '角色分配失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`分配角色${target ? `：${target.userName}` : ''}`}
      width={560}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      onOk={() => void save()}
      onCancel={close}
    >
      <Spin spinning={loading}>
        <Checkbox.Group
          className="grid w-full grid-cols-2 gap-3"
          value={selectedRoleIds}
          options={assignments.map((item) => ({
            label: item.name,
            value: Number(item.id),
          }))}
          onChange={(values) => {
            setSelectedRoleIds(
              values
                .map((value) => Number(value))
                .filter(Number.isFinite),
            );
          }}
        />
      </Spin>
    </Modal>
  );
});

UserRoleAssignmentModal.displayName = 'UserRoleAssignmentModal';

export default UserRoleAssignmentModal;
