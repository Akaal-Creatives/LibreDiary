import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockChatCompletion } = vi.hoisted(() => {
  return {
    mockPrisma: {
      organization: {
        findUnique: vi.fn(),
      },
    },
    mockChatCompletion: vi.fn(),
  };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../ai.service.js', () => ({
  chatCompletion: mockChatCompletion,
}));

import { translateText } from '../translation.service.js';

describe('Translation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    text: 'Hello, world!',
    targetLanguage: 'Spanish',
    organizationId: 'org-123',
  };

  // ===========================================
  // Successful translation
  // ===========================================

  it('should call chatCompletion with correct system prompt and user message', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Hola, mundo!' } }],
    });

    await translateText(validInput);

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Spanish'),
        }),
        expect.objectContaining({
          role: 'user',
          content: 'Hello, world!',
        }),
      ]),
      { temperature: 0.3 }
    );
  });

  it('should extract translated text from response choices[0].message.content', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: '  Hola, mundo!  ' } }],
    });

    const result = await translateText(validInput);

    expect(result.translatedText).toBe('Hola, mundo!');
  });

  it('should use temperature 0.3 for deterministic output', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Bonjour' } }],
    });

    await translateText({ ...validInput, targetLanguage: 'French' });

    expect(mockChatCompletion).toHaveBeenCalledWith(expect.any(Array), { temperature: 0.3 });
  });

  // ===========================================
  // Error cases
  // ===========================================

  it('should throw AI_DISABLED when org aiEnabled is false', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: false });

    await expect(translateText(validInput)).rejects.toThrow('AI_DISABLED');
  });

  it('should throw AI_DISABLED when org not found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(translateText(validInput)).rejects.toThrow('AI_DISABLED');
  });

  it('should propagate "AI is disabled" from chatCompletion', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('AI is disabled'));

    await expect(translateText(validInput)).rejects.toThrow('AI is disabled');
  });

  it('should propagate "No API key configured" from chatCompletion', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('No API key configured'));

    await expect(translateText(validInput)).rejects.toThrow('No API key configured');
  });

  it('should throw TRANSLATION_FAILED when response has no choices', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({ choices: [] });

    await expect(translateText(validInput)).rejects.toThrow('TRANSLATION_FAILED');
  });

  it('should throw TRANSLATION_FAILED when response has empty content', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
    });

    await expect(translateText(validInput)).rejects.toThrow('TRANSLATION_FAILED');
  });

  it('should throw TRANSLATION_FAILED when chatCompletion throws unexpected error', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('OpenRouter API error (500): Server error'));

    await expect(translateText(validInput)).rejects.toThrow('TRANSLATION_FAILED');
  });
});
