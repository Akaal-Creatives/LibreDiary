import { describe, it, expect } from 'vitest';
import { htmlToText } from '../html-to-text.js';

describe('htmlToText', () => {
  it('returns empty string for empty input', () => {
    expect(htmlToText('')).toBe('');
  });

  it('returns empty string for null-ish input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(htmlToText(null as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(htmlToText(undefined as any)).toBe('');
  });

  it('strips basic HTML tags', () => {
    expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('replaces block-level closing tags with newlines', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = htmlToText(html);
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
  });

  it('handles br tags', () => {
    expect(htmlToText('Hello<br>World')).toBe('Hello\nWorld');
    expect(htmlToText('Hello<br/>World')).toBe('Hello\nWorld');
    expect(htmlToText('Hello<br />World')).toBe('Hello\nWorld');
  });

  it('decodes common HTML entities', () => {
    expect(htmlToText('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
  });

  it('decodes numeric HTML entities', () => {
    expect(htmlToText('&#65;&#66;&#67;')).toBe('ABC');
  });

  it('decodes hex HTML entities', () => {
    expect(htmlToText('&#x41;&#x42;&#x43;')).toBe('ABC');
  });

  it('replaces &nbsp; with spaces', () => {
    expect(htmlToText('Hello&nbsp;World')).toBe('Hello World');
  });

  it('collapses multiple spaces', () => {
    expect(htmlToText('Hello     World')).toBe('Hello World');
  });

  it('collapses multiple blank lines', () => {
    const html = '<p>First</p><p></p><p></p><p></p><p>Second</p>';
    const result = htmlToText(html);
    expect(result).not.toMatch(/\n{3,}/);
  });

  it('trims leading and trailing whitespace', () => {
    expect(htmlToText('  <p>  Hello  </p>  ')).toBe('Hello');
  });

  it('handles nested tags', () => {
    expect(htmlToText('<div><p>Hello <em><strong>world</strong></em></p></div>')).toBe(
      'Hello world'
    );
  });

  it('handles headings', () => {
    const html = '<h1>Title</h1><p>Content</p>';
    const result = htmlToText(html);
    expect(result).toContain('Title');
    expect(result).toContain('Content');
  });

  it('handles lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = htmlToText(html);
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('handles code blocks', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    expect(htmlToText(html)).toContain('const x = 1;');
  });

  it('handles plain text with no HTML', () => {
    expect(htmlToText('Just plain text')).toBe('Just plain text');
  });

  it('handles self-closing tags', () => {
    expect(htmlToText('Hello<img src="test.png" />World')).toBe('HelloWorld');
  });
});
