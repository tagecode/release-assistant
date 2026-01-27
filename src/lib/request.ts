/**
 * HTTP 请求方法
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * 请求配置
 */
export interface RequestConfig {
  url: string;
  method?: HttpMethod;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * 响应结果
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

/**
 * 请求错误
 */
export class RequestError extends Error {
  code: number;
  data?: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = "RequestError";
    this.code = code;
    this.data = data;
  }
}

/**
 * API 基础配置
 */
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

/**
 * 构建 URL（处理查询参数）
 */
function buildUrl(url: string, params?: Record<string, any>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * HTTP 请求封装
 */
export async function request<T = any>(config: RequestConfig): Promise<T> {
  const {
    url,
    method = "GET",
    params,
    data,
    headers = {},
    timeout = API_CONFIG.timeout,
  } = config;

  // 构建完整 URL
  const fullUrl = `${API_CONFIG.baseURL}${url}`;
  const requestUrl = buildUrl(fullUrl, params);

  // 请求配置
  const requestInit: RequestInit = {
    method,
    headers: {
      ...API_CONFIG.headers,
      ...headers,
    },
  };

  // 非 GET 请求添加 body
  if (method !== "GET" && data !== undefined) {
    requestInit.body = JSON.stringify(data);
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  requestInit.signal = controller.signal;

  try {
    // 发起请求
    const response = await fetch(requestUrl, requestInit);
    clearTimeout(timeoutId);

    // 解析响应
    const result: ApiResponse<T> = await response.json();

    // 检查业务状态码
    if (result.code !== 0 && result.code !== 200) {
      throw new RequestError(
        result.message || "请求失败",
        result.code,
        result.data
      );
    }

    return result.data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof RequestError) {
      throw error;
    }

    // 处理网络错误、超时等
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new RequestError("请求超时", 408);
      }
      throw new RequestError(error.message, 500);
    }

    throw new RequestError("未知错误", 500);
  }
}

/**
 * GET 请求
 */
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<RequestConfig>
): Promise<T> {
  return request<T>({ url, method: "GET", params, ...config });
}

/**
 * POST 请求
 */
export function post<T = any>(
  url: string,
  data?: any,
  config?: Partial<RequestConfig>
): Promise<T> {
  return request<T>({ url, method: "POST", data, ...config });
}

/**
 * PUT 请求
 */
export function put<T = any>(
  url: string,
  data?: any,
  config?: Partial<RequestConfig>
): Promise<T> {
  return request<T>({ url, method: "PUT", data, ...config });
}

/**
 * DELETE 请求
 */
export function del<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: Partial<RequestConfig>
): Promise<T> {
  return request<T>({ url, method: "DELETE", params, ...config });
}

/**
 * PATCH 请求
 */
export function patch<T = any>(
  url: string,
  data?: any,
  config?: Partial<RequestConfig>
): Promise<T> {
  return request<T>({ url, method: "PATCH", data, ...config });
}
