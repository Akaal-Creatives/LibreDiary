import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockEnv } = vi.hoisted(() => {
  const mockPrismaSystemSettings = {
    findUnique: vi.fn(),
  };

  return {
    mockPrisma: {
      systemSettings: mockPrismaSystemSettings,
    },
    mockEnv: {
      OPENROUTER_API_KEY: undefined as string | undefined,
      OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',
      AI_DEFAULT_MODEL: 'openai/gpt-4o-mini',
    },
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../../config/env.js', () => ({
  env: mockEnv,
}));

import { getAiConfig, maskApiKey, chatCompletion, testConnection } from '../ai.service.js';

describe('AI Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockEnv.OPENROUTER_API_KEY = undefined;
    mockEnv.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    mockEnv.AI_DEFAULT_MODEL = 'openai/gpt-4o-mini';
  });

  // ===========================================
  // getAiConfig
  // ===========================================

  describe('getAiConfig', () => {
    it('should return DB values when settings exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-dbkey123456',
        openrouterModel: 'anthropic/claude-3-haiku',
      });

      const config = await getAiConfig();

      expect(config).toEqual({
        enabled: true,
        apiKey: 'sk-or-v1-dbkey123456',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'anthropic/claude-3-haiku',
      });
    });

    it('should fall back to env vars when DB values are absent', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: false,
        openrouterApiKey: null,
        openrouterModel: 'openai/gpt-4o-mini',
      });
      mockEnv.OPENROUTER_API_KEY = 'sk-or-v1-envkey789';

      const config = await getAiConfig();

      expect(config).toEqual({
        enabled: false,
        apiKey: 'sk-or-v1-envkey789',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
      });
    });

    it('should return disabled with null key when no settings exist', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue(null);

      const config = await getAiConfig();

      expect(config).toEqual({
        enabled: false,
        apiKey: null,
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
      });
    });

    it('should always use env for baseUrl', async () => {
      mockEnv.OPENROUTER_BASE_URL = 'https://custom.openrouter.example/api/v1';
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-test',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const config = await getAiConfig();

      expect(config.baseUrl).toBe('https://custom.openrouter.example/api/v1');
    });
  });

  // ===========================================
  // maskApiKey
  // ===========================================

  describe('maskApiKey', () => {
    it('should mask a normal length key showing last 4 characters', () => {
      expect(maskApiKey('sk-or-v1-abcdefghij1234')).toBe('****1234');
    });

    it('should return **** for short keys', () => {
      expect(maskApiKey('abc')).toBe('****');
    });

    it('should return **** for empty keys', () => {
      expect(maskApiKey('')).toBe('****');
    });

    it('should return **** for keys with exactly 4 characters', () => {
      expect(maskApiKey('abcd')).toBe('****');
    });

    it('should show last 4 chars for keys longer than 4', () => {
      expect(maskApiKey('12345')).toBe('****2345');
    });
  });

  // ===========================================
  // chatCompletion
  // ===========================================

  describe('chatCompletion', () => {
    it('should make correct fetch call with headers', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hello!' } }],
        }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const messages = [{ role: 'user' as const, content: 'Hi' }];
      await chatCompletion(messages);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-or-v1-testkey1234',
          }),
        })
      );

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]!;
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.model).toBe('openai/gpt-4o-mini');
      expect(body.messages).toEqual(messages);
    });

    it('should throw when AI is disabled', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: false,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      await expect(chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'AI is disabled'
      );
    });

    it('should throw when no API key is configured', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: null,
        openrouterModel: 'openai/gpt-4o-mini',
      });

      await expect(chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'No API key configured'
      );
    });

    it('should throw on non-2xx response', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      await expect(chatCompletion([{ role: 'user', content: 'Hi' }])).rejects.toThrow(
        'OpenRouter API error (401)'
      );
    });

    it('should return parsed result on success', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const expectedResult = {
        choices: [{ message: { role: 'assistant', content: 'Hello there!' } }],
      };
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(expectedResult),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await chatCompletion([{ role: 'user', content: 'Hi' }]);

      expect(result).toEqual(expectedResult);
    });

    it('should use custom model when provided in options', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ choices: [] }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      await chatCompletion([{ role: 'user', content: 'Hi' }], {
        model: 'anthropic/claude-3-haiku',
      });

      const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]!;
      const body = JSON.parse(callArgs[1]!.body as string);
      expect(body.model).toBe('anthropic/claude-3-haiku');
    });
  });

  // ===========================================
  // testConnection
  // ===========================================

  describe('testConnection', () => {
    it('should return success on successful completion', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { role: 'assistant', content: 'pong' } }],
          model: 'openai/gpt-4o-mini',
        }),
      };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as unknown as Response);

      const result = await testConnection();

      expect(result).toEqual({
        success: true,
        message: 'Connection successful',
        model: 'openai/gpt-4o-mini',
      });
    });

    it('should return failure when connection fails', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await testConnection();

      expect(result).toEqual({
        success: false,
        message: 'Network error',
      });
    });

    it('should return failure when no API key is set', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: true,
        openrouterApiKey: null,
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const result = await testConnection();

      expect(result).toEqual({
        success: false,
        message: 'No API key configured',
      });
    });

    it('should return failure when AI is disabled', async () => {
      mockPrisma.systemSettings.findUnique.mockResolvedValue({
        id: 'system',
        aiEnabled: false,
        openrouterApiKey: 'sk-or-v1-testkey1234',
        openrouterModel: 'openai/gpt-4o-mini',
      });

      const result = await testConnection();

      expect(result).toEqual({
        success: false,
        message: 'AI is disabled',
      });
    });
  });
});
