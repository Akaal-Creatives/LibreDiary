import { describe, it, expect } from 'vitest';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';

describe('Superscript Extension', () => {
  it('has name "superscript"', () => {
    expect(Superscript.name).toBe('superscript');
  });

  it('is an inline mark (not a node)', () => {
    expect(Superscript.type).toBe('mark');
  });
});

describe('Subscript Extension', () => {
  it('has name "subscript"', () => {
    expect(Subscript.name).toBe('subscript');
  });

  it('is an inline mark (not a node)', () => {
    expect(Subscript.type).toBe('mark');
  });
});
