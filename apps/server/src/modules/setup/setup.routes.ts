import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as setupService from './setup.service.js';

// Validation schemas
const setupCompleteSchema = z.object({
  admin: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1).max(255).optional(),
  }),
  organization: z.object({
    name: z.string().min(1, 'Organization name is required').max(255),
    slug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .max(63)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  }),
  siteName: z.string().min(1).max(255).optional(),
});

export async function setupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /setup/status
   * Check if setup is required
   */
  fastify.get('/status', async (_request: FastifyRequest, _reply: FastifyReply) => {
    const setupCheck = await setupService.checkSetupRequired();

    if (setupCheck.required) {
      return {
        success: true,
        data: {
          setupRequired: true,
          reason: setupCheck.reason,
        },
      };
    }

    const settings = await setupService.getSystemSettings();

    return {
      success: true,
      data: {
        setupRequired: false,
        siteName: settings?.siteName,
      },
    };
  });

  /**
   * POST /setup/complete
   * Complete initial setup
   */
  fastify.post('/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = setupCompleteSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await setupService.completeSetup(body.data);

      // Sanitize user (remove passwordHash)
      const { passwordHash: _passwordHash, ...sanitizedUser } = result.user as {
        passwordHash?: string;
        [key: string]: unknown;
      };

      return reply.status(201).send({
        success: true,
        data: {
          user: sanitizedUser,
          organization: result.organization,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Setup failed';
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SETUP_ERROR',
          message,
        },
      });
    }
  });
}
