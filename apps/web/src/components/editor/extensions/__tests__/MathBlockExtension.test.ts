import { describe, it, expect } from 'vitest';
import { MathBlockExtension } from '../MathBlockExtension';

describe('MathBlockExtension', () => {
  it('has name "mathBlock"', () => {
    expect(MathBlockExtension.name).toBe('mathBlock');
  });

  it('belongs to "block" group', () => {
    expect(MathBlockExtension.config.group).toBe('block');
  });

  it('is an atom node', () => {
    expect(MathBlockExtension.config.atom).toBe(true);
  });

  it('is draggable', () => {
    expect(MathBlockExtension.config.draggable).toBe(true);
  });

  describe('attributes', () => {
    it('has a "latex" attribute with empty string default', () => {
      const addAttributes = MathBlockExtension.config.addAttributes;
      if (typeof addAttributes !== 'function') throw new Error('addAttributes not a function');
      const attrs = addAttributes.call(MathBlockExtension);
      expect(attrs).toHaveProperty('latex');
      expect(attrs.latex.default).toBe('');
    });
  });

  describe('parseHTML', () => {
    it('matches div[data-type="mathBlock"]', () => {
      const rules =
        typeof MathBlockExtension.config.parseHTML === 'function'
          ? MathBlockExtension.config.parseHTML.call(MathBlockExtension)
          : [];
      expect(rules).toEqual([{ tag: 'div[data-type="mathBlock"]' }]);
    });
  });

  describe('renderHTML', () => {
    it('renders a div with data-type="mathBlock"', () => {
      const renderHTML = MathBlockExtension.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(MathBlockExtension, {
        HTMLAttributes: {},
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[0]).toBe('div');
      expect(result[1]).toMatchObject({ 'data-type': 'mathBlock' });
    });
  });

  describe('commands', () => {
    it('exposes insertMathBlock command', () => {
      const addCommands = MathBlockExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(MathBlockExtension);
      expect(commands).toHaveProperty('insertMathBlock');
      expect(typeof commands.insertMathBlock).toBe('function');
    });
  });

  describe('nodeView', () => {
    it('has a node view factory', () => {
      expect(typeof MathBlockExtension.config.addNodeView).toBe('function');
    });
  });
});
