import * as fs from 'node:fs';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

/** Grace period in days before permanent deletion */
const DELETION_GRACE_PERIOD_DAYS = 30;

/** Sentinel value used to replace user references on anonymised content */
const DELETED_USER_NAME = 'Deleted User';

/**
 * Request account deletion (soft delete with 30-day grace period).
 * Sets deletedAt and deletionRequestedAt on the user.
 */
export async function requestAccountDeletion(userId: string): Promise<{ deletionDate: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.deletedAt) throw new Error('ACCOUNT_ALREADY_DELETED');

  // Check if user is the sole owner of any organisation
  const ownedOrgs = await prisma.organizationMember.findMany({
    where: { userId, role: 'OWNER' },
    include: {
      organization: {
        include: {
          members: { where: { role: 'OWNER' } },
        },
      },
    },
  });

  const soleOwnerOrgs = ownedOrgs.filter((m) => m.organization.members.length === 1);
  if (soleOwnerOrgs.length > 0) {
    const orgNames = soleOwnerOrgs.map((m) => m.organization.name);
    throw new Error(`SOLE_OWNER:${orgNames.join(',')}`);
  }

  const now = new Date();
  const deletionDate = new Date(now.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: now,
      deletionRequestedAt: now,
    },
  });

  return { deletionDate };
}

/**
 * Cancel a pending account deletion during the grace period.
 */
export async function cancelAccountDeletion(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) throw new Error('USER_NOT_FOUND');
  if (!user.deletedAt || !user.deletionRequestedAt) {
    throw new Error('NO_PENDING_DELETION');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: null,
      deletionRequestedAt: null,
    },
  });
}

/**
 * Get the deletion status for a user.
 */
export async function getDeletionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true, deletionRequestedAt: true },
  });

  if (!user) return null;

  if (!user.deletionRequestedAt) {
    return { pending: false };
  }

  const deletionDate = new Date(
    user.deletionRequestedAt.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  );

  return {
    pending: true,
    requestedAt: user.deletionRequestedAt,
    scheduledDeletionDate: deletionDate,
    daysRemaining: Math.max(
      0,
      Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    ),
  };
}

/**
 * Permanently delete accounts whose grace period has expired.
 * Called by the scheduler.
 */
export async function processScheduledDeletions(): Promise<number> {
  const cutoff = new Date(Date.now() - DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const usersToDelete = await prisma.user.findMany({
    where: {
      deletionRequestedAt: { lte: cutoff },
      deletedAt: { not: null },
    },
  });

  let deletedCount = 0;

  for (const user of usersToDelete) {
    try {
      await permanentlyDeleteUser(user.id);
      deletedCount++;
    } catch (error) {
      logger.error(error, 'failed to permanently delete user %s', user.id);
    }
  }

  return deletedCount;
}

/**
 * Permanently delete a user — anonymise shared content, delete personal data.
 */
export async function permanentlyDeleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  // Delete data export archives from disk
  const exports = await prisma.dataExport.findMany({
    where: { userId },
  });
  for (const exp of exports) {
    if (exp.storagePath && fs.existsSync(exp.storagePath)) {
      fs.unlinkSync(exp.storagePath);
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Anonymise content that belongs to organisations (keep content, remove user identity)
    await tx.page.updateMany({
      where: { createdById: userId },
      data: { createdById: userId }, // Keep as-is; the user row will be anonymised below
    });

    // 2. Anonymise comments — set createdById to a sentinel (handled via user anonymisation)
    // Comments will still reference the user ID, but the user record will be anonymised

    // 3. Remove user from all organisations
    await tx.organizationMember.deleteMany({ where: { userId } });

    // 4. Delete personal data that cascades (sessions, accounts, favourites,
    //    mentions, notifications, api tokens, page permissions for this user)
    // These cascade automatically when the user is deleted, but since we're
    // anonymising instead, we delete them explicitly:
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.mention.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.apiToken.deleteMany({ where: { userId } });
    await tx.pagePermission.deleteMany({ where: { userId } });
    await tx.dataExport.deleteMany({ where: { userId } });

    // 5. Nullify invites sent by the user (keep the invite for audit trail)
    // Invites don't cascade — they reference invitedById without onDelete
    // We can't set to null because it's required, so we leave them
    // (they reference a user ID that will be anonymised)

    // 6. Anonymise the user record — remove PII but keep the row so
    //    references from pages, comments, etc. remain valid
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.librediary.local`,
        name: DELETED_USER_NAME,
        passwordHash: null,
        avatarUrl: null,
        emailVerified: false,
        emailVerifiedAt: null,
        notificationPrefs: '{}',
        isSuperAdmin: false,
        deletedAt: user.deletedAt ?? new Date(),
        deletionRequestedAt: user.deletionRequestedAt ?? new Date(),
      },
    });
  });
}
