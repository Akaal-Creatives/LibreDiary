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
      keyParams: input.keyParams,
      recoveryEncryptedMasterKey: input.recoveryEncryptedMasterKey ?? undefined,
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
      recoveryEncryptedMasterKey: input.recoveryEncryptedMasterKey,
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
