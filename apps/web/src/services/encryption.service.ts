/**
 * Encryption API Service — client-side API calls for E2EE key management
 *
 * Communicates with server-side encryption endpoints to store/retrieve
 * encrypted key material. All crypto operations happen client-side.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { api } from './api';

// =============================================
// Types
// =============================================

export interface EncryptionSetupInput {
  publicKey: string;
  encryptedPrivateKey: string;
  keySalt: string;
  keyParams: { memoryLimit: number; opsLimit: number };
  recoveryEncryptedMasterKey?: Record<string, unknown>;
  recoverySalt?: string;
  recoveryKeyHash?: string;
}

export interface EncryptionStatus {
  isSetUp: boolean;
  publicKey?: string;
  keySalt?: string;
  keyParams?: { memoryLimit: number; opsLimit: number };
  hasRecoveryKey?: boolean;
  createdAt?: string;
}

export interface EncryptionData {
  publicKey: string;
  encryptedPrivateKey: string;
  keySalt: string;
  keyParams: { memoryLimit: number; opsLimit: number };
  recoveryEncryptedMasterKey?: Record<string, unknown>;
  recoverySalt?: string;
  recoveryKeyHash?: string;
}

export interface RecoveryUpdateInput {
  recoveryEncryptedMasterKey: Record<string, unknown>;
  recoverySalt: string;
  recoveryKeyHash: string;
}

export interface EnableWorkspaceInput {
  encryptedKey: string;
  nonce: string;
  sharedByPublicKey: string;
}

export interface WorkspaceKeyShare {
  id: string;
  organizationId: string;
  userId: string;
  encryptedKey: string;
  nonce: string;
  sharedByPublicKey: string;
}

export interface ShareKeyInput {
  targetUserId: string;
  encryptedKey: string;
  nonce: string;
  sharedByPublicKey: string;
}

export interface PendingMember {
  userId: string;
  email: string;
  name: string | null;
  publicKey: string | null;
  hasEncryptionSetup: boolean;
}

// =============================================
// Service
// =============================================

export const encryptionService = {
  /** Set up E2EE for the current user */
  setup(input: EncryptionSetupInput) {
    return api.post('/encryption/setup', input);
  },

  /** Get encryption status for current user */
  getStatus() {
    return api.get<EncryptionStatus>('/encryption/status');
  },

  /** Get full encryption data (for key derivation) */
  getData() {
    return api.get<EncryptionData>('/encryption/data');
  },

  /** Update recovery key data */
  updateRecovery(input: RecoveryUpdateInput) {
    return api.post('/encryption/recovery', input);
  },

  /** Enable E2EE on a workspace */
  enableWorkspaceEncryption(orgId: string, input: EnableWorkspaceInput) {
    return api.post(`/encryption/workspace/${orgId}/enable`, input);
  },

  /** Get current user's key share for a workspace */
  getWorkspaceKeyShare(orgId: string) {
    return api.get<WorkspaceKeyShare>(`/encryption/workspace/${orgId}/key-share`);
  },

  /** Share workspace key with a collaborator */
  shareWorkspaceKey(orgId: string, input: ShareKeyInput) {
    return api.post(`/encryption/workspace/${orgId}/key-shares`, input);
  },

  /** List all key shares for a workspace */
  listWorkspaceKeyShares(orgId: string) {
    return api.get<WorkspaceKeyShare[]>(`/encryption/workspace/${orgId}/key-shares`);
  },

  /** Request to enable encryption (sends OTP if workspace has data) */
  requestEnableEncryption(orgId: string, workspaceName: string) {
    return api.post<{ requiresVerification: boolean }>(
      `/encryption/workspace/${orgId}/request-enable`,
      { workspaceName }
    );
  },

  /** Verify enable encryption OTP code */
  verifyEnableEncryption(orgId: string, code: string) {
    return api.post(`/encryption/workspace/${orgId}/verify-enable`, { code });
  },

  /** Request to disable encryption (always sends OTP) */
  requestDisableEncryption(orgId: string, workspaceName: string) {
    return api.post<{ requiresVerification: boolean }>(
      `/encryption/workspace/${orgId}/request-disable`,
      { workspaceName }
    );
  },

  /** Verify disable encryption OTP code */
  verifyDisableEncryption(orgId: string, code: string) {
    return api.post(`/encryption/workspace/${orgId}/verify-disable`, { code });
  },

  /** Disable workspace encryption (requires verified OTP) */
  disableWorkspaceEncryption(orgId: string) {
    return api.post(`/encryption/workspace/${orgId}/disable`);
  },

  /** Cancel disable and re-enable encryption during grace period */
  cancelDisableEncryption(orgId: string) {
    return api.post(`/encryption/workspace/${orgId}/cancel-disable`);
  },

  /** Get members who do not yet have a workspace key share */
  getPendingMembers(orgId: string) {
    return api.get<PendingMember[]>(`/encryption/workspace/${orgId}/pending-members`);
  },
};
