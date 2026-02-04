import type { FastifyInstance, FastifyError } from 'fastify';
import { ZodError } from 'zod';
import type { ApiResponse } from '@librediary/shared';

export async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    const { log } = request;

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.flatten().fieldErrors,
        },
      };

      return reply.status(400).send(response);
    }

    // Handle known Fastify errors
    if (error.statusCode) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: error.code ?? 'ERROR',
          message: error.message,
        },
      };

      return reply.status(error.statusCode).send(response);
    }

    // Log unexpected errors
    log.error(error);

    // Generic error response
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message:
          process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
      },
    };

    return reply.status(500).send(response);
  });

  // Handle not found routes
  fastify.setNotFoundHandler((request, reply) => {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    };

    return reply.status(404).send(response);
  });
}
