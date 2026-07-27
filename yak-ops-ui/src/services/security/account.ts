import { securityGetData, securityPostData } from './client';

/**
 * Yak Security AccountController contract.
 *
 * Authentication is backed by the server-side HTTP session. The shared
 * request client sends cookies with `credentials: "include"`; no bearer token
 * is returned or stored by this module.
 */
const ACCOUNT_API = '/api/v1/account';

/** AccountController's unauthenticated business/HTTP code. */
export const ACCOUNT_UNAUTHENTICATED_CODE = 401;

export type AccountLoginDTO = {
  userName: string;
  pw: string;
};

export const login = (body: AccountLoginDTO): Promise<void> =>
  securityPostData<void>(`${ACCOUNT_API}/login`, body);

export const googleLogin = (credential: string): Promise<void> =>
  securityPostData<void>('/api/v1/auth/google/login', { credential });

export const getCurrentUser = (): Promise<API.CurrentUserVO> =>
  securityGetData<API.CurrentUserVO>(`${ACCOUNT_API}/current`);

export const logout = (): Promise<void> =>
  securityPostData<void>(`${ACCOUNT_API}/logout`);
