import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '../generated/prisma/client.js';

export interface ErrorMapping {
  status: number;
  code: string;
  message: string;
}

export type ErrorMap = Record<string, ErrorMapping>;

const DEFAULT_ERROR: ErrorMapping = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'An unexpected error occurred',
};

/**
 * Maps a service-layer error to a structured HTTP error response.
 *
 * Each route module provides its own `errorMap` that maps `Error.message`
 * strings to HTTP status codes and user-facing error details.
 * Unmapped errors fall back to 500 Internal Server Error.
 */
/**
 * Returns the authenticated user from the request.
 * Safe replacement for `request.user!` — throws if the auth
 * middleware has not run or did not attach a user.
 */
export function getAuthUser(request: FastifyRequest): User {
  if (!request.user) {
    throw new Error('UNAUTHORIZED');
  }
  return request.user;
}

export function mapServiceError(
  error: unknown,
  reply: FastifyReply,
  errorMap: ErrorMap
): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorInfo = errorMap[message] || DEFAULT_ERROR;

  return reply.status(errorInfo.status).send({
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
    },
  });
}
