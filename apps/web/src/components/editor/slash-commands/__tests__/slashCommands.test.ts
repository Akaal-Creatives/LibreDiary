import { describe, it, expect, vi } from 'vitest';
import { SLASH_COMMANDS, filterCommands } from '../slashCommands';

describe('SLASH_COMMANDS', () => {
  it('has 9 entries', () => {
    expect(SLASH_COMMANDS).toHaveLength(9);
  });

  it.each(SLASH_COMMANDS)('command "$id" has all required fields', (command) => {
    expect(command).toHaveProperty('id');
    expect(command).toHaveProperty('labelKey');
    expect(command).toHaveProperty('descriptionKey');
    expect(command).toHaveProperty('icon');
    expect(command).toHaveProperty('group');
    expect(command).toHaveProperty('keywords');
    expect(command).toHaveProperty('action');

    expect(typeof command.id).toBe('string');
    expect(typeof command.labelKey).toBe('string');
    expect(typeof command.descriptionKey).toBe('string');
    expect(typeof command.icon).toBe('string');
    expect(typeof command.group).toBe('string');
    expect(Array.isArray(command.keywords)).toBe(true);
    expect(typeof command.action).toBe('function');
  });

  it('contains the expected command IDs', () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(ids).toEqual([
      'paragraph',
      'heading1',
      'heading2',
      'heading3',
      'bulletList',
      'orderedList',
      'blockquote',
      'codeBlock',
      'divider',
    ]);
  });

  it('has correct groups assigned', () => {
    const groups = Object.fromEntries(SLASH_COMMANDS.map((c) => [c.id, c.group]));
    expect(groups.paragraph).toBe('basic');
    expect(groups.heading1).toBe('basic');
    expect(groups.bulletList).toBe('lists');
    expect(groups.orderedList).toBe('lists');
    expect(groups.blockquote).toBe('basic');
    expect(groups.codeBlock).toBe('basic');
    expect(groups.divider).toBe('basic');
  });

  it('has unique IDs for every command', () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every command has at least one keyword', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.keywords.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all labelKeys follow "slashCommands." convention', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.labelKey).toMatch(/^slashCommands\./);
    }
  });

  it('all descriptionKeys follow "slashCommands." convention', () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.descriptionKey).toMatch(/^slashCommands\./);
    }
  });

  it('only uses "basic" and "lists" as group values', () => {
    const validGroups = new Set(['basic', 'lists']);
    for (const cmd of SLASH_COMMANDS) {
      expect(validGroups.has(cmd.group)).toBe(true);
    }
  });
});

describe('filterCommands', () => {
  it('returns all commands when query is empty', () => {
    const result = filterCommands('');
    expect(result).toHaveLength(9);
  });

  it('filters by id match', () => {
    const result = filterCommands('heading1');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((c) => c.id === 'heading1')).toBe(true);
  });

  it('filters by keyword match', () => {
    const result = filterCommands('h1');
    expect(result.some((c) => c.id === 'heading1')).toBe(true);
  });

  it('is case-insensitive', () => {
    const result = filterCommands('HEADING');
    expect(result.some((c) => c.id === 'heading1')).toBe(true);
    expect(result.some((c) => c.id === 'heading2')).toBe(true);
    expect(result.some((c) => c.id === 'heading3')).toBe(true);
  });

  it('filters by resolved label when provided', () => {
    const labels: Record<string, string> = { paragraph: 'Text', heading1: 'Heading 1' };
    const result = filterCommands('text', labels);
    expect(result.some((c) => c.id === 'paragraph')).toBe(true);
  });

  it('returns empty array when no matches', () => {
    const result = filterCommands('nonexistentcommand');
    expect(result).toHaveLength(0);
  });

  it('matches partial id (e.g. "para" matches "paragraph")', () => {
    const result = filterCommands('para');
    expect(result.some((c) => c.id === 'paragraph')).toBe(true);
  });

  it('matches multi-word keywords (e.g. "horizontal" matches divider via "horizontal rule")', () => {
    const result = filterCommands('horizontal');
    expect(result.some((c) => c.id === 'divider')).toBe(true);
  });

  it('resolved label match is case-insensitive', () => {
    const labels: Record<string, string> = { paragraph: 'Text' };
    const result = filterCommands('TEXT', labels);
    expect(result.some((c) => c.id === 'paragraph')).toBe(true);
  });

  it('falls back to id/keyword match when resolved label is missing for a command', () => {
    const labels: Record<string, string> = { paragraph: 'Text' };
    const result = filterCommands('h1', labels);
    expect(result.some((c) => c.id === 'heading1')).toBe(true);
  });

  it('returns all commands for whitespace-only query', () => {
    const result = filterCommands('   ');
    expect(result).toHaveLength(0);
  });

  it('does not duplicate results when query matches both id and keyword', () => {
    const result = filterCommands('blockquote');
    const blockquoteMatches = result.filter((c) => c.id === 'blockquote');
    expect(blockquoteMatches).toHaveLength(1);
  });

  it('matches "list" keyword across both bullet and ordered list', () => {
    const result = filterCommands('list');
    expect(result.some((c) => c.id === 'bulletList')).toBe(true);
    expect(result.some((c) => c.id === 'orderedList')).toBe(true);
  });

  it('returns the original SLASH_COMMANDS array reference when query is empty', () => {
    const result = filterCommands('');
    expect(result).toBe(SLASH_COMMANDS);
  });
});

describe('command actions', () => {
  function createMockEditor() {
    const run = vi.fn();
    const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {};

    const createProxy = (): unknown =>
      new Proxy(
        {},
        {
          get(_target, prop) {
            if (prop === 'run') return run;
            if (!chainMethods[prop as string]) {
              chainMethods[prop as string] = vi.fn().mockReturnValue(createProxy());
            }
            return chainMethods[prop as string];
          },
        }
      );

    return {
      editor: {
        chain: vi.fn().mockReturnValue(createProxy()),
      },
      run,
      chainMethods,
    };
  }

  it('paragraph action calls setParagraph', () => {
    const { editor, run } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'paragraph')!;
    cmd.action(editor as any);
    expect(editor.chain).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('heading1 action calls setHeading with level 1', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'heading1')!;
    cmd.action(editor as any);
    expect(chainMethods['setHeading']).toHaveBeenCalledWith({ level: 1 });
    expect(run).toHaveBeenCalled();
  });

  it('heading2 action calls setHeading with level 2', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'heading2')!;
    cmd.action(editor as any);
    expect(chainMethods['setHeading']).toHaveBeenCalledWith({ level: 2 });
    expect(run).toHaveBeenCalled();
  });

  it('heading3 action calls setHeading with level 3', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'heading3')!;
    cmd.action(editor as any);
    expect(chainMethods['setHeading']).toHaveBeenCalledWith({ level: 3 });
    expect(run).toHaveBeenCalled();
  });

  it('bulletList action calls toggleBulletList', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'bulletList')!;
    cmd.action(editor as any);
    expect(chainMethods['toggleBulletList']).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('orderedList action calls toggleOrderedList', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'orderedList')!;
    cmd.action(editor as any);
    expect(chainMethods['toggleOrderedList']).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('blockquote action calls toggleBlockquote', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'blockquote')!;
    cmd.action(editor as any);
    expect(chainMethods['toggleBlockquote']).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('codeBlock action calls toggleCodeBlock', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'codeBlock')!;
    cmd.action(editor as any);
    expect(chainMethods['toggleCodeBlock']).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('divider action calls setHorizontalRule', () => {
    const { editor, run, chainMethods } = createMockEditor();
    const cmd = SLASH_COMMANDS.find((c) => c.id === 'divider')!;
    cmd.action(editor as any);
    expect(chainMethods['setHorizontalRule']).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });

  it('every action calls focus() in the chain', () => {
    for (const cmd of SLASH_COMMANDS) {
      const { editor, chainMethods } = createMockEditor();
      cmd.action(editor as any);
      expect(chainMethods['focus']).toHaveBeenCalled();
    }
  });

  it('every action calls chain() then run()', () => {
    for (const cmd of SLASH_COMMANDS) {
      const { editor, run } = createMockEditor();
      cmd.action(editor as any);
      expect(editor.chain).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenCalledTimes(1);
    }
  });
});
