import { hash } from '@node-rs/argon2';
import { prisma } from '../../lib/prisma.js';
import type { User, Organization, SystemSettings } from '../../generated/prisma/client.js';

// Argon2 options for password hashing
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export interface SetupCheckResult {
  required: boolean;
  reason?: 'NO_SETTINGS' | 'SETUP_INCOMPLETE';
}

export interface SetupInput {
  admin: {
    email: string;
    password: string;
    name?: string;
  };
  organization: {
    name: string;
    slug: string;
  };
  siteName?: string;
}

export interface SetupResult {
  user: User;
  organization: Organization;
}

/**
 * Check if setup is required
 */
export async function checkSetupRequired(): Promise<SetupCheckResult> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });

  if (!settings) {
    return { required: true, reason: 'NO_SETTINGS' };
  }

  if (!settings.setupCompleted) {
    return { required: true, reason: 'SETUP_INCOMPLETE' };
  }

  return { required: false };
}

/**
 * Complete the initial setup
 */
export async function completeSetup(input: SetupInput): Promise<SetupResult> {
  // Hash password before transaction to avoid holding the lock during hashing
  const email = input.admin.email.toLowerCase().trim();
  const passwordHash = await hash(input.admin.password, ARGON2_OPTIONS);

  // Perform all checks and writes inside a serialisable transaction to prevent
  // TOCTOU race conditions — concurrent requests will be serialised.
  return prisma.$transaction(
    async (tx) => {
      // Check if setup already completed (inside transaction for atomicity)
      const settings = await tx.systemSettings.findUnique({
        where: { id: 'system' },
      });

      if (settings?.setupCompleted) {
        throw new Error('Setup has already been completed');
      }

      // Check if user with email exists
      const existingUser = await tx.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Create super admin user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: input.admin.name ?? null,
          isSuperAdmin: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: input.organization.name,
          slug: input.organization.slug.toLowerCase().trim(),
        },
      });

      // Add user as owner
      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      // Mark setup as complete
      const siteName = input.siteName ?? 'LibreDiary';
      await tx.systemSettings.upsert({
        where: { id: 'system' },
        create: {
          id: 'system',
          setupCompleted: true,
          setupCompletedAt: new Date(),
          setupCompletedBy: user.id,
          siteName,
        },
        update: {
          setupCompleted: true,
          setupCompletedAt: new Date(),
          setupCompletedBy: user.id,
          siteName,
        },
      });

      return { user, organization };
    },
    { isolationLevel: 'Serializable' }
  );
}

/**
 * Get system settings
 */
export async function getSystemSettings(): Promise<SystemSettings | null> {
  return prisma.systemSettings.findUnique({
    where: { id: 'system' },
  });
}
