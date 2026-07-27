import { securityGetData, securityPostData } from './client';

const MESSAGE_API = '/api/v1/message';
export type MessageStatus = 'UNREAD' | 'READ';
export interface SecurityMessage {
  id: number | string;
  title: string;
  summary?: string;
  type?: string;
  status: MessageStatus;
  createTime?: string;
  operationLogId?: number | string | null;
}
export interface MessageDetail extends SecurityMessage { content?: string }
export interface MessagePage { records: SecurityMessage[]; total: number }
export interface MessageQuery {
  pageNum: number; pageSize: number; status?: MessageStatus; type?: string;
  startTime?: string; endTime?: string;
}
const query = (values: object) => {
  const params = new URLSearchParams();
  Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return params.toString();
};
export const pageMessages = (params: MessageQuery) =>
  securityGetData<MessagePage>(`${MESSAGE_API}/page?${query(params)}`);
export const getUnreadMessageCount = () => securityGetData<number>(`${MESSAGE_API}/unread-count`);
export const markMessageRead = (id: number | string) =>
  securityPostData<void>(`${MESSAGE_API}/mark-read`, { id });
export const batchReadMessages = (ids: Array<number | string>) =>
  securityPostData<void>(`${MESSAGE_API}/batch-read`, { ids });
export const getMessageDetail = (id: number | string) =>
  securityGetData<MessageDetail>(`${MESSAGE_API}/detail?id=${encodeURIComponent(id)}`);
