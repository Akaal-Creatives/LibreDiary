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
});
