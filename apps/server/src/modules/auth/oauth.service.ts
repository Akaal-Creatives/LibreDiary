import { GitHub, Google, generateState, generateCodeVerifier } from 'arctic';
import { prisma } from '../../lib/prisma.js';
import { createSession } from '../../services/session.service.js';
import { env } from '../../config/env.js';
import type { Session, User, Account } from '@prisma/client';

// Supported OAuth providers
export type OAuthProvider = 'github' | 'google';

// Provider display names
const PROVIDER_DISPLAY_NAMES: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
};

// OAuth user profile normalized across providers
export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

// Session metadata for creating sessions
interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

// OAuth callback result
export interface OAuthCallbackResult {
  user: User;
  session: Session;
  isNewUser: boolean;
}

// Create OAuth provider instances
function getGitHubProvider(): GitHub | null {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return null;
  }
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, null);
}

function getGoogleProvider(): Google | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return null;
  }
  const redirectUri = `${env.APP_URL}/api/v1/oauth/google/callback`;
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri);
}

/**
 * Generate an authorization URL for the specified OAuth provider
 */
export async function getAuthorizationUrl(
  provider: OAuthProvider
): Promise<{ url: string; state: string; codeVerifier?: string }> {
  const state = generateState();

  if (provider === 'github') {
    const github = getGitHubProvider();
    if (!github) {
      throw new Error('GitHub OAuth is not configured');
    }
    const url = github.createAuthorizationURL(state, ['user:email']);
    return { url: url.toString(), state };
  }

  if (provider === 'google') {
    const google = getGoogleProvider();
    if (!google) {
      throw new Error('Google OAuth is not configured');
    }
    const codeVerifier = generateCodeVerifier();
    const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);
    return { url: url.toString(), state, codeVerifier };
  }

  throw new Error('Unsupported OAuth provider');
}

/**
 * Handle OAuth callback - login or create user
 */
export async function handleOAuthCallback(params: {
  provider: OAuthProvider;
  code: string;
  state: string;
  codeVerifier?: string;
  meta: SessionMeta;
}): Promise<OAuthCallbackResult> {
  const { provider, code, codeVerifier, meta } = params;

  // Exchange code for tokens and get user profile
  const { tokens, profile } = await exchangeCodeForTokens(provider, code, codeVerifier);

  // Check if OAuth account is already linked
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.id,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    // User already has this OAuth account linked
    if (existingAccount.user.deletedAt) {
      throw new Error('Account has been deleted');
    }

    // Update tokens if needed
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        expiresAt: tokens.expiresAt ?? undefined,
      },
    });

    // Create session
    const session = await createSession({
      userId: existingAccount.userId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      user: existingAccount.user,
      session,
      isNewUser: false,
    };
  }

  // Check if user exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (existingUser) {
    if (existingUser.deletedAt) {
      throw new Error('Account has been deleted');
    }

    // Link OAuth account to existing user
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider,
        providerAccountId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    // Create session
    const session = await createSession({
      userId: existingUser.id,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    return {
      user: existingUser,
      session,
      isNewUser: false,
    };
  }

  // Create new user with OAuth account
  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: profile.email,
        emailVerified: true, // OAuth emails are considered verified
        emailVerifiedAt: new Date(),
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    await tx.account.create({
      data: {
        userId: newUser.id,
        provider,
        providerAccountId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    return newUser;
  });

  // Create session
  const session = await createSession({
    userId: result.id,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return {
    user: result,
    session,
    isNewUser: true,
  };
}

/**
 * Link an OAuth account to an existing user
 */
export async function linkOAuthAccount(params: {
  userId: string;
  provider: OAuthProvider;
  code: string;
  state: string;
  codeVerifier?: string;
}): Promise<Account> {
  const { userId, provider, code, codeVerifier } = params;

  // Exchange code for tokens and get user profile
  const { tokens, profile } = await exchangeCodeForTokens(provider, code, codeVerifier);

  // Check if this OAuth account is already linked to another user
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.id,
      },
    },
  });

  if (existingAccount && existingAccount.userId !== userId) {
    throw new Error('This account is already linked to another user');
  }

  // Check if user already has this provider linked
  const userExistingAccount = await prisma.account.findFirst({
    where: {
      userId,
      provider,
    },
  });

  if (userExistingAccount) {
    throw new Error(`You already have a ${PROVIDER_DISPLAY_NAMES[provider]} account linked`);
  }

  // Create the account link
  return prisma.account.create({
    data: {
      userId,
      provider,
      providerAccountId: profile.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  });
}

/**
 * Unlink an OAuth account from a user
 */
export async function unlinkOAuthAccount(params: {
  userId: string;
  provider: OAuthProvider;
}): Promise<void> {
  const { userId, provider } = params;

  // Find the account to unlink
  const account = await prisma.account.findFirst({
    where: { userId, provider },
  });

  if (!account) {
    throw new Error(`No ${PROVIDER_DISPLAY_NAMES[provider]} account linked`);
  }

  // Check if user has another login method
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      _count: {
        select: { accounts: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Can't unlink if it's the only login method
  const hasPassword = !!user.passwordHash;
  const accountCount = user._count.accounts;

  if (!hasPassword && accountCount <= 1) {
    throw new Error('Cannot unlink the only login method');
  }

  // Delete the account link
  await prisma.account.delete({
    where: { id: account.id },
  });
}

/**
 * Get all OAuth accounts linked to a user
 */
export async function getUserLinkedAccounts(
  userId: string
): Promise<Array<{ id: string; provider: string; providerAccountId: string; createdAt: Date }>> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return accounts;
}

/**
 * Get user profile from OAuth provider
 */
export async function getOAuthUserProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserProfile> {
  if (provider === 'github') {
    return fetchGitHubProfile(accessToken);
  }

  if (provider === 'google') {
    return fetchGoogleProfile(accessToken);
  }

  throw new Error('Unsupported OAuth provider');
}

/**
 * Check if an OAuth provider is configured
 */
export function isProviderConfigured(provider: OAuthProvider): boolean {
  if (provider === 'github') {
    return !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET;
  }
  if (provider === 'google') {
    return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  }
  return false;
}

/**
 * Get list of configured OAuth providers
 */
export function getConfiguredProviders(): OAuthProvider[] {
  const providers: OAuthProvider[] = [];
  if (isProviderConfigured('github')) providers.push('github');
  if (isProviderConfigured('google')) providers.push('google');
  return providers;
}

// ==========================================
// Private helper functions
// ==========================================

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  codeVerifier?: string
): Promise<{ tokens: OAuthTokens; profile: OAuthUserProfile }> {
  if (provider === 'github') {
    const github = getGitHubProvider();
    if (!github) {
      throw new Error('GitHub OAuth is not configured');
    }

    const tokens = await github.validateAuthorizationCode(code);
    const profile = await fetchGitHubProfile(tokens.accessToken());

    return {
      tokens: {
        accessToken: tokens.accessToken(),
      },
      profile,
    };
  }

  if (provider === 'google') {
    const google = getGoogleProvider();
    if (!google) {
      throw new Error('Google OAuth is not configured');
    }

    if (!codeVerifier) {
      throw new Error('Code verifier is required for Google OAuth');
    }

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const profile = await fetchGoogleProfile(tokens.accessToken());

    return {
      tokens: {
        accessToken: tokens.accessToken(),
        refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : undefined,
        expiresAt: tokens.accessTokenExpiresAt(),
      },
      profile,
    };
  }

  throw new Error('Unsupported OAuth provider');
}

async function fetchGitHubProfile(accessToken: string): Promise<OAuthUserProfile> {
  // Fetch user profile
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch GitHub user profile');
  }

  const userData = (await userResponse.json()) as {
    id: number;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
  };

  // If email is not public, fetch from emails endpoint
  let email = userData.email;
  if (!email) {
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primaryEmail = emails.find((e) => e.primary && e.verified);
      email = primaryEmail?.email ?? emails[0]?.email ?? null;
    }
  }

  if (!email) {
    throw new Error('Could not retrieve email from GitHub');
  }

  return {
    id: String(userData.id),
    email,
    name: userData.name,
    avatarUrl: userData.avatar_url,
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthUserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user profile');
  }

  const userData = (await response.json()) as {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  };

  if (!userData.email) {
    throw new Error('Could not retrieve email from Google');
  }

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name ?? null,
    avatarUrl: userData.picture ?? null,
  };
}
