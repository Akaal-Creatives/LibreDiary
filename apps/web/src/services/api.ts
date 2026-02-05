import type { ApiResponse } from '@librediary/shared';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    credentials: 'include',
  };

  // Only set Content-Type and body when there's actually a body to send
  if (body !== undefined) {
    (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new ApiError(
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'An unexpected error occurred',
      data.error?.details
    );
  }

  return data.data as T;
}

export const api = {
  get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },

  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body });
  },

  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PATCH', body });
  },

  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};
