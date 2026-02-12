import { describe, it, expect } from 'vitest';
import { ToggleNode, ToggleSummaryNode, ToggleContentNode } from '../ToggleExtension';

describe('ToggleNode', () => {
  it('has name "toggle"', () => {
    expect(ToggleNode.name).toBe('toggle');
  });

  it('belongs to "block" group', () => {
    expect(ToggleNode.config.group).toBe('block');
  });

  it('expects "toggleSummary toggleContent" as content', () => {
    expect(ToggleNode.config.content).toBe('toggleSummary toggleContent');
  });

  it('is a defining node', () => {
    expect(ToggleNode.config.defining).toBe(true);
  });

  describe('parseHTML', () => {
    it('matches <details> tag', () => {
      const rules =
        typeof ToggleNode.config.parseHTML === 'function'
          ? ToggleNode.config.parseHTML.call(ToggleNode)
          : [];
      expect(rules).toEqual([{ tag: 'details' }]);
    });
  });

  describe('renderHTML', () => {
    it('renders a <details> element with toggle-block class', () => {
      const renderHTML = ToggleNode.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(ToggleNode, {
        HTMLAttributes: {},
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[0]).toBe('details');
      expect(result[1]).toMatchObject({ class: 'toggle-block' });
      expect(result[2]).toBe(0);
    });
  });

  describe('commands', () => {
    it('exposes setToggle command', () => {
      const addCommands = ToggleNode.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(ToggleNode);
      expect(commands).toHaveProperty('setToggle');
      expect(typeof commands.setToggle).toBe('function');
    });

    it('exposes unsetToggle command', () => {
      const addCommands = ToggleNode.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(ToggleNode);
      expect(commands).toHaveProperty('unsetToggle');
      expect(typeof commands.unsetToggle).toBe('function');
    });

    it('setToggle calls insertContent with correct structure', () => {
      const addCommands = ToggleNode.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(ToggleNode);
      const commandFn = commands.setToggle();

      let insertedContent: unknown;
      const mockContext = {
        commands: {
          insertContent: (content: unknown) => {
            insertedContent = content;
            return true;
          },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      commandFn(mockContext as any);

      expect(insertedContent).toEqual({
        type: 'toggle',
        content: [
          {
            type: 'toggleSummary',
            content: [{ type: 'text', text: 'Toggle heading' }],
          },
          {
            type: 'toggleContent',
            content: [{ type: 'paragraph' }],
          },
        ],
      });
    });
  });

  describe('keyboard shortcuts', () => {
    it('registers Backspace shortcut', () => {
      const addKeyboardShortcuts = ToggleNode.config.addKeyboardShortcuts;
      if (typeof addKeyboardShortcuts !== 'function') {
        throw new Error('addKeyboardShortcuts not a function');
      }

      const shortcuts = addKeyboardShortcuts.call(ToggleNode);
      expect(shortcuts).toHaveProperty('Backspace');
      expect(typeof shortcuts.Backspace).toBe('function');
    });
  });
});

describe('ToggleSummaryNode', () => {
  it('has name "toggleSummary"', () => {
    expect(ToggleSummaryNode.name).toBe('toggleSummary');
  });

  it('accepts "inline*" as content', () => {
    expect(ToggleSummaryNode.config.content).toBe('inline*');
  });

  it('is a defining node', () => {
    expect(ToggleSummaryNode.config.defining).toBe(true);
  });

  describe('parseHTML', () => {
    it('matches <summary> tag', () => {
      const rules =
        typeof ToggleSummaryNode.config.parseHTML === 'function'
          ? ToggleSummaryNode.config.parseHTML.call(ToggleSummaryNode)
          : [];
      expect(rules).toEqual([{ tag: 'summary' }]);
    });
  });

  describe('renderHTML', () => {
    it('renders a <summary> element with toggle-summary class', () => {
      const renderHTML = ToggleSummaryNode.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(ToggleSummaryNode, {
        HTMLAttributes: {},
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[0]).toBe('summary');
      expect(result[1]).toMatchObject({ class: 'toggle-summary' });
      expect(result[2]).toBe(0);
    });
  });
});

describe('ToggleContentNode', () => {
  it('has name "toggleContent"', () => {
    expect(ToggleContentNode.name).toBe('toggleContent');
  });

  it('accepts "block+" as content', () => {
    expect(ToggleContentNode.config.content).toBe('block+');
  });

  it('is a defining node', () => {
    expect(ToggleContentNode.config.defining).toBe(true);
  });

  describe('parseHTML', () => {
    it('matches div[data-toggle-content]', () => {
      const rules =
        typeof ToggleContentNode.config.parseHTML === 'function'
          ? ToggleContentNode.config.parseHTML.call(ToggleContentNode)
          : [];
      expect(rules).toEqual([{ tag: 'div[data-toggle-content]' }]);
    });
  });

  describe('renderHTML', () => {
    it('renders a <div> with data-toggle-content and toggle-content class', () => {
      const renderHTML = ToggleContentNode.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(ToggleContentNode, {
        HTMLAttributes: {},
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[0]).toBe('div');
      expect(result[1]).toMatchObject({
        'data-toggle-content': '',
        class: 'toggle-content',
      });
      expect(result[2]).toBe(0);
    });
  });
});
