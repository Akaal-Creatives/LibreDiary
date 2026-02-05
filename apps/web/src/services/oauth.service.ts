import { api } from './api';
import type { OAuthProvider, LinkedAccount } from '@librediary/shared';

interface OAuthUrlResponse {
  url: string;
  state: string;
}

interface ProvidersResponse {
  providers: OAuthProvider[];
}

interface LinkedAccountsResponse {
  accounts: LinkedAccount[];
}

/**
 * Get list of configured OAuth providers
 */
export async function getConfiguredProviders(): Promise<OAuthProvider[]> {
  const response = await api.get<ProvidersResponse>('/oauth/providers');
  return response.providers;
}

/**
 * Initiate OAuth flow - redirects to provider
 */
export async function initiateOAuth(provider: OAuthProvider): Promise<void> {
  const response = await api.get<OAuthUrlResponse>(`/oauth/${provider}`);
  // Redirect to OAuth provider
  window.location.href = response.url;
}

/**
 * Initiate OAuth linking for existing user
 */
export async function initiateOAuthLink(provider: OAuthProvider): Promise<void> {
  const response = await api.get<OAuthUrlResponse>(`/oauth/${provider}/link`);
  // Redirect to OAuth provider
  window.location.href = response.url;
}

/**
 * Get linked OAuth accounts for current user
 */
export async function getLinkedAccounts(): Promise<LinkedAccount[]> {
  const response = await api.get<LinkedAccountsResponse>('/oauth/accounts');
  return response.accounts;
}

/**
 * Unlink an OAuth account
 */
export async function unlinkAccount(provider: OAuthProvider): Promise<void> {
  await api.delete(`/oauth/${provider}/unlink`);
}
