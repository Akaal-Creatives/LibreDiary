import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as notificationsService from './notifications.service.js';
import { requireAuth } from '../auth/auth.middleware.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const getNotificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface NotificationParams {
  notificationId: string;
}

// ===========================================
// ERROR RESPONSE HELPER
// ===========================================

function mapServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorMap: Record<string, { status: number; code: string; message: string }> = {
    NOTIFICATION_NOT_FOUND: {
      status: 404,
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification not found',
    },
  };

  const errorInfo = errorMap[message] || {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  return reply.status(errorInfo.status).send({
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
    },
  });
}

// ===========================================
// NOTIFICATION ROUTES
// ===========================================

export default async function notificationsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  /**
   * GET /notifications
   * Get notifications for the authenticated user
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryResult = getNotificationsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten().fieldErrors,
        },
      });
    }

    const { limit, offset, unreadOnly } = queryResult.data;

    const notifications = await notificationsService.getNotifications(request.user!.id, {
      limit,
      offset,
      unreadOnly,
    });

    return {
      success: true,
      data: { notifications },
    };
  });

  /**
   * GET /notifications/unread-count
   * Get count of unread notifications
   */
  fastify.get('/unread-count', async (request: FastifyRequest, _reply: FastifyReply) => {
    const count = await notificationsService.getUnreadCount(request.user!.id);

    return {
      success: true,
      data: { count },
    };
  });

  /**
   * GET /notifications/:notificationId
   * Get a specific notification
   */
  fastify.get<{ Params: NotificationParams }>(
    '/:notificationId',
    async (request: FastifyRequest<{ Params: NotificationParams }>, reply: FastifyReply) => {
      const notification = await notificationsService.getNotificationById(
        request.params.notificationId,
        request.user!.id
      );

      if (!notification) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found',
          },
        });
      }

      return {
        success: true,
        data: { notification },
      };
    }
  );

  /**
   * PATCH /notifications/:notificationId/read
   * Mark a notification as read
   */
  fastify.patch<{ Params: NotificationParams }>(
    '/:notificationId/read',
    async (request: FastifyRequest<{ Params: NotificationParams }>, reply: FastifyReply) => {
      try {
        const notification = await notificationsService.markAsRead(
          request.params.notificationId,
          request.user!.id
        );

        return {
          success: true,
          data: { notification },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read
   */
  fastify.patch('/read-all', async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = await notificationsService.markAllAsRead(request.user!.id);

    return {
      success: true,
      data: { count: result.count },
    };
  });

  /**
   * DELETE /notifications/:notificationId
   * Delete a notification
   */
  fastify.delete<{ Params: NotificationParams }>(
    '/:notificationId',
    async (request: FastifyRequest<{ Params: NotificationParams }>, reply: FastifyReply) => {
      try {
        await notificationsService.deleteNotification(
          request.params.notificationId,
          request.user!.id
        );

        return {
          success: true,
          data: { message: 'Notification deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}
