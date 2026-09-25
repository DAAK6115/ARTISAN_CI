import { authSnapshot } from '../features/auth/auth.store';
import { env } from '../lib/env';
import type { BrowserRefreshResponse } from '../types/auth';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

let refreshPromise: Promise<string | null> | null = null;

function isJson(response: Response): boolean {
  return response.headers.get('content-type')?.includes('application/json') ?? false;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  if (isJson(response)) return response.json().catch(() => null);
  return response.text().catch(() => null);
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['error', 'detail', 'message']) {
      if (typeof record[key] === 'string' && record[key]) return record[key];
    }
  }
  return fallback;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = fetch(`${env.apiBaseUrl}/accounts/session/refresh/`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })
    .then(async (response) => {
      const body = await parseBody(response);
      if (!response.ok) return null;
      const data = body as BrowserRefreshResponse;
      if (!data?.access) return null;
      authSnapshot().setAccessToken(data.access);
      return data.access;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    body,
    auth = true,
    retryOnUnauthorized = true,
    headers,
    ...requestInit
  } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const access = authSnapshot().accessToken;
    if (access) requestHeaders.set('Authorization', `Bearer ${access}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...requestInit,
    credentials: 'include',
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body)
  });

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      return apiRequest<T>(path, {
        ...options,
        retryOnUnauthorized: false
      });
    }
    authSnapshot().setAnonymous();
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(
      extractMessage(payload, 'Une erreur est survenue. Réessayez.'),
      response.status,
      payload
    );
  }

  return payload as T;
}

export async function bootstrapAccessToken(): Promise<string | null> {
  return refreshAccessToken();
}
