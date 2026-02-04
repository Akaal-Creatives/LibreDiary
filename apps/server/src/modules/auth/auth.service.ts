import { hash, verify } from '@node-rs/argon2';
import { prisma } from '../../lib/prisma.js';
import {
  createSession,
  deleteSession,
  getUserSessions,
  deleteSessionByToken,
} from '../../services/session.service.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
} from '../../services/email.service.js';
import {
  generateVerificationToken,
  generateInviteToken,
  expiresIn,
  isExpired,
  EXPIRATION,
} from '../../utils/tokens.js';
import type { User, Session, Organization } from '@prisma/client';

// Argon2 options for password hashing
const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  inviteToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  session: Session;
  organizations: Organization[];
}

export interface InviteInput {
  email: string;
  organizationId: string;
  role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedById: string;
}

/**
 * Register a new user with an invite token
 */
export async function register(
  input: RegisterInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> {
  // Validate invite token
  const invite = await prisma.invite.findUnique({
    where: { token: input.inviteToken },
    include: { organization: true },
  });

  if (!invite) {
    throw new Error('Invalid invite token');
  }

  if (invite.acceptedAt) {
    throw new Error('Invite has already been used');
  }

  if (isExpired(invite.expiresAt)) {
    throw new Error('Invite has expired');
  }

  // Normalize email
  const email = input.email.toLowerCase().trim();

  // Check email matches invite
  if (invite.email.toLowerCase() !== email) {
    throw new Error('Email does not match invite');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await hash(input.password, ARGON2_OPTIONS);

  // Create user and accept invite in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: input.name ?? null,
        emailVerified: false,
      },
    });

    // Create organization membership
    await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });

    // Mark invite as accepted
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return user;
  });

  // Create session
  const session = await createSession({
    userId: result.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  // Send verification email
  const verificationToken = generateVerificationToken();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: verificationToken,
      type: 'EMAIL_VERIFICATION',
      expiresAt: expiresIn(EXPIRATION.EMAIL_VERIFICATION),
    },
  });
  await sendVerificationEmail(email, verificationToken, result.name);

  // Get organizations
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: result.id },
    include: { organization: true },
  });

  return {
    user: result,
    session,
    organizations: memberships.map((m) => m.organization),
  };
}

/**
 * Login with email and password
 */
export async function login(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    throw new Error('Invalid credentials');
  }

  if (user.deletedAt) {
    throw new Error('Account has been deleted');
  }

  // Verify password
  const validPassword = await verify(user.passwordHash, input.password, ARGON2_OPTIONS);
  if (!validPassword) {
    throw new Error('Invalid credentials');
  }

  // Create session
  const session = await createSession({
    userId: user.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  // Get organizations
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
  });

  return {
    user,
    session,
    organizations: memberships.map((m) => m.organization),
  };
}

/**
 * Logout - destroy session
 */
export async function logout(sessionToken: string): Promise<void> {
  await deleteSessionByToken(sessionToken);
}

/**
 * Get current user data
 */
export async function getCurrentUser(userId: string): Promise<{
  user: User;
  organizations: Organization[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
  });

  return {
    user,
    organizations: memberships.map((m) => m.organization),
  };
}

/**
 * Verify email address
 */
export async function verifyEmail(token: string): Promise<User> {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    throw new Error('Invalid verification token');
  }

  if (verificationToken.usedAt) {
    throw new Error('Token has already been used');
  }

  if (isExpired(verificationToken.expiresAt)) {
    throw new Error('Token has expired');
  }

  if (verificationToken.type !== 'EMAIL_VERIFICATION') {
    throw new Error('Invalid token type');
  }

  // Update user and mark token as used
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { email: verificationToken.identifier },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return user;
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email is already verified');
  }

  // Delete existing verification tokens
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: user.email,
      type: 'EMAIL_VERIFICATION',
    },
  });

  // Create new token
  const token = generateVerificationToken();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      type: 'EMAIL_VERIFICATION',
      expiresAt: expiresIn(EXPIRATION.EMAIL_VERIFICATION),
    },
  });

  await sendVerificationEmail(user.email, token, user.name);
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return;
  }

  // Delete existing reset tokens
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: normalizedEmail,
      type: 'PASSWORD_RESET',
    },
  });

  // Create new token
  const token = generateVerificationToken();
  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token,
      type: 'PASSWORD_RESET',
      expiresAt: expiresIn(EXPIRATION.PASSWORD_RESET),
    },
  });

  await sendPasswordResetEmail(normalizedEmail, token, user.name);
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const resetToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    throw new Error('Invalid reset token');
  }

  if (resetToken.usedAt) {
    throw new Error('Token has already been used');
  }

  if (isExpired(resetToken.expiresAt)) {
    throw new Error('Token has expired');
  }

  if (resetToken.type !== 'PASSWORD_RESET') {
    throw new Error('Invalid token type');
  }

  // Hash new password
  const passwordHash = await hash(newPassword, ARGON2_OPTIONS);

  // Update user and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { email: resetToken.identifier },
      data: { passwordHash },
    }),
    prisma.verificationToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);
}

/**
 * Get user's active sessions
 */
export async function getSessions(userId: string): Promise<Session[]> {
  return getUserSessions(userId);
}

/**
 * Revoke a session
 */
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId) {
    throw new Error('Session not found');
  }

  await deleteSession(sessionId);
}

/**
 * Create an invite
 */
export async function createInvite(input: InviteInput): Promise<string> {
  const email = input.email.toLowerCase().trim();

  // Check if user already exists in organization
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { organizationId: input.organizationId },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    throw new Error('User is already a member of this organization');
  }

  // Check for existing pending invite
  const existingInvite = await prisma.invite.findFirst({
    where: {
      email,
      organizationId: input.organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new Error('An invite has already been sent to this email');
  }

  // Get organization and inviter for email
  const [organization, inviter] = await Promise.all([
    prisma.organization.findUnique({ where: { id: input.organizationId } }),
    prisma.user.findUnique({ where: { id: input.invitedById } }),
  ]);

  if (!organization || !inviter) {
    throw new Error('Organization or inviter not found');
  }

  // Create invite
  const token = generateInviteToken();
  await prisma.invite.create({
    data: {
      email,
      token,
      organizationId: input.organizationId,
      role: input.role ?? 'MEMBER',
      invitedById: input.invitedById,
      expiresAt: expiresIn(EXPIRATION.INVITE),
    },
  });

  // Send invite email
  await sendInviteEmail(email, token, organization.name, inviter.name ?? inviter.email);

  return token;
}

/**
 * Get invite by token
 */
export async function getInviteByToken(token: string): Promise<{
  email: string;
  organization: Organization;
} | null> {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite) {
    return null;
  }

  if (invite.acceptedAt || isExpired(invite.expiresAt)) {
    return null;
  }

  return {
    email: invite.email,
    organization: invite.organization,
  };
}
