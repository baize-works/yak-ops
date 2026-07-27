import { useModel } from '@umijs/max';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  SecurityPagination,
  SecurityQueryTable,
} from '@/components/security';
import {
  type SystemUser,
  pageUsers,
} from '@/services/security/users';

import UserDetailDrawer, {
  type UserDetailDrawerRef,
} from './components/UserDetailDrawer';
import UserEditorModal, {
  type UserEditorModalRef,
} from './components/UserEditorModal';
import UserFilterBar, {
  type UserFilterValues,
} from './components/UserFilterBar';
import UserResetPasswordModal, {
  type UserResetPasswordModalRef,
} from './components/UserResetPasswordModal';
import UserRoleAssignmentModal, {
  type UserRoleAssignmentModalRef,
} from './components/UserRoleAssignmentModal';
import { useRoleOptions } from './hooks/useRoleOptions';
import { useUserColumns } from './hooks/useUserColumns';

interface UserPaginationState {
  current: number;
  pageSize: number;
  total: number;
}

const DEFAULT_PAGINATION: UserPaginationState = {
  current: 1,
  pageSize: 10,
  total: 0,
};

export default function UsersPage() {
  const editorRef = useRef<UserEditorModalRef>(null);
  const detailRef = useRef<UserDetailDrawerRef>(null);
  const roleAssignmentRef =
    useRef<UserRoleAssignmentModalRef>(null);
  const resetPasswordRef =
    useRef<UserResetPasswordModalRef>(null);

  const requestSequenceRef = useRef(0);

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] =
    useState<UserFilterValues>({});
  const [pagination, setPagination] =
    useState<UserPaginationState>(
      DEFAULT_PAGINATION,
    );

  const { initialState } = useModel('@@initialState');

  const currentUserName =
    initialState?.currentUser?.userName;

  const roleOptions = useRoleOptions();

  const loadUsers = useCallback(async () => {
    const requestSequence =
      ++requestSequenceRef.current;

    setLoading(true);

    try {
      const result = await pageUsers({
        pageNum: pagination.current,
        pageSize: pagination.pageSize,
        id: filters.id,
        roleId: filters.roleId,
        userName: filters.userName,
        realName: filters.realName,
      });

      // 避免较早的请求覆盖最新查询结果。
      if (
        requestSequence !==
        requestSequenceRef.current
      ) {
        return;
      }

      setUsers(result.records ?? []);

      setPagination((current) => ({
        ...current,
        total: result.total ?? 0,
      }));
    } catch {
      if (
        requestSequence !==
        requestSequenceRef.current
      ) {
        return;
      }

      setUsers([]);

      setPagination((current) => ({
        ...current,
        total: 0,
      }));
    } finally {
      if (
        requestSequence ===
        requestSequenceRef.current
      ) {
        setLoading(false);
      }
    }
  }, [
    filters,
    pagination.current,
    pagination.pageSize,
  ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const reload = useCallback(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback(
    (values: UserFilterValues) => {
      setFilters(values);

      setPagination((current) => ({
        ...current,
        current: 1,
      }));
    },
    [],
  );

  const handlePageChange = useCallback(
    (
      nextCurrent: number,
      nextPageSize: number,
    ) => {
      setPagination((current) => {
        const pageSizeChanged =
          current.pageSize !== nextPageSize;

        return {
          ...current,
          current: pageSizeChanged
            ? 1
            : nextCurrent,
          pageSize: nextPageSize,
        };
      });
    },
    [],
  );

  const showDetail = useCallback(
    (user: SystemUser) => {
      void detailRef.current?.open(user);
    },
    [],
  );

  const showEdit = useCallback(
    (user: SystemUser) => {
      void editorRef.current?.openEdit(user);
    },
    [],
  );

  const showRoleAssignment = useCallback(
    (user: SystemUser) => {
      void roleAssignmentRef.current?.open(user);
    },
    [],
  );

  const showResetPassword = useCallback(
    (user: SystemUser) => {
      resetPasswordRef.current?.open(user);
    },
    [],
  );

  const columns = useUserColumns({
    roleOptions,
    currentUserName,
    onDetail: showDetail,
    onEdit: showEdit,
    onAssignRole: showRoleAssignment,
    onResetPassword: showResetPassword,
    onDeleted: reload,
  });

return (
  <section
    className="box-border flex flex-col bg-slate-50/50 p-6"
    style={{
      minHeight: 'calc(100vh - 64px)',
      overflow: "hidden"
    }}
  >
    {/* 上方内容 */}
    <div className="shrink-0">
      <h1
        className="mb-4 font-semibold"
        style={{
          fontSize: 18,
          color: '#282828',
        }}
      >
        用户管理
      </h1>

      <UserFilterBar
        roleOptions={roleOptions}
        onSearch={handleSearch}
        onRefresh={reload}
        onCreate={() =>
          editorRef.current?.openCreate()
        }
      />

      <SecurityQueryTable<SystemUser>
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={false}
        bordered
        scroll={{
          x: 'max-content',
        }}
      />
    </div>

    {/* 自动占满表格和分页之间的剩余区域 */}
    <div className="min-h-6 flex-1" />

    {/* 独立分页区域 */}
    <SecurityPagination
      current={pagination.current}
      pageSize={pagination.pageSize}
      total={pagination.total}
      disabled={loading}
      onChange={handlePageChange}
    />

    <UserEditorModal
      ref={editorRef}
      roleOptions={roleOptions}
      onSuccess={reload}
    />

    <UserDetailDrawer ref={detailRef} />

    <UserRoleAssignmentModal
      ref={roleAssignmentRef}
      onSuccess={reload}
    />

    <UserResetPasswordModal
      ref={resetPasswordRef}
    />
  </section>
);
}