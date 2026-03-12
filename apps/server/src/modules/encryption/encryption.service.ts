/**
 * Encryption Service — server-side storage for E2EE key material
 *
 * The server NEVER has access to plaintext keys or content.
 * It stores encrypted key material that only the client can decrypt.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';

// =============================================
// Types
// =============================================

interface SetupEncryptionInput {
  userId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  keySalt: string;
  keyParams: Record<string, unknown>;
  recoveryEncryptedMasterKey?: Record<string, unknown>;
  recoverySalt?: string;
  recoveryKeyHash?: string;
}

interface EnableWorkspaceEncryptionInput {
  organizationId: string;
  userId: string;
  encryptedKey: string;
  nonce: string;
  sharedByPublicKey: string;
}

interface ShareWorkspaceKeyInput {
  organizationId: string;
  targetUserId: string;
  encryptedKey: string;
  nonce: string;
  sharedByPublicKey: string;
}

interface UpdateRecoveryKeyInput {
  recoveryEncryptedMasterKey: Record<string, unknown>;
  recoverySalt: string;
  recoveryKeyHash: string;
}

interface CreateEncryptionChangeRequestInput {
  organizationId: string;
  requestedById: string;
  type: 'ENABLE' | 'DISABLE';
  verificationCodeHash: string;
  verificationExpiresAt: Date;
}

interface VerifyEncryptionChangeRequestInput {
  organizationId: string;
  type: 'ENABLE' | 'DISABLE';
  codeHash: string;
}

interface DisableWorkspaceEncryptionInput {
  organizationId: string;
  userId: string;
}

interface CancelDisableEncryptionInput {
  organizationId: string;
  userId: string;
}

// =============================================
// User Encryption Setup
// =============================================

/**
 * Store encryption key material for a user.
 * Called once during initial E2EE setup.
 */
export async function setupEncryption(input: SetupEncryptionInput) {
  const existing = await prisma.userEncryption.findUnique({
    where: { userId: input.userId },
  });

  if (existing) {
    throw new Error('Encryption is already set up for this user');
  }

  return prisma.userEncryption.create({
    data: {
      userId: input.userId,
      publicKey: input.publicKey,
      encryptedPrivateKey: input.encryptedPrivateKey,
      keySalt: input.keySalt,
      keyParams: input.keyParams as Prisma.InputJsonValue,
      recoveryEncryptedMasterKey: (input.recoveryEncryptedMasterKey ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      recoverySalt: input.recoverySalt ?? undefined,
      recoveryKeyHash: input.recoveryKeyHash ?? undefined,
    },
  });
}

/**
 * Get encryption status for a user (public info only).
 */
export async function getEncryptionStatus(userId: string) {
  const record = await prisma.userEncryption.findUnique({
    where: { userId },
  });

  if (!record) {
    return { isSetUp: false };
  }

  return {
    isSetUp: true,
    publicKey: record.publicKey,
    keySalt: record.keySalt,
    keyParams: record.keyParams,
    hasRecoveryKey: record.recoveryKeyHash !== null,
    createdAt: record.createdAt,
  };
}

/**
 * Get full encryption data for a user (needed for key derivation on client).
 */
export async function getEncryptionData(userId: string) {
  return prisma.userEncryption.findUnique({
    where: { userId },
  });
}

/**
 * Update recovery key data (e.g. after generating a new recovery key).
 */
export async function updateRecoveryKey(userId: string, input: UpdateRecoveryKeyInput) {
  const existing = await prisma.userEncryption.findUnique({
    where: { userId },
  });

  if (!existing) {
    throw new Error('Encryption is not set up for this user');
  }

  return prisma.userEncryption.update({
    where: { userId },
    data: {
      recoveryEncryptedMasterKey: input.recoveryEncryptedMasterKey as Prisma.InputJsonValue,
      recoverySalt: input.recoverySalt,
      recoveryKeyHash: input.recoveryKeyHash,
    },
  });
}

// =============================================
// Workspace Encryption
// =============================================

/**
 * Enable E2EE on an organisation and store the owner's key share.
 */
export async function enableWorkspaceEncryption(input: EnableWorkspaceEncryptionInput) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!org) {
    throw new Error('Organisation not found');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new Error('Only owners and admins can enable encryption');
  }

  if (org.isEncrypted) {
    throw new Error('Workspace is already encrypted');
  }

  return prisma.$transaction(async (tx) => {
    const updatedOrg = await tx.organization.update({
      where: { id: input.organizationId },
      data: { isEncrypted: true },
    });

    await tx.workspaceKeyShare.upsert({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        encryptedKey: input.encryptedKey,
        nonce: input.nonce,
        sharedByPublicKey: input.sharedByPublicKey,
      },
      update: {
        encryptedKey: input.encryptedKey,
        nonce: input.nonce,
        sharedByPublicKey: input.sharedByPublicKey,
      },
    });

    return updatedOrg;
  });
}

/**
 * Share a workspace key with a collaborator.
 * The key is encrypted for the target user's X25519 public key.
 */
export async function shareWorkspaceKey(input: ShareWorkspaceKeyInput) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!org || !org.isEncrypted) {
    throw new Error('Workspace is not encrypted');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.targetUserId,
      },
    },
  });

  if (!membership) {
    throw new Error('Target user is not a member of this organisation');
  }

  return prisma.workspaceKeyShare.upsert({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.targetUserId,
      },
    },
    create: {
      organizationId: input.organizationId,
      userId: input.targetUserId,
      encryptedKey: input.encryptedKey,
      nonce: input.nonce,
      sharedByPublicKey: input.sharedByPublicKey,
    },
    update: {
      encryptedKey: input.encryptedKey,
      nonce: input.nonce,
      sharedByPublicKey: input.sharedByPublicKey,
    },
  });
}

/**
 * Get a user's key share for a workspace.
 */
export async function getWorkspaceKeyShare(organizationId: string, userId: string) {
  return prisma.workspaceKeyShare.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });
}

/**
 * List all key shares for a workspace.
 */
export async function listWorkspaceKeyShares(organizationId: string) {
  return prisma.workspaceKeyShare.findMany({
    where: { organizationId },
  });
}

// =============================================
// Workspace Data Check
// =============================================

/**
 * Check whether a workspace has any actual data (pages with content or databases with rows).
 */
export async function hasWorkspaceData(organizationId: string): Promise<boolean> {
  const pageCount = await prisma.page.count({
    where: {
      organizationId,
      OR: [{ htmlContent: { not: null } }, { yjsState: { not: null } }],
    },
  });

  if (pageCount > 0) return true;

  const databases = await prisma.database.findMany({
    where: { organizationId },
    select: { id: true },
  });

  if (databases.length === 0) return false;

  const rowCount = await prisma.databaseRow.count({
    where: {
      databaseId: { in: databases.map((db) => db.id) },
    },
  });

  return rowCount > 0;
}

// =============================================
// Encryption Change Requests (OTP verification)
// =============================================

/**
 * Create a new encryption change request (enable/disable).
 * Cancels any existing pending requests for the same org+type.
 */
export async function createEncryptionChangeRequest(input: CreateEncryptionChangeRequestInput) {
  // Cancel any existing pending/verified requests for the same org+type
  await prisma.encryptionChangeRequest.updateMany({
    where: {
      organizationId: input.organizationId,
      type: input.type,
      status: { in: ['PENDING_VERIFICATION', 'VERIFIED'] },
    },
    data: { status: 'CANCELLED' },
  });

  return prisma.encryptionChangeRequest.create({
    data: {
      organizationId: input.organizationId,
      requestedById: input.requestedById,
      type: input.type,
      verificationCodeHash: input.verificationCodeHash,
      verificationExpiresAt: input.verificationExpiresAt,
    },
  });
}

/**
 * Verify an encryption change request using the hashed OTP code.
 */
export async function verifyEncryptionChangeRequest(input: VerifyEncryptionChangeRequestInput) {
  const request = await prisma.encryptionChangeRequest.findFirst({
    where: {
      organizationId: input.organizationId,
      type: input.type,
      status: 'PENDING_VERIFICATION',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!request) {
    throw new Error('No pending verification request found');
  }

  if (new Date() > request.verificationExpiresAt) {
    throw new Error('Verification code has expired');
  }

  if (request.verificationCodeHash !== input.codeHash) {
    throw new Error('Invalid verification code');
  }

  return prisma.encryptionChangeRequest.update({
    where: { id: request.id },
    data: { status: 'VERIFIED' },
  });
}

// =============================================
// Disable Workspace Encryption
// =============================================

/**
 * Disable E2EE on an organisation. Requires a verified DISABLE change request.
 * Sets a grace period — encrypted data is not purged immediately.
 */
export async function disableWorkspaceEncryption(input: DisableWorkspaceEncryptionInput) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!org) {
    throw new Error('Organisation not found');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new Error('Only owners and admins can disable encryption');
  }

  if (!org.isEncrypted) {
    throw new Error('Workspace is not encrypted');
  }

  // Require a verified disable request
  const verifiedRequest = await prisma.encryptionChangeRequest.findFirst({
    where: {
      organizationId: input.organizationId,
      type: 'DISABLE',
      status: 'VERIFIED',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verifiedRequest) {
    throw new Error('Verified disable request required');
  }

  return prisma.$transaction(async (tx) => {
    const updatedOrg = await tx.organization.update({
      where: { id: input.organizationId },
      data: {
        isEncrypted: false,
        encryptionDisabledAt: new Date(),
      },
    });

    await tx.encryptionChangeRequest.update({
      where: { id: verifiedRequest.id },
      data: {
        status: 'COMPLETED',
        scheduledPurgeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return updatedOrg;
  });
}

/**
 * Cancel a pending disable — re-enable encryption during grace period.
 */
export async function cancelDisableEncryption(input: CancelDisableEncryptionInput) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  if (!org) {
    throw new Error('Organisation not found');
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
  });

  if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
    throw new Error('Only owners and admins can manage encryption');
  }

  if (!org.encryptionDisabledAt) {
    throw new Error('Workspace is not in encryption grace period');
  }

  return prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      isEncrypted: true,
      encryptionDisabledAt: null,
    },
  });
}

// =============================================
// Data Purge (after grace period)
// =============================================

/**
 * Purge encrypted data after the 7-day grace period.
 * Deletes key shares and nulls out encrypted page content.
 */
/**
 * Get organisation members who do not have a workspace key share.
 * Used to identify members who need to be granted encryption access.
 */
export async function getMembersWithoutKeyShare(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isEncrypted: true },
  });

  if (!org || !org.isEncrypted) {
    throw new Error('Organisation is not encrypted');
  }

  // Get all members with their user info and encryption setup
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          encryption: {
            select: { publicKey: true },
          },
        },
      },
    },
  });

  // Get existing key shares for this workspace
  const keyShares = await prisma.workspaceKeyShare.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const usersWithShares = new Set(keyShares.map((ks) => ks.userId));

  // Return members without key shares
  return members
    .filter((m) => !usersWithShares.has(m.userId))
    .map((m) => ({
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      publicKey: m.user.encryption?.publicKey ?? null,
      hasEncryptionSetup: !!m.user.encryption,
    }));
}

export async function purgeEncryptedData(organizationId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.workspaceKeyShare.deleteMany({
      where: { organizationId },
    });

    await tx.page.updateMany({
      where: { organizationId },
      data: { htmlContent: null, plainContent: null, yjsState: null },
    });

    await tx.organization.update({
      where: { id: organizationId },
      data: { encryptionDisabledAt: null },
    });
  });
}
