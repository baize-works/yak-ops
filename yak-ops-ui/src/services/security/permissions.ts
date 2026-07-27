import {
  securityDeleteData,
  securityGetData,
  securityPostData,
} from './client';

const PERMISSION_API = '/api/v1/permission';

export type TreeId = string | number;

/**
 * Permission tree node returned by Yak Security.
 *
 * The backend returns one virtual root node whose real permissions live in
 * childList. The virtual root has id=0 and no name/code.
 */
export interface PermissionVO {
  id: number;
  has?: boolean;
  permissionCode?: string;
  permissionName?: string;
  parentId?: number | null;
  leaf?: boolean;
  description?: string | null;
  active?: boolean;
  declared?: boolean;
  childList?: PermissionVO[];
}

/** DTO accepted by POST /permission/import. */
export interface PermissionImportItem {
  permissionCode: string;
  permissionName: string;
  description?: string;
  childPermissionDTOList?: PermissionImportItem[];
}

/** Query the complete permission tree. */
export const getPermissionTree = (): Promise<PermissionVO> =>
  securityGetData<PermissionVO>(`${PERMISSION_API}/tree`);

/**
 * Import a permission DTO tree.
 *
 * The backend accepts a JSON array rather than multipart/form-data, so files
 * are parsed in the browser before this request is sent.
 */
export const importPermissions = (
  permissions: PermissionImportItem[],
): Promise<void> =>
  securityPostData<void>(
    `${PERMISSION_API}/import`,
    permissions,
  );

/** Delete one permission and its role-permission relationships. */
export const deletePermission = (
  id: TreeId,
): Promise<void> =>
  securityDeleteData<void>(
    `${PERMISSION_API}/${encodeURIComponent(String(id))}`,
  );
