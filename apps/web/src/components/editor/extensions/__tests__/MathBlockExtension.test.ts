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

    it('preserves latex attribute in rendered HTML', () => {
      const renderHTML = MathBlockExtension.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(MathBlockExtension, {
        HTMLAttributes: { latex: 'E = mc^2' },
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[1]).toMatchObject({ 'data-type': 'mathBlock', latex: 'E = mc^2' });
    });
  });

  describe('markdown serialisation', () => {
    it('exposes markdown serialize in storage', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);
      expect(typeof storage.markdown.serialize).toBe('function');
    });

    it('serialises latex to $$ fenced block', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);

      const lines: string[] = [];
      let blockClosed = false;
      const mockState = {
        write: (s: string) => lines.push(s),
        text: (s: string) => lines.push(s),
        ensureNewLine: () => lines.push('\n'),
        closeBlock: () => {
          blockClosed = true;
        },
      };
      const mockNode = { attrs: { latex: '\\frac{a}{b}' } };

      storage.markdown.serialize(mockState, mockNode);

      const output = lines.join('');
      expect(output).toContain('$$');
      expect(output).toContain('\\frac{a}{b}');
      expect(blockClosed).toBe(true);
    });

    it('serialises empty latex gracefully', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);

      const lines: string[] = [];
      const mockState = {
        write: (s: string) => lines.push(s),
        text: (s: string) => lines.push(s),
        ensureNewLine: () => lines.push('\n'),
        closeBlock: () => {},
      };
      const mockNode = { attrs: { latex: '' } };

      storage.markdown.serialize(mockState, mockNode);

      const output = lines.join('');
      expect(output).toContain('$$');
    });
  });

  describe('markdown parsing', () => {
    it('has parse setup that registers a block rule', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);

      let ruleRegistered = false;
      let rendererSet = false;
      const mockMarkdownIt = {
        block: {
          ruler: {
            before: (_anchor: string, name: string) => {
              expect(name).toBe('math_block');
              ruleRegistered = true;
            },
          },
        },
        renderer: {
          rules: new Proxy(
            {},
            {
              set: (_target, prop) => {
                if (prop === 'math_block') rendererSet = true;
                return true;
              },
            }
          ),
        },
      };

      storage.markdown.parse.setup(mockMarkdownIt);
      expect(ruleRegistered).toBe(true);
      expect(rendererSet).toBe(true);
    });

    it('renderer outputs div with data-type and latex attributes', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);

      // Capture the renderer rule
      let renderFn: any;
      const mockMarkdownIt = {
        block: { ruler: { before: () => {} } },
        renderer: {
          rules: new Proxy(
            {},
            {
              set: (_target, prop, value) => {
                if (prop === 'math_block') renderFn = value;
                return true;
              },
            }
          ),
        },
      };

      storage.markdown.parse.setup(mockMarkdownIt);

      // Simulate a token with LaTeX content
      const tokens = [
        {
          content: 'x^2 + y^2 = z^2',
          attrGet: (name: string) => {
            if (name === 'latex') return 'x^2 + y^2 = z^2';
            return null;
          },
        },
      ];

      const html = renderFn(tokens, 0);
      expect(html).toContain('data-type="mathBlock"');
      expect(html).toContain('x^2 + y^2 = z^2');
    });

    it('escapes double quotes in latex attribute', () => {
      const addStorage = MathBlockExtension.config.addStorage;
      if (typeof addStorage !== 'function') throw new Error('addStorage not a function');
      const storage = addStorage.call(MathBlockExtension);

      let renderFn: any;
      const mockMarkdownIt = {
        block: { ruler: { before: () => {} } },
        renderer: {
          rules: new Proxy(
            {},
            {
              set: (_target, prop, value) => {
                if (prop === 'math_block') renderFn = value;
                return true;
              },
            }
          ),
        },
      };

      storage.markdown.parse.setup(mockMarkdownIt);

      const latexWithQuotes = 'f("x") = "y"';
      const tokens = [
        {
          content: latexWithQuotes,
          attrGet: (name: string) => {
            if (name === 'latex') return latexWithQuotes;
            return null;
          },
        },
      ];

      const html = renderFn(tokens, 0);
      expect(html).not.toContain('latex="f("x")');
      expect(html).toContain('&quot;');
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
