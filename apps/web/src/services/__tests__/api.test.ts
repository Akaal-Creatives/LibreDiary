import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to create a mock fetch response
function mockFetchResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe('api module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    global.fetch = vi.fn();
  });

  async function loadApi() {
    const mod = await import('../api');
    return mod;
  }

  // ===========================================
  // HTTP METHODS
  // ===========================================

  describe('api.get', () => {
    it('should call fetch with correct URL and GET method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { items: [] } })
      );

      const { api } = await loadApi();
      await api.get('/test/endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test/endpoint',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });
  });

  describe('api.post', () => {
    it('should call fetch with POST method and JSON body', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { id: '1' } })
      );

      const { api } = await loadApi();
      await api.post('/test/endpoint', { name: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test/endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });
  });

  describe('api.put', () => {
    it('should call fetch with PUT method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { id: '1' } })
      );

      const { api } = await loadApi();
      await api.put('/test/endpoint', { name: 'updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test/endpoint',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'updated' }),
        })
      );
    });
  });

  describe('api.patch', () => {
    it('should call fetch with PATCH method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { id: '1' } })
      );

      const { api } = await loadApi();
      await api.patch('/test/endpoint', { name: 'patched' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test/endpoint',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'patched' }),
        })
      );
    });
  });

  describe('api.delete', () => {
    it('should call fetch with DELETE method', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { message: 'deleted' } })
      );

      const { api } = await loadApi();
      await api.delete('/test/endpoint');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test/endpoint',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      );
    });
  });

  // ===========================================
  // RESPONSE HANDLING
  // ===========================================

  describe('successful response', () => {
    it('should return data.data from the response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: { users: [{ id: '1' }] } })
      );

      const { api } = await loadApi();
      const result = await api.get('/users');

      expect(result).toEqual({ users: [{ id: '1' }] });
    });
  });

  // ===========================================
  // ERROR HANDLING
  // ===========================================

  describe('error response', () => {
    it('should throw ApiError with code and message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
        })
      );

      const { api, ApiError } = await loadApi();

      await expect(api.get('/missing')).rejects.toThrow(ApiError);
      await expect(api.get('/missing')).rejects.toThrow('Resource not found');
    });

    it('should include details when present in error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: { field: 'email', reason: 'required' },
          },
        })
      );

      const { api, ApiError } = await loadApi();

      try {
        await api.get('/validate');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as InstanceType<typeof ApiError>;
        expect(apiErr.code).toBe('VALIDATION_ERROR');
        expect(apiErr.message).toBe('Invalid input');
        expect(apiErr.details).toEqual({ field: 'email', reason: 'required' });
      }
    });

    it('should default to UNKNOWN_ERROR when error code is missing', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: false })
      );

      const { api, ApiError } = await loadApi();

      try {
        await api.get('/unknown');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as InstanceType<typeof ApiError>;
        expect(apiErr.code).toBe('UNKNOWN_ERROR');
        expect(apiErr.message).toBe('An unexpected error occurred');
      }
    });
  });

  // ===========================================
  // HEADERS & CREDENTIALS
  // ===========================================

  describe('Content-Type header', () => {
    it('should not set Content-Type header when no body is sent (GET)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: {} })
      );

      const { api } = await loadApi();
      await api.get('/endpoint');

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const config = callArgs[1];
      expect(config.headers).not.toHaveProperty('Content-Type');
    });

    it('should not set Content-Type header when no body is sent (DELETE)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: {} })
      );

      const { api } = await loadApi();
      await api.delete('/endpoint');

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const config = callArgs[1];
      expect(config.headers).not.toHaveProperty('Content-Type');
    });

    it('should set Content-Type to application/json when body is provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: {} })
      );

      const { api } = await loadApi();
      await api.post('/endpoint', { key: 'value' });

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const config = callArgs[1];
      expect(config.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('credentials', () => {
    it('should always include credentials: include', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        mockFetchResponse({ success: true, data: {} })
      );

      const { api } = await loadApi();
      await api.get('/endpoint');

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const config = callArgs[1];
      expect(config.credentials).toBe('include');
    });
  });

  // ===========================================
  // ApiError CLASS
  // ===========================================

  describe('ApiError', () => {
    it('should have correct name property', async () => {
      const { ApiError } = await loadApi();
      const error = new ApiError('TEST_CODE', 'Test message');
      expect(error.name).toBe('ApiError');
    });

    it('should be an instance of Error', async () => {
      const { ApiError } = await loadApi();
      const error = new ApiError('TEST_CODE', 'Test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should store code, message, and details', async () => {
      const { ApiError } = await loadApi();
      const details = { field: 'name' };
      const error = new ApiError('VALIDATION', 'Bad input', details);
      expect(error.code).toBe('VALIDATION');
      expect(error.message).toBe('Bad input');
      expect(error.details).toEqual({ field: 'name' });
    });
  });
});
