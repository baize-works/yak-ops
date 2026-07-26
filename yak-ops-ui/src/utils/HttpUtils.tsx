import request, { type ApiResponse } from "@/utils/request";

class HttpUtils {
  /** Preserve the response envelope for existing pages during migration. */
  public static envelope<T>(response: ApiResponse<T>): ApiResponse<T> {
    return response;
  }

  /** Unwrap an already validated response for new call sites. */
  public static unwrap<T>(response: ApiResponse<T>): T {
    return response.data;
  }

  public static async post<T>(
    url: string,
    body?: Record<string, any>,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method: "POST",
      data: body,
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  }

  public static async postForm<T>(
    url: string,
    formData: FormData,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method: "POST",
      data: formData,
      ...options,
    });
  }

  public static async request<T>(
    url: string,
    method: string,
    body?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method,
      data: body,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  public static async get<T>(
    url: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  }

  public static async getData<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    return HttpUtils.unwrap(await HttpUtils.get<T>(url, options));
  }

  public static async postData<T>(
    url: string,
    body?: Record<string, any>,
    options?: RequestInit
  ): Promise<T> {
    return HttpUtils.unwrap(await HttpUtils.post<T>(url, body, options));
  }

  public static async putData<T>(
    url: string,
    body?: Record<string, any>,
    options?: RequestInit
  ): Promise<T> {
    return HttpUtils.unwrap(await HttpUtils.put<T>(url, body, options));
  }

  public static async deleteData<T>(
    url: string,
    data?: Record<string, any>,
    options?: RequestInit
  ): Promise<T> {
    return HttpUtils.unwrap(await HttpUtils.delete<T>(url, data, options));
  }

  public static async put<T>(
    url: string,
    body?: Record<string, any>,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method: "PUT",
      data: body,
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  }

  public static async delete<T>(
    url: string,
    data?: Record<string, any>,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(url, {
      method: "DELETE",
      data,
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
  }

  public static async download(
    url: string,
    options?: Record<string, any>
  ): Promise<any> {
    return request(url, {
      method: "GET",
      responseType: "blob",
      getResponse: true,
      ...(options || {}),
    });
  }
}

export default HttpUtils;
export type { ApiResponse };
