import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';

describe('Error Handler Plugin', () => {
  // Test the error handler logic directly with mock request/reply
  function createMockRequest(overrides: Record<string, unknown> = {}) {
    return {
      method: 'GET',
      url: '/test',
      log: { error: vi.fn() },
      ...overrides,
    } as any;
  }

  function createMockReply() {
    const reply: any = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    return reply;
  }

  // Extract the handler functions for direct testing
  let errorHandler: (error: any, request: any, reply: any) => any;
  let notFoundHandler: (request: any, reply: any) => any;

  beforeEach(async () => {
    // Create a mock fastify instance that captures the handlers
    const mockFastify: any = {
      setErrorHandler: vi.fn((fn: any) => {
        errorHandler = fn;
      }),
      setNotFoundHandler: vi.fn((fn: any) => {
        notFoundHandler = fn;
      }),
    };

    // Import and register the plugin to capture handlers
    const { errorHandlerPlugin } = await import('../error-handler.js');
    await errorHandlerPlugin(mockFastify);
  });

  it('should handle ZodError with 400 and field errors', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_string',
        validation: 'email',
        message: 'Invalid email',
        path: ['email'],
      },
    ]);

    const request = createMockRequest();
    const reply = createMockReply();

    errorHandler(zodError, request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.any(Object),
        }),
      })
    );
  });

  it('should handle errors with statusCode using their code and message', () => {
    const error = {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Not allowed',
    };

    const request = createMockRequest();
    const reply = createMockReply();

    errorHandler(error, request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not allowed',
      },
    });
  });

  it('should default code to ERROR when statusCode error has no code', () => {
    const error = {
      statusCode: 400,
      message: 'Bad request',
    };

    const request = createMockRequest();
    const reply = createMockReply();

    errorHandler(error, request, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'ERROR' }),
      })
    );
  });

  it('should handle unexpected errors with 500', () => {
    const error = new Error('Something broke');

    const request = createMockRequest();
    const reply = createMockReply();

    errorHandler(error, request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
        }),
      })
    );
    expect(request.log.error).toHaveBeenCalledWith(error);
  });

  it('should return 404 with route info for unknown routes', () => {
    const request = createMockRequest({
      method: 'GET',
      url: '/non-existent-route',
    });
    const reply = createMockReply();

    notFoundHandler(request, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /non-existent-route not found',
      },
    });
  });
});
