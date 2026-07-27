# 用户管理页面拆分说明

```text
users/
├── index.tsx
├── shared.ts
├── components/
│   ├── UserDetailDrawer.tsx
│   ├── UserEditorModal.tsx
│   ├── UserResetPasswordModal.tsx
│   ├── UserRoleAssignmentModal.tsx
│   └── UserRowActions.tsx
└── hooks/
    ├── useRoleOptions.ts
    └── useUserColumns.tsx
```

- `index.tsx`：只负责页面布局、查询表格、刷新和操作组件编排。
- `UserEditorModal`：新增和编辑用户。
- `UserDetailDrawer`：查看用户详情。
- `UserRoleAssignmentModal`：分配用户角色。
- `UserResetPasswordModal`：重置密码。
- `UserRowActions`：行操作入口及删除用户。
- `useUserColumns`：列表列定义。
- `useRoleOptions`：角色下拉数据加载。
- `shared.ts`：页面内共用规则、工具函数和权限编码。
