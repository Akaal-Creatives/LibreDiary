import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockChatCompletion, mockGetAiConfig } = vi.hoisted(() => {
  return {
    mockPrisma: {
      organization: { findUnique: vi.fn() },
      database: { create: vi.fn(), findFirst: vi.fn() },
      databaseProperty: { create: vi.fn(), findMany: vi.fn() },
    },
    mockChatCompletion: vi.fn(),
    mockGetAiConfig: vi.fn(),
  };
});

vi.mock('../../../lib/prisma.js', () => ({ prisma: mockPrisma }));

vi.mock('../ai.service.js', () => ({
  chatCompletion: mockChatCompletion,
  getAiConfig: mockGetAiConfig,
}));

vi.mock('../../databases/databases.service.js', () => ({
  createDatabase: vi.fn(),
  createProperty: vi.fn(),
}));

import { generateDatabaseSchema } from '../database-creation.service.js';

const defaultConfig = {
  enabled: true,
  apiKey: 'key',
  model: 'gpt-4o-mini',
  baseUrl: 'https://openrouter.ai/api/v1',
};

describe('generateDatabaseSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAiConfig.mockResolvedValue(defaultConfig);
  });

  it('parses a valid AI response into a schema', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: 'Project Tracker',
              properties: [
                { name: 'Name', type: 'TEXT' },
                {
                  name: 'Status',
                  type: 'SELECT',
                  config: { options: [{ label: 'Todo' }, { label: 'Done' }] },
                },
                { name: 'Due Date', type: 'DATE' },
              ],
            }),
          },
        },
      ],
    });

    const schema = await generateDatabaseSchema('a project tracker');

    expect(schema.name).toBe('Project Tracker');
    expect(schema.properties).toHaveLength(3);
    expect(schema.properties[1].type).toBe('SELECT');
    expect(schema.properties[1].config).toEqual({
      options: [{ label: 'Todo' }, { label: 'Done' }],
    });
  });

  it('filters out unsupported property types', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: 'Test',
              properties: [
                { name: 'Name', type: 'TEXT' },
                { name: 'Relation', type: 'RELATION' },
                { name: 'Formula', type: 'FORMULA' },
              ],
            }),
          },
        },
      ],
    });

    const schema = await generateDatabaseSchema('test');

    const validTypes = [
      'TEXT',
      'NUMBER',
      'SELECT',
      'MULTI_SELECT',
      'DATE',
      'CHECKBOX',
      'URL',
      'EMAIL',
      'PHONE',
    ];
    expect(schema.properties.every((p) => validTypes.includes(p.type))).toBe(true);
    expect(schema.properties).toHaveLength(1);
  });

  it('falls back to a single TEXT property if AI returns no valid properties', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ name: 'Empty', properties: [] }) } }],
    });

    const schema = await generateDatabaseSchema('empty');

    expect(schema.properties).toHaveLength(1);
    expect(schema.properties[0].type).toBe('TEXT');
    expect(schema.properties[0].name).toBe('Name');
  });

  it('truncates name to 200 chars and property names to 100 chars', async () => {
    const longName = 'A'.repeat(300);
    const longPropName = 'B'.repeat(150);

    mockChatCompletion.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: longName,
              properties: [{ name: longPropName, type: 'TEXT' }],
            }),
          },
        },
      ],
    });

    const schema = await generateDatabaseSchema('test');

    expect(schema.name).toHaveLength(200);
    expect(schema.properties[0].name).toHaveLength(100);
  });

  it('throws if AI returns invalid JSON', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: 'not json at all' } }],
    });

    await expect(generateDatabaseSchema('test')).rejects.toThrow();
  });

  it('limits properties to 20', async () => {
    const manyProps = Array.from({ length: 25 }, (_, i) => ({ name: `Col ${i}`, type: 'TEXT' }));

    mockChatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ name: 'Big', properties: manyProps }) } }],
    });

    const schema = await generateDatabaseSchema('big database');

    expect(schema.properties.length).toBeLessThanOrEqual(20);
  });
});
