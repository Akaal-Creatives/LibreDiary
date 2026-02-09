import { api } from './api';
import type { ApiToken, ApiTokenCreateResponse } from '@librediary/shared';

export interface CreateApiTokenInput {
  name: string;
  expiresAt?: string;
}

export const apiTokensService = {
  async listTokens(): Promise<{ tokens: ApiToken[] }> {
    return api.get<{ tokens: ApiToken[] }>('/api-tokens');
  },

  async createToken(input: CreateApiTokenInput): Promise<{ token: ApiTokenCreateResponse }> {
    return api.post<{ token: ApiTokenCreateResponse }>('/api-tokens', input);
  },

  async deleteToken(tokenId: string): Promise<void> {
    return api.delete('/api-tokens/' + tokenId);
  },
};
