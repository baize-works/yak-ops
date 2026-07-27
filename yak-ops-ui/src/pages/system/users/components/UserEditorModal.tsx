import {
  Button,
  Drawer,
  Form,
  Input,
  Select,
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
  type UserCheckType,
  type UserInput,
  checkUserField,
  createUser,
  getUserDetail,
  updateUser,
} from '@/services/security/users';

import {
  PHONE_PATTERN,
  USER_NAME_PATTERN,
  cleanText,
  errorText,
  type RoleOption,
} from '../shared';

interface UserFormValues extends UserInput {
  confirmPassword?: string;
}

export interface UserEditorModalRef {
  openCreate: () => void;
  openEdit: (user: SystemUser) => Promise<void>;
}

interface UserEditorModalProps {
  roleOptions: RoleOption[];
  onSuccess: () => void;
}

const UserEditorModal = forwardRef<
  UserEditorModalRef,
  UserEditorModalProps
>(({ roleOptions, onSuccess }, ref) => {
  const [form] = Form.useForm<UserFormValues>();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser>();
  const [saving, setSaving] = useState(false);

  /**
   * 关闭抽屉并清理表单。
   */
  const close = useCallback(() => {
    if (saving) {
      return;
    }

    setOpen(false);
    setEditing(undefined);
    form.resetFields();
  }, [form, saving]);

  /**
   * 打开新增用户抽屉。
   */
  const openCreate = useCallback(() => {
    setEditing(undefined);

    form.resetFields();
    form.setFieldsValue({
      userName: '',
      realName: '',
      phone: '',
      email: '',
      pw: '',
      confirmPassword: '',
      roleIds: [],
    });

    setOpen(true);
  }, [form]);

  /**
   * 打开编辑用户抽屉。
   */
  const openEdit = useCallback(
    async (row: SystemUser) => {
      try {
        // 列表中的手机号可能已经脱敏，
        // 编辑前重新查询完整用户详情。
        const user = await getUserDetail(row.id);

        setEditing(user);

        form.resetFields();
        form.setFieldsValue({
          userName: user.userName,
          realName: user.realName ?? '',
          phone: user.phone ?? '',
          email: user.email ?? '',
          roleIds:
            user.roleList?.map((role) => Number(role.id)) ?? [],
        });

        setOpen(true);
      } catch (error) {
        message.error(errorText(error, '用户详情加载失败'));
      }
    },
    [form],
  );

  useImperativeHandle(
    ref,
    () => ({
      openCreate,
      openEdit,
    }),
    [openCreate, openEdit],
  );

  /**
   * 字段唯一性校验。
   */
  const uniqueValidator = (
    type: UserCheckType,
    originalValue?: string,
  ) =>
    async (_rule: unknown, value?: string) => {
      const normalized = cleanText(value);

      // 空值交由其他规则处理。
      // 编辑时字段未发生变化，不需要请求后端校验。
      if (
        !normalized ||
        normalized === cleanText(originalValue)
      ) {
        return;
      }

      try {
        await checkUserField(type, normalized);
      } catch (error) {
        throw new Error(
          errorText(error, '该字段已存在或格式不正确'),
        );
      }
    };

  /**
   * 保存或更新用户。
   */
  const save = async (values: UserFormValues) => {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const body: UserInput = {
        userName: cleanText(values.userName),
        realName: cleanText(values.realName),
        phone: cleanText(values.phone),
        email: cleanText(values.email),
        roleIds: values.roleIds ?? [],
      };

      if (editing) {
        await updateUser(body);
      } else {
        body.pw = values.pw ?? '';
        await createUser(body);
      }

      message.success(
        editing ? '用户已更新' : '用户已创建',
      );

      setOpen(false);
      setEditing(undefined);
      form.resetFields();

      onSuccess();
    } catch (error) {
      message.error(
        errorText(
          error,
          editing ? '用户更新失败' : '用户创建失败',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={editing ? '编辑用户' : '新增用户'}
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
            onClick={() => form.submit()}
          >
            {editing ? '更新' : '保存'}
          </Button>
        </div>
      }
    >
      <Form<UserFormValues>
        form={form}
        layout="vertical"
        preserve={false}
        disabled={saving}
        onFinish={save}
      >
        <Form.Item
          name="userName"
          label="用户名"
          validateTrigger="onBlur"
          rules={[
            {
              required: true,
              message: '请输入用户名',
            },
            {
              pattern: USER_NAME_PATTERN,
              message:
                '用户名须为 5～50 位字母、数字或下划线',
            },
            {
              validator: uniqueValidator(
                1,
                editing?.userName,
              ),
            },
          ]}
        >
          <Input
            disabled={Boolean(editing) || saving}
            placeholder="请输入用户名"
            maxLength={50}
          />
        </Form.Item>

        <Form.Item
          name="realName"
          label="真实姓名"
          rules={[
            {
              required: true,
              whitespace: true,
              message: '请输入真实姓名',
            },
          ]}
        >
          <Input
            placeholder="请输入真实姓名"
            maxLength={64}
          />
        </Form.Item>

        {!editing && (
          <>
            <Form.Item
              name="pw"
              label="初始密码"
              rules={[
                {
                  required: true,
                  message: '请输入初始密码',
                },
                {
                  min: 8,
                  message: '密码至少 8 位',
                },
              ]}
            >
              <Input.Password
                autoComplete="new-password"
                placeholder="请输入初始密码"
                maxLength={64}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['pw']}
              rules={[
                {
                  required: true,
                  message: '请再次输入密码',
                },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (
                      !value ||
                      value === getFieldValue('pw')
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
                placeholder="请再次输入密码"
                maxLength={64}
              />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="phone"
          label="手机号"
          validateTrigger="onBlur"
          rules={[
            {
              validator: async (
                rule,
                value?: string,
              ) => {
                const phone = cleanText(value);

                // 手机号非必填。
                if (!phone) {
                  return;
                }

                if (!PHONE_PATTERN.test(phone)) {
                  throw new Error(
                    '手机号格式不正确',
                  );
                }

                await uniqueValidator(
                  2,
                  editing?.phone,
                )(rule, phone);
              },
            },
          ]}
        >
          <Input
            placeholder="请输入手机号"
            maxLength={11}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="邮箱"
          validateTrigger="onBlur"
          rules={[
            {
              type: 'email',
              message: '邮箱格式不正确',
            },
            {
              validator: uniqueValidator(
                3,
                editing?.email,
              ),
            },
          ]}
        >
          <Input
            placeholder="请输入邮箱"
            maxLength={128}
          />
        </Form.Item>

        <Form.Item
          name="roleIds"
          label="角色"
        >
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            options={roleOptions}
            placeholder="请选择角色"
            maxTagCount="responsive"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

UserEditorModal.displayName = 'UserEditorModal';

export default UserEditorModal;