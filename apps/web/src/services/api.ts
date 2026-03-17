import type { ApiResponse } from '@librediary/shared';

export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// In-memory fallback for cross-origin deployments where
// document.cookie cannot read third-party cookies from the API domain
let csrfTokenFromHeader: string | undefined;

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match?.[1] ?? csrfTokenFromHeader;
}

function captureCsrfToken(response: Response): void {
  const token = response.headers.get(CSRF_HEADER_NAME);
  if (token) {
    csrfTokenFromHeader = token;
  }
}

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

  const allHeaders: Record<string, string> = { ...headers };

  // Attach CSRF token for state-changing requests
  if (method !== 'GET') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      allHeaders['X-CSRF-Token'] = csrfToken;
    }
  }

  const config: RequestInit = {
    method,
    headers: allHeaders,
    credentials: 'include',
  };

  // Only set Content-Type and body when there's actually a body to send
  if (body !== undefined) {
    allHeaders['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // Capture CSRF token from response header for cross-origin deployments
  captureCsrfToken(response);

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'PARSE_ERROR',
      `Server returned an unexpected response (HTTP ${response.status})`
    );
  }

  if (!data.success) {
    throw new ApiError(
      data.error?.code ?? 'UNKNOWN_ERROR',
      data.error?.message ?? 'An unexpected error occurred',
      data.error?.details
    );
  }

  return data.data as T;
}

export type UploadProgressCallback = (loaded: number, total: number) => void;

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

  upload<T>(endpoint: string, formData: FormData, onProgress?: UploadProgressCallback): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}${endpoint}`);
      xhr.withCredentials = true;

      const csrfToken = getCsrfToken();
      if (csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      }

      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress(event.loaded, event.total);
          }
        });
      }

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText) as ApiResponse<T>;
          if (!data.success) {
            reject(
              new ApiError(
                data.error?.code ?? 'UNKNOWN_ERROR',
                data.error?.message ?? 'An unexpected error occurred',
                data.error?.details
              )
            );
            return;
          }
          resolve(data.data as T);
        } catch {
          reject(new ApiError('PARSE_ERROR', 'Failed to parse server response'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError('NETWORK_ERROR', 'Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new ApiError('UPLOAD_ABORTED', 'Upload was aborted'));
      });

      xhr.send(formData);
    });
  },
};
