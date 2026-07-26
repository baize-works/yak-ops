import HttpUtils from "@/utils/HttpUtils";

/**
 * Yak Security AccountController contract.
 *
 * Authentication is backed by the server-side HTTP session. The shared
 * request client sends cookies with `credentials: "include"`; no bearer token
 * is returned or stored by this module.
 */
const ACCOUNT_API = "/yak-security/api/v1/account";

/** AccountController's unauthenticated business/HTTP code. */
export const ACCOUNT_UNAUTHENTICATED_CODE = 401;

export type AccountLoginDTO = {
  userName: string;
  userPassword: string;
};

export const login = (body: AccountLoginDTO): Promise<void> =>
  HttpUtils.postData<void>(`${ACCOUNT_API}/login`, body);

export const getCurrentUser = (): Promise<API.CurrentUserVO> =>
  HttpUtils.getData<API.CurrentUserVO>(`${ACCOUNT_API}/current`);

export const logout = (): Promise<void> =>
  HttpUtils.postData<void>(`${ACCOUNT_API}/logout`);
