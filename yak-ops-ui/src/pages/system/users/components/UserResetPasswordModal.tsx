import { Form, Input, Modal, message } from 'antd';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';

import {
  type SystemUser,
  resetUserPassword,
} from '@/services/security/users';

import { errorText } from '../shared';

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

export interface UserResetPasswordModalRef {
  open: (user: SystemUser) => void;
}

const UserResetPasswordModal = forwardRef<UserResetPasswordModalRef>(
  (_, ref) => {
    const [form] = Form.useForm<ResetPasswordValues>();
    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState<SystemUser>();
    const [saving, setSaving] = useState(false);

    const show = useCallback(
      (row: SystemUser) => {
        setTarget(row);
        form.resetFields();
        setOpen(true);
      },
      [form],
    );

    useImperativeHandle(ref, () => ({ open: show }), [show]);

    const close = () => {
      setOpen(false);
      setTarget(undefined);
      form.resetFields();
    };

    const save = async (values: ResetPasswordValues) => {
      if (!target) {
        return;
      }

      setSaving(true);

      try {
        await resetUserPassword(target.id, values.password);
        message.success('密码已重置');
        close();
      } catch (error) {
        message.error(errorText(error, '密码重置失败'));
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal
        open={open}
        title={`重置密码${target ? `：${target.userName}` : ''}`}
        maskClosable={false}
        confirmLoading={saving}
        okText="确认重置"
        cancelText="取消"
        onCancel={close}
        onOk={() => form.submit()}
      >
        <Form<ResetPasswordValues>
          form={form}
          layout="vertical"
          onFinish={save}
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少 8 位' },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请输入新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || value === getFieldValue('password')) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('两次输入的密码不一致'),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请再次输入新密码"
            />
          </Form.Item>
        </Form>
      </Modal>
    );
  },
);

UserResetPasswordModal.displayName = 'UserResetPasswordModal';

export default UserResetPasswordModal;
