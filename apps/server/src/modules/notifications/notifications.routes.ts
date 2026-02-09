import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as notificationsService from './notifications.service.js';
import * as notificationPrefsService from './notifications.prefs.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';

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

const updatePreferencesSchema = z
  .object({
    emailMention: z.boolean().optional(),
    emailCommentReply: z.boolean().optional(),
    emailPageShared: z.boolean().optional(),
    emailCommentResolved: z.boolean().optional(),
    emailInvitation: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one preference must be provided',
  });

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface NotificationParams {
  notificationId: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  NOTIFICATION_NOT_FOUND: {
    status: 404,
    code: 'NOTIFICATION_NOT_FOUND',
    message: 'Notification not found',
  },
  USER_NOT_FOUND: {
    status: 404,
    code: 'USER_NOT_FOUND',
    message: 'User not found',
  },
};

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

    const notifications = await notificationsService.getNotifications(getAuthUser(request).id, {
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
    const count = await notificationsService.getUnreadCount(getAuthUser(request).id);

    return {
      success: true,
      data: { count },
    };
  });

  /**
   * GET /notifications/preferences
   * Get notification preferences for the authenticated user
   */
  fastify.get('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const preferences = await notificationPrefsService.getNotificationPreferences(
        getAuthUser(request).id
      );

      return {
        success: true,
        data: { preferences },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });

  /**
   * PATCH /notifications/preferences
   * Update notification preferences
   */
  fastify.patch('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const bodyResult = updatePreferencesSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid preferences',
          details: bodyResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const preferences = await notificationPrefsService.updateNotificationPreferences(
        getAuthUser(request).id,
        bodyResult.data
      );

      return {
        success: true,
        data: { preferences },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
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
        getAuthUser(request).id
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
          getAuthUser(request).id
        );

        return {
          success: true,
          data: { notification },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read
   */
  fastify.patch('/read-all', async (request: FastifyRequest, _reply: FastifyReply) => {
    const result = await notificationsService.markAllAsRead(getAuthUser(request).id);

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
          getAuthUser(request).id
        );

        return {
          success: true,
          data: { message: 'Notification deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );
}
