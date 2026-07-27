/* eslint-disable @typescript-eslint/dot-notation */
import { openPrettyNotification } from "@/utils/prettyNotification";
import { history } from "umi";
import { extend } from "umi-request";
import {
  extractErrorMessage,
  isApiResponse,
  isSuccessfulResponse,
  isUnauthenticatedResponse,
  protocolForUrl,
  type ApiProtocol,
  type ApiResponse,
} from "@/services/http/response";

export type { ApiProtocol, ApiResponse } from "@/services/http/response";

const codeMessage: Record<number, string> = {
  10000: "系统未知错误，请反馈给管理员",
  200: "服务器成功返回请求的数据。",
  201: "新建或修改数据成功。",
  202: "一个请求已经进入后台排队（异步任务）。",
  204: "删除数据成功。",
  400: "发出的请求有错误，服务器没有进行新建或修改数据的操作。",
  401: "用户没有权限（令牌、用户名、密码错误）。",
  403: "用户得到授权，但是访问是被禁止的。",
  404: "发出的请求针对的是不存在的记录，服务器没有进行操作。",
  406: "请求的格式不可得。",
  410: "请求的资源被永久删除，且不会再得到的。",
  422: "当创建一个对象时，发生一个验证错误。",
  500: "服务器发生错误，请检查服务器。",
  502: "网关错误。",
  503: "服务不可用，服务器暂时过载或维护。",
  504: "网关超时。",
};

export class BizError extends Error {
  code?: number;
  response?: ApiResponse<any>;
  skipErrorHandler?: boolean;
  protocol: ApiProtocol;

  constructor(
    message: string,
    code?: number,
    response?: ApiResponse<any>,
    skipErrorHandler = false,
    protocol: ApiProtocol = "yak-ops"
  ) {
    super(message);
    this.name = "BizError";
    this.code = code;
    this.response = response;
    this.skipErrorHandler = skipErrorHandler;
    this.protocol = protocol;
  }
}

export const goLogin = () => {
  if (!window.location.pathname.toLowerCase().startsWith("/login")) {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    history.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }
};

let authenticationFailureHandled = false;
const recentNotifications = new Map<string, number>();

const notifyOnce = (
  key: string,
  notification: Parameters<typeof openPrettyNotification>[0]
) => {
  const now = Date.now();
  const lastShown = recentNotifications.get(key) || 0;
  if (now - lastShown < 1000) return;
  recentNotifications.set(key, now);
  openPrettyNotification(notification);
};

/** Re-arm expiry handling only after a new Session has been established. */
export const resetAuthenticationFailure = () => {
  authenticationFailureHandled = false;
};

/** HTTP 401、业务未登录码与 Session 失效的唯一处理出口。 */
export const handleAuthenticationFailure = () => {
  window.dispatchEvent(new Event("yak-security:session-expired"));
  if (window.location.pathname.toLowerCase().startsWith("/login")) {
    return;
  }
  if (authenticationFailureHandled) return;

  authenticationFailureHandled = true;
  notifyOnce("authentication", {
    type: "warning",
    title: "登录状态失效",
    description: "当前登录信息已过期，请重新登录后继续操作。",
    meta: "即将跳转登录页",
  });
  goLogin();

};

/** 唯一错误出口 */
const errorHandler = (error: any): Response | undefined => {
  const { response } = error;

  // 业务异常
  if (error instanceof BizError) {
    if (isUnauthenticatedResponse(error.response, error.protocol)) {
      handleAuthenticationFailure();
    } else if (!error.skipErrorHandler) {
      notifyOnce(`business:${error.protocol}:${error.code}:${error.message}`, {
        type: "error",
        title: "操作失败",
        description: error.message || "未知错误",
        meta: "请稍后重试",
      });
    }

    throw error;
  }

  // HTTP 异常
  if (response?.status) {
    const { status, url } = response;

    if (status === 401) {
      handleAuthenticationFailure();
      return response;
    }

    const errorText = codeMessage[status] || response.statusText || "请求失败";

    notifyOnce(`http:${status}:${url || ""}`, {
      type: "error",
      title: `请求错误 ${status}`,
      description: (
        <div>
          <div>{errorText}</div>
          {url ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "rgba(23, 32, 51, 0.45)",
              }}
            >
              {url}
            </div>
          ) : null}
        </div>
      ),
      meta: "服务端返回异常",
      duration: 3.5,
    });

    return response;
  }

  // Abort is caller-controlled (navigation, timeout, stale request), not a network fault.
  if (error?.name === "AbortError" || error?.type === "aborted") throw error;

  // 网络异常
  notifyOnce("network", {
    type: "warning",
    title: "网络异常",
    description: "当前无法连接到服务器，请检查网络或稍后再试。",
    meta: "连接中断",
  });

  return response;
};

function createClient() {
  return extend({
    errorHandler,
    credentials: "include",
  });
}

const request = createClient();

request.interceptors.request.use((url: string, options: any) => {
  const headers = options.headers || {};

  return {
    url,
    options: {
      ...options,
      headers,
    },
  };
});

/** 这里只识别业务异常，不做提示 */
request.interceptors.response.use(async (response: Response, options: any) => {
  if (response.status === 204 || options?.responseType === "blob") return response;
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return response;
  }

  const clonedResponse = response.clone();
  const res: unknown = await clonedResponse.json();
  if (!isApiResponse(res)) return response;
  // Explicit client protocol wins because a reverse proxy may rewrite the URL.
  const protocol: ApiProtocol = options?.protocol || protocolForUrl(response.url);

  if (isUnauthenticatedResponse(res, protocol)) {
    handleAuthenticationFailure();
    throw new BizError(
      extractErrorMessage(res, "登录状态失效"),
      res.code,
      res,
      true,
      protocol
    );
  }

  if (
    typeof res?.code !== "undefined" &&
    !isSuccessfulResponse(res, protocol)
  ) {
    throw new BizError(
      extractErrorMessage(res),
      res.code,
      res,
      options?.skipErrorHandler,
      protocol
    );
  }

  return response;
});

export default request;
