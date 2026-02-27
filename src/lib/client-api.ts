/**
 * API 客户端工具
 * 提供类型安全的 API 调用方法
 */

const API_BASE = '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface ApiError {
  success: false;
  error: string;
  message?: string;
  code?: string;
}

interface ApiSuccess<T> {
  success: true;
  data?: T;
  message?: string;
}

type ApiResult<T> = ApiSuccess<T> | ApiError;

/**
 * 通用 API 请求函数
 */
async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000,
    retries = 3,
  } = options;

  const url = `${API_BASE}${endpoint}`;
  
  // 清理 headers
  const cleanHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // 请求配置
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;
  
  // 重试机制
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: cleanHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'same-origin',
      });

      clearTimeout(timeoutId);

      const data = await response.json() as ApiResult<T>;
      
      // 处理业务错误
      if (!response.ok || !data.success) {
        const err = data as ApiError;
        return {
          success: false,
          error: err.error || err.message || `HTTP ${response.status}`,
          code: `HTTP_${response.status}`,
        };
      }

      return data as ApiSuccess<T>;
    } catch (error) {
      lastError = error as Error;
      
      // 如果是最后一次尝试，不再重试
      if (attempt === retries - 1) break;
      
      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  clearTimeout(timeoutId);
  
  return {
    success: false,
    error: lastError?.message || 'Network error',
    code: 'NETWORK_ERROR',
  };
}

// ========== 类型安全的 API 方法 ==========

// 健康检查
export const healthApi = {
  check: () => request<{
    status: string;
    timestamp: string;
    uptime: number;
    kernel: { running: boolean; memory: string };
    ports: { controller: number; mixed: number };
    version: string;
  }>('/health'),
  
  detailed: () => request<{
    status: string;
    checks: Record<string, string>;
    metrics: Record<string, unknown>;
    environment: Record<string, string>;
  }>('/health', { method: 'POST' }),
};

// 认证
export const authApi = {
  login: (username: string, password: string) =>
    request<{ success: boolean }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    }),
  
  logout: () =>
    request('/auth/logout', { method: 'POST' }),
};

// 订阅
export const subscribeApi = {
  list: () =>
    request<{ subscriptions: Array<{
      id: string;
      name: string;
      url: string;
      enabled: boolean;
      status: string;
      hasLocalConfig: boolean;
    }>}>('/subscribe'),
  
  add: (name: string, url: string) =>
    request<{ data: { id: string } }>('/subscribe', {
      method: 'POST',
      body: { name, url },
    }),
  
  update: (id: string, updates: Record<string, unknown>) =>
    request(`/subscribe`, {
      method: 'PATCH',
      body: { id, ...updates },
    }),
  
  delete: (id: string) =>
    request(`/subscribe?id=${id}`, { method: 'DELETE' }),
  
  apply: (url?: string) =>
    request('/subscribe', {
      method: 'POST',
      body: { action: 'apply', url },
    }),
  
  applyAll: () =>
    request('/subscribe', {
      method: 'POST',
      body: { action: 'apply' },
    }),
};

// 设置
export const settingsApi = {
  get: () =>
    request<{ data: {
      logPath: string;
      locale: string;
      mixed_port?: number;
      controller_port?: number;
    }}>('/settings'),
  
  update: (updates: Record<string, unknown>) =>
    request('/settings', {
      method: 'PATCH',
      body: updates,
    }),
  
  updatePorts: (mixed_port?: number, controller_port?: number) =>
    request('/settings', {
      method: 'PUT',
      body: { mixed_port, controller_port },
    }),
};

// 内核
export const kernelApi = {
  status: () =>
    request<{
      running: boolean;
      config: Record<string, unknown>;
      traffic: Array<{ time: number; up: number; down: number }>;
      logs: string[];
      memory: number;
    }>('/kernel'),
  
  start: () =>
    request('/kernel', { method: 'POST', body: { action: 'start' } }),
  
  stop: () =>
    request('/kernel', { method: 'POST', body: { action: 'stop' } }),
};

// 配置
export const configApi = {
  get: () =>
    request<{
      hostname: string;
      port: number;
      hasSecret: boolean;
    }>('/config'),
};

// ========== 便捷方法 ==========

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export default api;
