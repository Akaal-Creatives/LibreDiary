import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../audit/audit.service.js';

const TOKEN_PREFIX_LENGTH = 8;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken(): string {
  return `ld_${randomBytes(32).toString('base64url')}`;
}

export async function createToken(userId: string, name: string, expiresAt?: string) {
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const tokenPrefix = rawToken.substring(0, TOKEN_PREFIX_LENGTH);

  const apiToken = await prisma.apiToken.create({
    data: {
      userId,
      name,
      tokenHash,
      tokenPrefix,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  logAudit({
    action: 'API_TOKEN_CREATED',
    userId,
    resourceType: 'api_token',
    resourceId: apiToken.id,
    metadata: { name },
  });

  return { rawToken, apiToken };
}

export async function listTokens(userId: string) {
  return prisma.apiToken.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      name: true,
      tokenPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function deleteToken(tokenId: string, userId: string) {
  const token = await prisma.apiToken.findFirst({
    where: { id: tokenId, userId },
  });

  if (!token) {
    throw new Error('Token not found');
  }

  await prisma.apiToken.delete({ where: { id: tokenId } });

  logAudit({
    action: 'API_TOKEN_DELETED',
    userId,
    resourceType: 'api_token',
    resourceId: tokenId,
    metadata: { name: token.name },
  });
}

export async function validateToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!apiToken) return null;

  // Check expiry
  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    return null;
  }

  // Check if user is soft-deleted
  if (apiToken.user.deletedAt) {
    return null;
  }

  // Touch lastUsedAt (fire-and-forget)
  prisma.apiToken
    .update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => console.error('[api-token] lastUsedAt update failed:', err));

  return {
    user: apiToken.user,
    apiTokenId: apiToken.id,
  };
}

export async function deleteExpiredTokens() {
  const result = await prisma.apiToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
}
