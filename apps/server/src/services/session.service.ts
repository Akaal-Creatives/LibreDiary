import { prisma } from '../lib/prisma.js';
import { generateSessionToken, expiresIn, isExpired, EXPIRATION } from '../utils/tokens.js';
import type { Session, User } from '@prisma/client';

export interface CreateSessionOptions {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionWithUser extends Session {
  user: User;
}

/**
 * Create a new session for a user
 */
export async function createSession(options: CreateSessionOptions): Promise<Session> {
  const token = generateSessionToken();

  const session = await prisma.session.create({
    data: {
      userId: options.userId,
      token,
      userAgent: options.userAgent ?? null,
      ipAddress: options.ipAddress ?? null,
      expiresAt: expiresIn(EXPIRATION.SESSION),
    },
  });

  return session;
}

/**
 * Get session by token with user data
 */
export async function getSessionByToken(token: string): Promise<SessionWithUser | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (isExpired(session.expiresAt)) {
    await deleteSession(session.id);
    return null;
  }

  return session;
}

/**
 * Update session's last active timestamp
 */
export async function touchSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActiveAt: new Date() },
  });
}

/**
 * Delete a session by ID
 */
export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session
    .delete({
      where: { id: sessionId },
    })
    .catch(() => {
      // Session may already be deleted
    });
}

/**
 * Delete a session by token
 */
export async function deleteSessionByToken(token: string): Promise<void> {
  await prisma.session
    .delete({
      where: { token },
    })
    .catch(() => {
      // Session may already be deleted
    });
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<Session[]> {
  return prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastActiveAt: 'desc' },
  });
}

/**
 * Delete all sessions for a user (logout everywhere)
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

/**
 * Delete all sessions for a user except the current one
 */
export async function deleteOtherUserSessions(
  userId: string,
  currentSessionId: string
): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId },
    },
  });
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}
