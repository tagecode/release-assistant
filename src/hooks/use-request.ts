import { useState, useCallback, useEffect } from "react";
import { RequestError } from "@/lib/request";

/**
 * 请求状态
 */
export interface UseRequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 使用 API 请求的 Hook
 *
 * @param apiFn - API 请求函数
 * @param options - 配置选项
 *
 * @example
 * ```tsx
 * // 手动触发请求
 * const { data, loading, error, execute } = useRequest(getUserList);
 *
 * <button onClick={() => execute({ page: 1 })}>获取数据</button>
 *
 * // 自动执行请求
 * const { data, loading, error, refresh } = useRequest(
 *   () => getUserList({ page: 1 }),
 *   { immediate: true }
 * );
 * ```
 */
export function useRequest<T, P extends any[] = any[]>(
  apiFn: (...args: P) => Promise<T>,
  options?: {
    immediate?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: RequestError) => void;
    args?: P;
  }
) {
  const [state, setState] = useState<UseRequestState<T>>({
    data: null,
    loading: options?.immediate ?? false,
    error: null,
  });

  const execute = useCallback(
    async (...args: P) => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await apiFn(...args);
        setState({ data, loading: false, error: null });
        options?.onSuccess?.(data);
        return data;
      } catch (err) {
        const error =
          err instanceof RequestError
            ? err
            : new RequestError("请求失败", 500);
        setState({ data: null, loading: false, error: error.message });
        options?.onError?.(error);
        throw error;
      }
    },
    [apiFn, options]
  );

  const refresh = useCallback(() => {
    if (options?.args) {
      return execute(...options.args);
    }
    return execute(...([] as unknown as P));
  }, [execute, options]);

  useEffect(() => {
    if (options?.immediate) {
      if (options?.args) {
        execute(...options.args);
      } else {
        execute(...([] as unknown as P));
      }
    }
  }, []);

  return {
    ...state,
    execute,
    refresh,
  };
}

/**
 * 使用多个 API 请求的 Hook
 *
 * @example
 * ```tsx
 * const { data: stats, loading: statsLoading } = useRequest(getDashboardStats, { immediate: true });
 * const { data: chartData, loading: chartLoading } = useRequest(getChartData, { immediate: true });
 * ```
 */
