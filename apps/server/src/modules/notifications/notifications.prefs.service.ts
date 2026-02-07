import { prisma } from '../../lib/prisma.js';
import type { NotificationType } from '../../generated/prisma/client.js';

// ===========================================
// TYPES
// ===========================================

export interface NotificationPreferences {
  emailMention: boolean;
  emailCommentReply: boolean;
  emailPageShared: boolean;
  emailCommentResolved: boolean;
  emailInvitation: boolean;
}

export interface UpdateNotificationPreferencesInput {
  emailMention?: boolean;
  emailCommentReply?: boolean;
  emailPageShared?: boolean;
  emailCommentResolved?: boolean;
  emailInvitation?: boolean;
}

// Map notification types to preference keys
const NOTIFICATION_TYPE_TO_PREF_KEY: Record<NotificationType, keyof NotificationPreferences> = {
  MENTION: 'emailMention',
  COMMENT_REPLY: 'emailCommentReply',
  PAGE_SHARED: 'emailPageShared',
  COMMENT_RESOLVED: 'emailCommentResolved',
  INVITATION: 'emailInvitation',
};

// Default preferences (all enabled)
const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailMention: true,
  emailCommentReply: true,
  emailPageShared: true,
  emailCommentResolved: true,
  emailInvitation: true,
};

// ===========================================
// SERVICE FUNCTIONS
// ===========================================

/**
 * Get notification preferences for a user
 * Returns defaults for any preferences not explicitly set
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const storedPrefs = (user.notificationPrefs as Partial<NotificationPreferences>) || {};

  // Merge with defaults
  return {
    ...DEFAULT_PREFERENCES,
    ...storedPrefs,
  };
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: UpdateNotificationPreferencesInput
): Promise<NotificationPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const storedPrefs = (user.notificationPrefs as Partial<NotificationPreferences>) || {};

  // Merge existing prefs with updates
  const newPrefs = {
    ...storedPrefs,
    ...updates,
  };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { notificationPrefs: newPrefs },
    select: { notificationPrefs: true },
  });

  const updatedPrefs = (updated.notificationPrefs as Partial<NotificationPreferences>) || {};

  // Return merged with defaults
  return {
    ...DEFAULT_PREFERENCES,
    ...updatedPrefs,
  };
}

/**
 * Check if email should be sent for a specific notification type
 * Returns false if user not found or preference is disabled
 */
export async function shouldSendEmail(
  userId: string,
  notificationType: NotificationType
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });

  if (!user) {
    return false;
  }

  const storedPrefs = (user.notificationPrefs as Partial<NotificationPreferences>) || {};
  const prefKey = NOTIFICATION_TYPE_TO_PREF_KEY[notificationType];

  // Return stored value if set, otherwise default to true (enabled)
  return storedPrefs[prefKey] ?? true;
}
