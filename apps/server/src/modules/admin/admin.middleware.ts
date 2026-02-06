import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware that requires super admin access
 * Must be used after requireAuth middleware
 */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // User must be authenticated (requireAuth should be called before this)
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  // Check if user is a super admin and not deleted
  if (!request.user.isSuperAdmin || request.user.deletedAt) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Super admin access required',
      },
    });
  }
}
