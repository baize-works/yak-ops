export type ResourceId = number | string;
export type ResourceNodeType = 'DIRECTORY' | 'FILE';
export type ResourceStorageType =
  | 'LOCAL'
  | 'MINIO'
  | 'HDFS'
  | (string & {});

export interface CommonApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

export interface PaginationInfo {
  pageNo: number;
  pageSize: number;
  total: number;
  pages?: number;
}

export interface ResourceItem {
  id: ResourceId;
  parentId: ResourceId;
  name: string;
  fullPath: string;
  nodeType: ResourceNodeType;
  storageType: ResourceStorageType;
  contentType?: string;
  suffix?: string;
  fileSize?: number;
  checksum?: string;
  description?: string;
  version?: number;
  gitSyncStatus?: string;
  createTime?: string;
  updateTime?: string;
  children?: ResourceItem[];
}

export interface ResourceContent {
  resourceId: ResourceId;
  fullPath: string;
  content: string;
  skipLineNum: number;
  lineCount: number;
  hasMore: boolean;
}

export interface ResourceStoragePlugin {
  type: ResourceStorageType;
  name: string;
  active: boolean;
}

export interface ResourcePageResult {
  bizData: ResourceItem[];
  pagination: PaginationInfo;
}

export interface ResourceQueryParams {
  pageNo?: number;
  pageSize?: number;
  parentId?: ResourceId;
  keyword?: string;
  nodeType?: ResourceNodeType;
}

export interface CreateDirectoryPayload {
  parentId: ResourceId;
  name: string;
  description?: string;
}

export interface CreateTextResourcePayload {
  parentId: ResourceId;
  name: string;
  content: string;
  contentType?: string;
  description?: string;
}

export interface UpdateResourcePayload {
  name: string;
  description?: string;
}

export interface MoveResourcePayload {
  targetParentId: ResourceId;
}

export interface DirectoryFormValues {
  name: string;
  description?: string;
}

export interface TextResourceFormValues {
  name: string;
  content: string;
  contentType?: string;
  description?: string;
}

export interface ResourceMetadataFormValues {
  name: string;
  description?: string;
}

export interface MoveResourceFormValues {
  targetParentId: ResourceId;
}
