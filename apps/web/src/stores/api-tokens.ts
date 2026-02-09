import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ApiToken, ApiTokenCreateResponse } from '@librediary/shared';
import { apiTokensService } from '@/services/api-tokens.service';

export const useApiTokensStore = defineStore('api-tokens', () => {
  const tokens = ref<ApiToken[]>([]);
  const loading = ref(false);
  const creating = ref(false);
  const error = ref<string | null>(null);

  async function fetchTokens(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const data = await apiTokensService.listTokens();
      tokens.value = data.tokens;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tokens';
    } finally {
      loading.value = false;
    }
  }

  async function createToken(name: string, expiresAt?: string): Promise<ApiTokenCreateResponse> {
    creating.value = true;
    error.value = null;

    try {
      const data = await apiTokensService.createToken({ name, expiresAt });
      tokens.value.unshift(data.token);
      return data.token;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create token';
      throw err;
    } finally {
      creating.value = false;
    }
  }

  async function deleteToken(tokenId: string): Promise<void> {
    error.value = null;

    try {
      await apiTokensService.deleteToken(tokenId);
      tokens.value = tokens.value.filter((t) => t.id !== tokenId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete token';
      throw err;
    }
  }

  function reset(): void {
    tokens.value = [];
    loading.value = false;
    creating.value = false;
    error.value = null;
  }

  return {
    tokens,
    loading,
    creating,
    error,
    fetchTokens,
    createToken,
    deleteToken,
    reset,
  };
});
