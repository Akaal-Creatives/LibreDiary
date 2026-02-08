import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockValidateToken, mockRequireAuth } = vi.hoisted(() => ({
  mockValidateToken: vi.fn(),
  mockRequireAuth: vi.fn(),
}));

vi.mock('../api-token.service.js', () => ({
  validateToken: mockValidateToken,
}));

vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: mockRequireAuth,
}));

import { requireApiAuth } from '../api-token.middleware.js';

function createMockRequest(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
    cookies: {},
    user: undefined as unknown,
    apiTokenId: undefined as string | undefined,
  } as Parameters<typeof requireApiAuth>[0];
}

function createMockReply() {
  const reply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  return reply as unknown as Parameters<typeof requireApiAuth>[1];
}

describe('API Token Middleware — requireApiAuth', () => {
  beforeEach(() => {
    mockValidateToken.mockReset();
    mockRequireAuth.mockReset();
  });

  it('should authenticate with a valid Bearer token', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockValidateToken.mockResolvedValue({
      user: mockUser,
      apiTokenId: 'token-1',
    });

    const request = createMockRequest('Bearer ld_validtoken');
    const reply = createMockReply();

    await requireApiAuth(request, reply);

    expect(mockValidateToken).toHaveBeenCalledWith('ld_validtoken');
    expect(request.user).toEqual(mockUser);
    expect(request.apiTokenId).toBe('token-1');
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid Bearer token', async () => {
    mockValidateToken.mockResolvedValue(null);

    const request = createMockRequest('Bearer ld_invalid');
    const reply = createMockReply();

    await requireApiAuth(request, reply);

    expect(reply.status as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(401);
    expect(reply.send as ReturnType<typeof vi.fn>).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired API token',
      },
    });
  });

  it('should fall back to session auth when no Bearer header', async () => {
    const request = createMockRequest();
    const reply = createMockReply();

    await requireApiAuth(request, reply);

    expect(mockValidateToken).not.toHaveBeenCalled();
    expect(mockRequireAuth).toHaveBeenCalledWith(request, reply);
  });

  it('should fall back to session auth for non-Bearer authorization', async () => {
    const request = createMockRequest('Basic dXNlcjpwYXNz');
    const reply = createMockReply();

    await requireApiAuth(request, reply);

    expect(mockValidateToken).not.toHaveBeenCalled();
    expect(mockRequireAuth).toHaveBeenCalledWith(request, reply);
  });
});
