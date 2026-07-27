export interface RoleOption {
  value: number;
  label: string;
}

export const USER_NAME_PATTERN = /^[0-9a-zA-Z_]{4,50}$/;

export const PHONE_PATTERN =
  /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/;

export const userPermission = (action: string): string =>
  `security:user:${action}`;

export const cleanText = (value?: string): string => value?.trim() ?? '';

export const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
