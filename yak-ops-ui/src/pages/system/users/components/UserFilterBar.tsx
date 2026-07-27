import { SearchOutlined } from "@ant-design/icons";
import { Input, Select } from "antd";
import { useState } from "react";

import type { RoleOption } from "../shared";

export interface UserFilterValues {
  id?: number;
  userName?: string;
  realName?: string;
  roleId?: number;
}

type UserSearchField = "userName" | "realName" | "id";

interface UserFilterBarProps {
  roleOptions: RoleOption[];
  onSearch: (values: UserFilterValues) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

const SEARCH_FIELD_OPTIONS: Array<{
  label: string;
  value: UserSearchField;
}> = [
  {
    label: "用户名",
    value: "userName",
  },
  {
    label: "真实姓名",
    value: "realName",
  },
  {
    label: "用户 ID",
    value: "id",
  },
];

const SEARCH_PLACEHOLDERS: Record<UserSearchField, string> = {
  userName: "请输入用户名",
  realName: "请输入真实姓名",
  id: "请输入用户 ID",
};

const clean = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized || undefined;
};

export default function UserFilterBar({
  roleOptions,
  onSearch,
  onRefresh,
  onCreate,
}: UserFilterBarProps) {
  const [activeRoleId, setActiveRoleId] = useState<number>();
  const [searchField, setSearchField] = useState<UserSearchField>("userName");
  const [keyword, setKeyword] = useState("");

  const createFilters = (
    nextKeyword = keyword,
    nextSearchField = searchField,
    nextRoleId = activeRoleId
  ): UserFilterValues => {
    const normalizedKeyword = clean(nextKeyword);

    const filters: UserFilterValues = {
      roleId: nextRoleId,
    };

    if (!normalizedKeyword) {
      return filters;
    }

    if (nextSearchField === "id") {
      const id = Number(normalizedKeyword);

      if (Number.isInteger(id) && id > 0) {
        filters.id = id;
      }

      return filters;
    }

    if (nextSearchField === "userName") {
      filters.userName = normalizedKeyword;
    }

    if (nextSearchField === "realName") {
      filters.realName = normalizedKeyword;
    }

    return filters;
  };

  const submit = () => {
    onSearch(createFilters());
  };

  const changeRole = (roleId?: number) => {
    setActiveRoleId(roleId);

    onSearch(createFilters(keyword, searchField, roleId));
  };

  const changeSearchField = (field: UserSearchField) => {
    setSearchField(field);
    setKeyword("");

    // 切换搜索字段时清除旧字段的查询条件，只保留角色筛选。
    onSearch({
      roleId: activeRoleId,
    });
  };

  const changeKeyword = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextKeyword = event.target.value;

    setKeyword(nextKeyword);

    // 点击清空按钮后立即恢复到角色筛选状态。
    if (!nextKeyword) {
      onSearch({
        roleId: activeRoleId,
      });
    }
  };

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* 左侧角色快捷筛选 */}
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
        {[{ label: "全部", value: undefined }, ...roleOptions].map((role) => {
          const active = activeRoleId === role.value;

          return (
            <div
              key={role.value ?? "all"}
              className={`
          cursor-pointer
          rounded
          px-3
          py-1
          text-sm
          font-medium
          leading-5
          transition-all
          ${
            active
              ? "bg-[#f2f2f4] text-[#FE2C55]"
              : `
                bg-[#f2f4f7]
                text-[#667085]
                hover:bg-[#e8eaef]
              `
          }
        `}
              onClick={() => changeRole(role.value)}
            >
              {role.label}
            </div>
          );
        })}
      </div>

      {/* 右侧搜索和操作 */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex h-8 w-[330px] max-w-full overflow-hidden rounded-md bg-[#f2f2f4]">
          <Select<UserSearchField>
            value={searchField}
            options={SEARCH_FIELD_OPTIONS}
            variant="borderless"
            popupMatchSelectWidth={120}
            className={[
              "h-8 w-[100px] shrink-0",
              "[&_.ant-select-selector]:!h-8",
              "[&_.ant-select-selector]:!px-3",
              "[&_.ant-select-selector]:!bg-transparent",
              "[&_.ant-select-selection-item]:!leading-[30px]",
              "[&_.ant-select-selection-placeholder]:!leading-[30px]",
            ].join(" ")}
            onChange={changeSearchField}
          />

          <div className="my-2 w-px shrink-0 bg-slate-200" />

          <Input
            allowClear
            value={keyword}
            variant="borderless"
            inputMode={searchField === "id" ? "numeric" : "text"}
            placeholder={SEARCH_PLACEHOLDERS[searchField]}
            suffix={
              <SearchOutlined
                className="cursor-pointer text-slate-400 transition-colors hover:text-slate-700"
                onClick={submit}
              />
            }
            className={[
              "min-w-0 flex-1",
              "!h-8 !bg-transparent !py-0 !shadow-none",
              "[&_.ant-input]:!bg-transparent",
            ].join(" ")}
            onChange={changeKeyword}
            onPressEnter={submit}
          />
        </div>

        {/* <Tooltip title="刷新列表">
    <Button
      icon={<ReloadOutlined />}
      onClick={onRefresh}
    />
  </Tooltip>

  <PermissionGuard
    mode="one"
    permission={userPermission("create")}
  >
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={onCreate}
    >
      新增用户
    </Button>
  </PermissionGuard> */}
      </div>
    </div>
  );
}
