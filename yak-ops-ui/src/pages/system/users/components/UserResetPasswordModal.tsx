import {
  Button,
  Drawer,
  Form,
  Input,
  message,
} from 'antd';
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

const UserResetPasswordModal =
  forwardRef<UserResetPasswordModalRef>((_, ref) => {
    const [form] = Form.useForm<ResetPasswordValues>();

    const [open, setOpen] = useState(false);
    const [target, setTarget] = useState<SystemUser>();
    const [saving, setSaving] = useState(false);

    /**
     * 打开重置密码抽屉。
     */
    const show = useCallback(
      (row: SystemUser) => {
        setTarget(row);
        form.resetFields();
        setOpen(true);
      },
      [form],
    );

    useImperativeHandle(
      ref,
      () => ({
        open: show,
      }),
      [show],
    );

    /**
     * 关闭抽屉并清理表单。
     */
    const close = useCallback(() => {
      if (saving) {
        return;
      }

      setOpen(false);
      setTarget(undefined);
      form.resetFields();
    }, [form, saving]);

    /**
     * 提交密码重置。
     */
    const save = async (
      values: ResetPasswordValues,
    ) => {
      if (!target || saving) {
        return;
      }

      setSaving(true);

      try {
        await resetUserPassword(
          target.id,
          values.password,
        );

        message.success('密码已重置');

        setOpen(false);
        setTarget(undefined);
        form.resetFields();
      } catch (error) {
        
      } finally {
        setSaving(false);
      }
    };

    return (
      <Drawer
        open={open}
        title="重置密码"
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
              danger
              loading={saving}
              disabled={!target}
              onClick={() => form.submit()}
            >
              确认重置
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

        <Form<ResetPasswordValues>
          form={form}
          layout="vertical"
          preserve={false}
          disabled={saving}
          onFinish={save}
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              {
                required: true,
                message: '请输入新密码',
              },
              {
                min: 8,
                message: '密码至少 8 位',
              },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请输入新密码"
              maxLength={64}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['password']}
            rules={[
              {
                required: true,
                message: '请再次输入新密码',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (
                    !value ||
                    value ===
                      getFieldValue('password')
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error(
                      '两次输入的密码不一致',
                    ),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="请再次输入新密码"
              maxLength={64}
            />
          </Form.Item>
        </Form>
      </Drawer>
    );
  });

UserResetPasswordModal.displayName =
  'UserResetPasswordModal';

export default UserResetPasswordModal;