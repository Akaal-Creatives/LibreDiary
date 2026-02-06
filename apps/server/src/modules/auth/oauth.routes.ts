import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as oauthService from './oauth.service.js';
import { requireAuth, setSessionCookie, getClientIp } from './auth.middleware.js';
import { EXPIRATION } from '../../utils/tokens.js';
import { env } from '../../config/env.js';
import type { OAuthProvider } from './oauth.service.js';

// Supported providers
const SUPPORTED_PROVIDERS = ['github', 'google'] as const;

// Request schemas
const providerParamSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS),
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

// Store for OAuth state validation (in production, use Redis or database)
const oauthStateStore = new Map<string, { codeVerifier?: string; timestamp: number }>();

// Cleanup old state entries periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of oauthStateStore.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) {
        // 10 minutes
        oauthStateStore.delete(key);
      }
    }
  },
  5 * 60 * 1000
); // Every 5 minutes

export async function oauthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /oauth/providers
   * Get list of configured OAuth providers
   */
  fastify.get('/providers', async (_request: FastifyRequest, _reply: FastifyReply) => {
    return {
      success: true,
      providers: oauthService.getConfiguredProviders(),
    };
  });

  /**
   * GET /oauth/:provider
   * Initiate OAuth flow - returns authorization URL
   */
  fastify.get('/:provider', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = providerParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Unsupported OAuth provider',
        },
      });
    }

    const provider = params.data.provider as OAuthProvider;

    if (!oauthService.isProviderConfigured(provider)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PROVIDER_NOT_CONFIGURED',
          message: `${provider} OAuth is not configured`,
        },
      });
    }

    try {
      const result = await oauthService.getAuthorizationUrl(provider);

      // Store state for validation in callback
      oauthStateStore.set(result.state, {
        codeVerifier: result.codeVerifier,
        timestamp: Date.now(),
      });

      return {
        success: true,
        url: result.url,
        state: result.state,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate authorization URL';
      return reply.status(500).send({
        success: false,
        error: {
          code: 'OAUTH_ERROR',
          message,
        },
      });
    }
  });

  /**
   * GET /oauth/:provider/callback
   * Handle OAuth callback - login or create user, then redirect
   */
  fastify.get('/:provider/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const params = providerParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Unsupported OAuth provider',
        },
      });
    }

    const query = callbackQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_CALLBACK',
          message: 'Missing code or state parameter',
          details: query.error.flatten().fieldErrors,
        },
      });
    }

    const provider = params.data.provider as OAuthProvider;
    const { code, state } = query.data;

    // Validate state
    const storedState = oauthStateStore.get(state);
    if (!storedState) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Invalid or expired OAuth state',
        },
      });
    }

    // Remove used state
    oauthStateStore.delete(state);

    try {
      const result = await oauthService.handleOAuthCallback({
        provider,
        code,
        state,
        codeVerifier: storedState.codeVerifier,
        meta: {
          userAgent: request.headers['user-agent'],
          ipAddress: getClientIp(request),
        },
      });

      // Set session cookie
      setSessionCookie(reply, result.session.token, EXPIRATION.SESSION);

      // Determine redirect URL
      const frontendUrl = env.APP_URL.replace(':3000', ':5173'); // Adjust port for dev
      const redirectUrl = result.isNewUser ? `${frontendUrl}/onboarding` : `${frontendUrl}/`;

      return reply.status(302).redirect(redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OAuth authentication failed';

      // Redirect to login page with error
      const frontendUrl = env.APP_URL.replace(':3000', ':5173');
      return reply
        .status(302)
        .redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }
  });

  /**
   * GET /oauth/accounts
   * Get linked OAuth accounts for current user (authenticated)
   */
  fastify.get(
    '/accounts',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const userId = request.user!.id;
      const accounts = await oauthService.getUserLinkedAccounts(userId);

      return {
        success: true,
        accounts: accounts.map((acc) => ({
          id: acc.id,
          provider: acc.provider,
          createdAt: acc.createdAt,
        })),
      };
    }
  );

  /**
   * GET /oauth/:provider/link
   * Initiate OAuth linking for existing user (authenticated)
   */
  fastify.get(
    '/:provider/link',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = providerParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PROVIDER',
            message: 'Unsupported OAuth provider',
          },
        });
      }

      const provider = params.data.provider as OAuthProvider;

      if (!oauthService.isProviderConfigured(provider)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'PROVIDER_NOT_CONFIGURED',
            message: `${provider} OAuth is not configured`,
          },
        });
      }

      try {
        const result = await oauthService.getAuthorizationUrl(provider);

        // Store state with user ID for linking
        oauthStateStore.set(result.state, {
          codeVerifier: result.codeVerifier,
          timestamp: Date.now(),
        });

        return {
          success: true,
          url: result.url,
          state: result.state,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to generate authorization URL';
        return reply.status(500).send({
          success: false,
          error: {
            code: 'OAUTH_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * DELETE /oauth/:provider/unlink
   * Unlink OAuth account from current user (authenticated)
   */
  fastify.delete(
    '/:provider/unlink',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = providerParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PROVIDER',
            message: 'Unsupported OAuth provider',
          },
        });
      }

      const provider = params.data.provider as OAuthProvider;
      const userId = request.user!.id;

      try {
        await oauthService.unlinkOAuthAccount({
          userId,
          provider,
        });

        return {
          success: true,
          message: `${provider} account unlinked successfully`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to unlink account';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UNLINK_ERROR',
            message,
          },
        });
      }
    }
  );
}
