import {
  Descriptions,
  Drawer,
  Space,
  Spin,
  Tag,
  Typography,
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
  getUserDetail,
} from '@/services/security/users';

import { errorText } from '../shared';

export interface UserDetailDrawerRef {
  open: (user: SystemUser) => Promise<void>;
}

const UserDetailDrawer = forwardRef<UserDetailDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<SystemUser>();

  const show = useCallback(async (row: SystemUser) => {
    setOpen(true);
    setLoading(true);
    setDetail(undefined);

    try {
      setDetail(await getUserDetail(row.id));
    } catch (error) {
      message.error(errorText(error, '用户详情加载失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ open: show }), [show]);

  const close = () => {
    setOpen(false);
    setDetail(undefined);
  };

  return (
    <Drawer
      open={open}
      title="用户详情"
      width={640}
      destroyOnClose
      onClose={close}
    >
      <Spin spinning={loading}>
        {detail ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="用户 ID">
              {detail.id}
            </Descriptions.Item>
            <Descriptions.Item label="用户名">
              {detail.userName}
            </Descriptions.Item>
            <Descriptions.Item label="真实姓名">
              {detail.realName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="手机号">
              {detail.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {detail.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {detail.roleList?.length ? (
                <Space wrap size={[4, 4]}>
                  {detail.roleList.map((role) => (
                    <Tag color="blue" key={role.id}>
                      {role.roleName}
                    </Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="授权项目">
              {detail.projectList?.length ? (
                <Space wrap size={[4, 4]}>
                  {detail.projectList.map((project) => (
                    <Tag key={project.id}>
                      {project.projectName ||
                        project.projectCode ||
                        project.id}
                    </Tag>
                  ))}
                </Space>
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detail.createTime || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detail.updateTime || '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          !loading && (
            <Typography.Text type="secondary">
              暂无用户详情。
            </Typography.Text>
          )
        )}
      </Spin>
    </Drawer>
  );
});

UserDetailDrawer.displayName = 'UserDetailDrawer';

export default UserDetailDrawer;
