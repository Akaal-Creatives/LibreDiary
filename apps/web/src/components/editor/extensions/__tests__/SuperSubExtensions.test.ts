import { describe, it, expect } from 'vitest';
import { SuperscriptMarkdown, SubscriptMarkdown } from '../SuperSubMarkdown';

describe('SuperscriptMarkdown Extension', () => {
  it('has name "superscript"', () => {
    expect(SuperscriptMarkdown.name).toBe('superscript');
  });

  it('is an inline mark', () => {
    expect(SuperscriptMarkdown.type).toBe('mark');
  });

  it('has markdown serialize config with ^ delimiters', () => {
    const storage =
      typeof SuperscriptMarkdown.config.addStorage === 'function'
        ? SuperscriptMarkdown.config.addStorage.call(SuperscriptMarkdown)
        : {};
    expect(storage.markdown.serialize.open).toBe('^');
    expect(storage.markdown.serialize.close).toBe('^');
    expect(storage.markdown.serialize.mixable).toBe(true);
    expect(storage.markdown.serialize.expelEnclosingWhitespace).toBe(true);
  });

  it('has markdown parse setup that registers markdown-it-sup', () => {
    const storage =
      typeof SuperscriptMarkdown.config.addStorage === 'function'
        ? SuperscriptMarkdown.config.addStorage.call(SuperscriptMarkdown)
        : {};
    expect(typeof storage.markdown.parse.setup).toBe('function');

    // Verify it calls markdownit.use() with a plugin
    let pluginUsed = false;
    const mockMarkdownIt = {
      use: () => {
        pluginUsed = true;
      },
    };
    storage.markdown.parse.setup(mockMarkdownIt);
    expect(pluginUsed).toBe(true);
  });
});

describe('SubscriptMarkdown Extension', () => {
  it('has name "subscript"', () => {
    expect(SubscriptMarkdown.name).toBe('subscript');
  });

  it('is an inline mark', () => {
    expect(SubscriptMarkdown.type).toBe('mark');
  });

  it('has markdown serialize config with ~ delimiters', () => {
    const storage =
      typeof SubscriptMarkdown.config.addStorage === 'function'
        ? SubscriptMarkdown.config.addStorage.call(SubscriptMarkdown)
        : {};
    expect(storage.markdown.serialize.open).toBe('~');
    expect(storage.markdown.serialize.close).toBe('~');
    expect(storage.markdown.serialize.mixable).toBe(true);
    expect(storage.markdown.serialize.expelEnclosingWhitespace).toBe(true);
  });

  it('has markdown parse setup that registers markdown-it-sub', () => {
    const storage =
      typeof SubscriptMarkdown.config.addStorage === 'function'
        ? SubscriptMarkdown.config.addStorage.call(SubscriptMarkdown)
        : {};
    expect(typeof storage.markdown.parse.setup).toBe('function');

    let pluginUsed = false;
    const mockMarkdownIt = {
      use: () => {
        pluginUsed = true;
      },
    };
    storage.markdown.parse.setup(mockMarkdownIt);
    expect(pluginUsed).toBe(true);
  });
});
