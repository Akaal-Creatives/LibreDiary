import { describe, it, expect } from 'vitest';
import { CalloutExtension } from '../CalloutExtension';

describe('CalloutExtension', () => {
  it('has name "callout"', () => {
    expect(CalloutExtension.name).toBe('callout');
  });

  it('belongs to "block" group', () => {
    expect(CalloutExtension.config.group).toBe('block');
  });

  it('accepts "block+" as content', () => {
    expect(CalloutExtension.config.content).toBe('block+');
  });

  it('is a defining node', () => {
    expect(CalloutExtension.config.defining).toBe(true);
  });

  describe('attributes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attributes: any;

    beforeAll(() => {
      // addAttributes is a function on the config, call it to get the attribute definitions
      attributes =
        typeof CalloutExtension.config.addAttributes === 'function'
          ? CalloutExtension.config.addAttributes.call(CalloutExtension)
          : {};
    });

    it('has a "type" attribute', () => {
      expect(attributes).toHaveProperty('type');
    });

    it('defaults type to "info"', () => {
      expect(attributes.type.default).toBe('info');
    });

    it('parseHTML reads data-callout-type attribute', () => {
      const element = document.createElement('div');
      element.setAttribute('data-callout-type', 'warning');
      expect(attributes.type.parseHTML(element)).toBe('warning');
    });

    it('parseHTML falls back to "info" when attribute is missing', () => {
      const element = document.createElement('div');
      expect(attributes.type.parseHTML(element)).toBe('info');
    });

    it('renderHTML produces data-callout-type attribute', () => {
      const result = attributes.type.renderHTML({ type: 'error' });
      expect(result).toEqual({ 'data-callout-type': 'error' });
    });
  });

  describe('parseHTML', () => {
    it('matches div[data-callout-type]', () => {
      const rules =
        typeof CalloutExtension.config.parseHTML === 'function'
          ? CalloutExtension.config.parseHTML.call(CalloutExtension)
          : [];
      expect(rules).toEqual([{ tag: 'div[data-callout-type]' }]);
    });
  });

  describe('renderHTML', () => {
    it('renders a div with callout class', () => {
      const renderHTML = CalloutExtension.config.renderHTML;
      if (typeof renderHTML !== 'function') throw new Error('renderHTML not a function');

      const result = renderHTML.call(CalloutExtension, {
        HTMLAttributes: { 'data-callout-type': 'success' },
        node: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      expect(result[0]).toBe('div');
      expect(result[1]).toMatchObject({
        'data-callout-type': 'success',
        class: 'callout',
      });
      expect(result[2]).toBe(0);
    });
  });

  describe('commands', () => {
    it('exposes setCallout command', () => {
      const addCommands = CalloutExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(CalloutExtension);
      expect(commands).toHaveProperty('setCallout');
      expect(typeof commands.setCallout).toBe('function');
    });

    it('exposes toggleCalloutType command', () => {
      const addCommands = CalloutExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(CalloutExtension);
      expect(commands).toHaveProperty('toggleCalloutType');
      expect(typeof commands.toggleCalloutType).toBe('function');
    });

    it('setCallout defaults to "info" type', () => {
      const addCommands = CalloutExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(CalloutExtension);
      const commandFn = commands.setCallout();
      let calledWith: unknown[] = [];
      const mockContext = {
        commands: {
          wrapIn: (...args: unknown[]) => {
            calledWith = args;
            return true;
          },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      commandFn(mockContext as any);
      expect(calledWith).toEqual(['callout', { type: 'info' }]);
    });

    it('setCallout passes provided type', () => {
      const addCommands = CalloutExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(CalloutExtension);
      const commandFn = commands.setCallout('error');
      let calledWith: unknown[] = [];
      const mockContext = {
        commands: {
          wrapIn: (...args: unknown[]) => {
            calledWith = args;
            return true;
          },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      commandFn(mockContext as any);
      expect(calledWith).toEqual(['callout', { type: 'error' }]);
    });

    it('toggleCalloutType calls updateAttributes with the given type', () => {
      const addCommands = CalloutExtension.config.addCommands;
      if (typeof addCommands !== 'function') throw new Error('addCommands not a function');

      const commands = addCommands.call(CalloutExtension);
      const commandFn = commands.toggleCalloutType('warning');
      let calledWith: unknown[] = [];
      const mockContext = {
        commands: {
          updateAttributes: (...args: unknown[]) => {
            calledWith = args;
            return true;
          },
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      commandFn(mockContext as any);
      expect(calledWith).toEqual(['callout', { type: 'warning' }]);
    });
  });
});
