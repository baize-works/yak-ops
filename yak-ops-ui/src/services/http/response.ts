export type ApiProtocol = 'yak-ops' | 'security';

export const API_SUCCESS_CODE = 200;

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

const protocolRules: Record<
  ApiProtocol,
  { success: readonly number[]; unauthenticated: readonly number[] }
> = {
  'yak-ops': {
    success: [API_SUCCESS_CODE],
    unauthenticated: [401],
  },
  security: {
    success: [API_SUCCESS_CODE],
    unauthenticated: [401, 2001],
  },
};

const unauthenticatedMessages = new Set([
  'NOT_LOGIN',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'SESSION_INVALID',
]);

export const protocolForUrl = (url?: string): ApiProtocol =>
  url?.includes('/yak-security/') ? 'security' : 'yak-ops';

export const isApiResponse = (value: unknown): value is ApiResponse => {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as Partial<ApiResponse>).code === 'number';
};

export const isSuccessfulResponse = (
  response: Partial<ApiResponse> | null | undefined,
  protocol: ApiProtocol,
): boolean =>
  typeof response?.code === 'number' &&
  protocolRules[protocol].success.includes(response.code);

export const extractErrorMessage = (
  response: Partial<ApiResponse> | null | undefined,
  fallback = '操作失败',
): string => response?.msg?.trim() || response?.message?.trim() || fallback;

export const isUnauthenticatedResponse = (
  response: Partial<ApiResponse> | null | undefined,
  protocol: ApiProtocol,
): boolean => {
  const message = response?.msg || response?.message;
  return (
    (typeof response?.code === 'number' &&
      protocolRules[protocol].unauthenticated.includes(response.code)) ||
    (typeof message === 'string' &&
      unauthenticatedMessages.has(message.trim().toUpperCase()))
  );
};
