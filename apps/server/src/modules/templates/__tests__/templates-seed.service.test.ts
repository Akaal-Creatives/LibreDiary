import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    template: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };

  function resetMocks() {
    mockPrisma.template.findMany.mockReset();
    mockPrisma.template.create.mockReset();
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { seedBuiltInTemplates } from '../templates-seed.service.js';
import { BUILTIN_TEMPLATES } from '../builtin-templates.js';

describe('seedBuiltInTemplates', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('creates all built-in templates when none exist', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);
    mockPrisma.template.create.mockResolvedValue({ id: 'tpl-1' });

    const count = await seedBuiltInTemplates('org-1', 'user-1');

    expect(count).toBe(BUILTIN_TEMPLATES.length);
    expect(mockPrisma.template.create).toHaveBeenCalledTimes(BUILTIN_TEMPLATES.length);

    // Verify the first template was created with correct data
    const firstCall = mockPrisma.template.create.mock.calls[0][0];
    expect(firstCall.data.organizationId).toBe('org-1');
    expect(firstCall.data.createdById).toBe('user-1');
    expect(firstCall.data.isBuiltIn).toBe(true);
    expect(firstCall.data.name).toBe(BUILTIN_TEMPLATES[0].name);
    expect(firstCall.data.yjsState).toBeInstanceOf(Buffer);
    expect(firstCall.data.yjsState.length).toBeGreaterThan(0);
  });

  it('skips templates that already exist', async () => {
    mockPrisma.template.findMany.mockResolvedValue([
      { name: 'Meeting Notes' },
      { name: 'Team Wiki' },
    ]);
    mockPrisma.template.create.mockResolvedValue({ id: 'tpl-new' });

    const count = await seedBuiltInTemplates('org-1', 'user-1');

    // Should skip Meeting Notes and Team Wiki, create the rest
    expect(count).toBe(BUILTIN_TEMPLATES.length - 2);

    const createdNames = mockPrisma.template.create.mock.calls.map(
      (c: Array<{ data: { name: string } }>) => c[0].data.name
    );
    expect(createdNames).not.toContain('Meeting Notes');
    expect(createdNames).not.toContain('Team Wiki');
  });

  it('returns 0 when all templates already exist', async () => {
    mockPrisma.template.findMany.mockResolvedValue(
      BUILTIN_TEMPLATES.map((t) => ({ name: t.name }))
    );

    const count = await seedBuiltInTemplates('org-1', 'user-1');

    expect(count).toBe(0);
    expect(mockPrisma.template.create).not.toHaveBeenCalled();
  });

  it('queries for existing built-in templates by org', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);
    mockPrisma.template.create.mockResolvedValue({ id: 'tpl-1' });

    await seedBuiltInTemplates('org-abc', 'user-1');

    expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-abc',
        isBuiltIn: true,
      },
      select: { name: true },
    });
  });

  it('each created template has a valid yjsState buffer', async () => {
    mockPrisma.template.findMany.mockResolvedValue([]);
    mockPrisma.template.create.mockResolvedValue({ id: 'tpl-1' });

    await seedBuiltInTemplates('org-1', 'user-1');

    for (const call of mockPrisma.template.create.mock.calls) {
      const data = call[0].data;
      expect(data.yjsState).toBeInstanceOf(Buffer);
      expect(data.yjsState.length).toBeGreaterThan(10); // Non-trivial content
      expect(data.category).toBeTruthy();
      expect(data.icon).toBeTruthy();
      expect(data.description).toBeTruthy();
    }
  });
});
