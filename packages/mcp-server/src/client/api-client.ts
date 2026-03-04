/**
 * HTTP fetch wrapper for the LibreDiary REST API.
 * Handles Bearer auth and consistent error handling.
 */

import type { ApiResponse } from '@librediary/shared';
import type { McpConfig } from '../config.js';

export class LibreDiaryApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LibreDiaryApiError';
  }
}

export class LibreDiaryClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly orgId: string;

  constructor(config: McpConfig) {
    this.baseUrl = config.apiUrl;
    this.token = config.apiToken;
    this.orgId = config.orgId;
  }

  /** Build a full URL for an org-scoped endpoint. */
  private orgUrl(path: string): string {
    return `${this.baseUrl}/organizations/${this.orgId}${path}`;
  }

  /** Build a full URL for a non-org endpoint. */
  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  /** Common headers for all requests. */
  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };
  }

  /**
   * Make an API request and return the parsed response data.
   * Throws LibreDiaryApiError on non-success responses.
   */
  private async request<T>(method: string, fullUrl: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      headers: this.headers(),
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(fullUrl, init);
    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      throw new LibreDiaryApiError(
        response.status,
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? `Request failed with status ${response.status}`,
        json.error?.details
      );
    }

    return json.data as T;
  }

  // ===========================================
  // ORG-SCOPED REQUESTS
  // ===========================================

  async orgGet<T>(path: string): Promise<T> {
    return this.request<T>('GET', this.orgUrl(path));
  }

  async orgPost<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', this.orgUrl(path), body);
  }

  async orgPatch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', this.orgUrl(path), body);
  }

  async orgDelete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', this.orgUrl(path));
  }

  // ===========================================
  // NON-ORG REQUESTS
  // ===========================================

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', this.url(path));
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', this.url(path), body);
  }
}
