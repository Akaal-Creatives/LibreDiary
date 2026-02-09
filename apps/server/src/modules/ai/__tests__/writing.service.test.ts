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

import { writeText } from '../writing.service.js';

describe('Writing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput = {
    action: 'expand' as const,
    text: 'Hello, world!',
    organizationId: 'org-123',
  };

  // ===========================================
  // Successful writing — system prompt per action
  // ===========================================

  it('should call chatCompletion with correct system prompt for generate action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Generated content' } }],
    });

    await writeText({ ...validInput, action: 'generate' });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Generate'),
        }),
        expect.objectContaining({
          role: 'user',
          content: 'Hello, world!',
        }),
      ]),
      { temperature: 0.7 }
    );
  });

  it('should call chatCompletion with correct system prompt for expand action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Expanded content' } }],
    });

    await writeText({ ...validInput, action: 'expand' });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Expand'),
        }),
      ]),
      { temperature: 0.3 }
    );
  });

  it('should call chatCompletion with correct system prompt for summarise action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Summary' } }],
    });

    await writeText({ ...validInput, action: 'summarise' });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Summarise'),
        }),
      ]),
      { temperature: 0.3 }
    );
  });

  it('should call chatCompletion with correct system prompt for improve action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Improved content' } }],
    });

    await writeText({ ...validInput, action: 'improve' });

    expect(mockChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Improve'),
        }),
      ]),
      { temperature: 0.3 }
    );
  });

  // ===========================================
  // Content extraction
  // ===========================================

  it('should extract content from choices[0].message.content and trim whitespace', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: '  Expanded text  ' } }],
    });

    const result = await writeText(validInput);

    expect(result.content).toBe('Expanded text');
  });

  // ===========================================
  // Temperature per action
  // ===========================================

  it('should use temperature 0.7 for generate action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Content' } }],
    });

    await writeText({ ...validInput, action: 'generate' });

    expect(mockChatCompletion).toHaveBeenCalledWith(expect.any(Array), { temperature: 0.7 });
  });

  it('should use temperature 0.3 for expand action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Content' } }],
    });

    await writeText({ ...validInput, action: 'expand' });

    expect(mockChatCompletion).toHaveBeenCalledWith(expect.any(Array), { temperature: 0.3 });
  });

  it('should use temperature 0.3 for summarise action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Content' } }],
    });

    await writeText({ ...validInput, action: 'summarise' });

    expect(mockChatCompletion).toHaveBeenCalledWith(expect.any(Array), { temperature: 0.3 });
  });

  it('should use temperature 0.3 for improve action', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Content' } }],
    });

    await writeText({ ...validInput, action: 'improve' });

    expect(mockChatCompletion).toHaveBeenCalledWith(expect.any(Array), { temperature: 0.3 });
  });

  // ===========================================
  // Prisma query verification
  // ===========================================

  it('should query prisma with correct where and select args', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Content' } }],
    });

    await writeText(validInput);

    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 'org-123' },
      select: { aiEnabled: true },
    });
  });

  // ===========================================
  // Error cases — AI_DISABLED
  // ===========================================

  it('should throw AI_DISABLED when org aiEnabled is false', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: false });

    await expect(writeText(validInput)).rejects.toThrow('AI_DISABLED');
  });

  it('should throw AI_DISABLED when org not found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(writeText(validInput)).rejects.toThrow('AI_DISABLED');
  });

  // ===========================================
  // Propagated errors from chatCompletion
  // ===========================================

  it('should propagate "AI is disabled" from chatCompletion', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('AI is disabled'));

    await expect(writeText(validInput)).rejects.toThrow('AI is disabled');
  });

  it('should propagate "No API key configured" from chatCompletion', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('No API key configured'));

    await expect(writeText(validInput)).rejects.toThrow('No API key configured');
  });

  // ===========================================
  // WRITING_FAILED errors
  // ===========================================

  it('should throw WRITING_FAILED when response has no choices', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({ choices: [] });

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });

  it('should throw WRITING_FAILED when response has empty content', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: '   ' } }],
    });

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });

  it('should throw WRITING_FAILED when response has undefined choices', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({});

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });

  it('should throw WRITING_FAILED when message content is null', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });

  it('should throw WRITING_FAILED when chatCompletion throws unexpected error', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue(new Error('OpenRouter API error (500): Server error'));

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });

  it('should throw WRITING_FAILED when chatCompletion throws a non-Error value', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ aiEnabled: true });
    mockChatCompletion.mockRejectedValue('string error');

    await expect(writeText(validInput)).rejects.toThrow('WRITING_FAILED');
  });
});
