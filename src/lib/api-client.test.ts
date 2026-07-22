import { describe, expect, it, beforeEach, vi } from 'vitest';
import { apiClient } from './api-client';
import { tokenStorage } from './token';

describe('apiClient', () => {
  beforeEach(() => {
    tokenStorage.removeToken();
    vi.restoreAllMocks();
  });

  it('attaches the bearer token when a session token exists', async () => {
    tokenStorage.setToken('test-token', false);

    const handlers = apiClient.interceptors.request.handlers ?? [];
    const requestInterceptor = handlers[0]?.fulfilled;
    const config = await requestInterceptor?.({ headers: {} } as any);

    expect(config?.headers?.Authorization).toBe('Bearer test-token');
  });
});
