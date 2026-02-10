import { describe, it, expect, vi } from 'vitest';
import { SlashCommandExtension } from '../SlashCommandExtension';

describe('SlashCommandExtension', () => {
  it('has name "slashCommands"', () => {
    expect(SlashCommandExtension.name).toBe('slashCommands');
  });

  it('has default option char set to "/"', () => {
    const extension = SlashCommandExtension.configure({});
    expect(extension.options.suggestion.char).toBe('/');
  });

  it('has startOfLine set to false by default', () => {
    const extension = SlashCommandExtension.configure({});
    expect(extension.options.suggestion.startOfLine).toBe(false);
  });

  it('command callback deletes range and calls action', () => {
    const extension = SlashCommandExtension.configure({});
    const { command } = extension.options.suggestion;

    const run = vi.fn();
    const deleteRange = vi.fn().mockReturnValue({ run });
    const focus = vi.fn().mockReturnValue({ deleteRange });
    const chain = vi.fn().mockReturnValue({ focus });

    const mockEditor = { chain };
    const mockRange = { from: 0, to: 5 };
    const mockAction = vi.fn();

    command({ editor: mockEditor, range: mockRange, props: { action: mockAction } });

    expect(chain).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(deleteRange).toHaveBeenCalledWith(mockRange);
    expect(run).toHaveBeenCalled();
    expect(mockAction).toHaveBeenCalledWith(mockEditor);
  });

  it('configure can override char option', () => {
    const extension = SlashCommandExtension.configure({
      suggestion: {
        char: '#',
        startOfLine: false,
        command: () => {},
      },
    });
    expect(extension.options.suggestion.char).toBe('#');
  });

  it('command callback calls action after deleteRange completes', () => {
    const extension = SlashCommandExtension.configure({});
    const { command } = extension.options.suggestion;

    const callOrder: string[] = [];
    const run = vi.fn().mockImplementation(() => callOrder.push('run'));
    const deleteRange = vi.fn().mockReturnValue({ run });
    const focus = vi.fn().mockReturnValue({ deleteRange });
    const chain = vi.fn().mockReturnValue({ focus });

    const mockEditor = { chain };
    const mockRange = { from: 0, to: 3 };
    const mockAction = vi.fn().mockImplementation(() => callOrder.push('action'));

    command({ editor: mockEditor, range: mockRange, props: { action: mockAction } });

    expect(callOrder).toEqual(['run', 'action']);
  });

  it('command callback works with large range values', () => {
    const extension = SlashCommandExtension.configure({});
    const { command } = extension.options.suggestion;

    const run = vi.fn();
    const deleteRange = vi.fn().mockReturnValue({ run });
    const focus = vi.fn().mockReturnValue({ deleteRange });
    const chain = vi.fn().mockReturnValue({ focus });

    const mockEditor = { chain };
    const mockRange = { from: 500, to: 1000 };
    const mockAction = vi.fn();

    command({ editor: mockEditor, range: mockRange, props: { action: mockAction } });

    expect(deleteRange).toHaveBeenCalledWith({ from: 500, to: 1000 });
    expect(mockAction).toHaveBeenCalledWith(mockEditor);
  });
});
