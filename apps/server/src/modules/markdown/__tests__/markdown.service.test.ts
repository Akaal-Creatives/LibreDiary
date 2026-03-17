import { describe, it, expect } from 'vitest';
import { htmlToMarkdown, markdownToHtml } from '../markdown.service.js';

// ============================================
// htmlToMarkdown
// ============================================

describe('htmlToMarkdown', () => {
  describe('basic HTML elements', () => {
    it('should convert a paragraph to plain text', () => {
      const result = htmlToMarkdown('<p>Hello world</p>');
      expect(result).toBe('Hello world');
    });

    it('should convert bold text', () => {
      const result = htmlToMarkdown('<p><strong>bold</strong></p>');
      expect(result).toBe('**bold**');
    });

    it('should convert italic text', () => {
      const result = htmlToMarkdown('<p><em>italic</em></p>');
      expect(result).toBe('_italic_');
    });

    it('should convert inline code', () => {
      const result = htmlToMarkdown('<p><code>const x = 1</code></p>');
      expect(result).toBe('`const x = 1`');
    });

    it('should convert links', () => {
      const result = htmlToMarkdown('<a href="https://example.com">Example</a>');
      expect(result).toBe('[Example](https://example.com)');
    });

    it('should convert images', () => {
      const result = htmlToMarkdown('<img src="photo.jpg" alt="A photo">');
      expect(result).toBe('![A photo](photo.jpg)');
    });
  });

  describe('headings', () => {
    it('should convert h1 to atx-style heading', () => {
      const result = htmlToMarkdown('<h1>Title</h1>');
      expect(result).toBe('# Title');
    });

    it('should convert h2 to atx-style heading', () => {
      const result = htmlToMarkdown('<h2>Subtitle</h2>');
      expect(result).toBe('## Subtitle');
    });

    it('should convert h3 through h6', () => {
      expect(htmlToMarkdown('<h3>H3</h3>')).toBe('### H3');
      expect(htmlToMarkdown('<h4>H4</h4>')).toBe('#### H4');
      expect(htmlToMarkdown('<h5>H5</h5>')).toBe('##### H5');
      expect(htmlToMarkdown('<h6>H6</h6>')).toBe('###### H6');
    });
  });

  describe('lists', () => {
    it('should convert unordered list with dash markers', () => {
      const result = htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>');
      expect(result).toContain('-   One');
      expect(result).toContain('-   Two');
    });

    it('should convert ordered list', () => {
      const result = htmlToMarkdown('<ol><li>First</li><li>Second</li></ol>');
      expect(result).toContain('1.');
      expect(result).toContain('First');
      expect(result).toContain('Second');
    });
  });

  describe('code blocks', () => {
    it('should convert pre/code to fenced code block', () => {
      const result = htmlToMarkdown('<pre><code>console.log("hi")</code></pre>');
      expect(result).toContain('```');
      expect(result).toContain('console.log("hi")');
    });
  });

  describe('blockquotes', () => {
    it('should convert blockquote', () => {
      const result = htmlToMarkdown('<blockquote><p>A quote</p></blockquote>');
      expect(result).toContain('> A quote');
    });
  });

  describe('GFM extensions', () => {
    it('should convert strikethrough', () => {
      const result = htmlToMarkdown('<p><del>removed</del></p>');
      expect(result).toBe('~removed~');
    });

    it('should convert a simple table', () => {
      const html = `
        <table>
          <thead><tr><th>Name</th><th>Age</th></tr></thead>
          <tbody><tr><td>Alice</td><td>30</td></tr></tbody>
        </table>
      `;
      const result = htmlToMarkdown(html);
      expect(result).toContain('Name');
      expect(result).toContain('Age');
      expect(result).toContain('Alice');
      expect(result).toContain('30');
      expect(result).toContain('|');
    });

    it('should convert task lists', () => {
      const html =
        '<ul><li><input type="checkbox" checked> Done</li><li><input type="checkbox"> Todo</li></ul>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('[x]');
      expect(result).toContain('[ ]');
    });
  });

  describe('callout blocks', () => {
    it('should convert a callout with data-callout-type', () => {
      const html = '<div class="callout" data-callout-type="warning"><p>Be careful!</p></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **Warning**');
      expect(result).toContain('> Be careful!');
    });

    it('should default to info type when data-callout-type is absent', () => {
      const html = '<div class="callout"><p>Note this</p></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **Info**');
      expect(result).toContain('> Note this');
    });

    it('should capitalise the first letter of the callout type', () => {
      const html = '<div class="callout" data-callout-type="danger"><p>Alert</p></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('> **Danger**');
    });
  });

  describe('toggle/details blocks', () => {
    it('should convert a toggle block with summary', () => {
      const html =
        '<details class="toggle-block"><summary>Click me</summary><p>Hidden content</p></details>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Click me</summary>');
      expect(result).toContain('Hidden content');
      expect(result).toContain('</details>');
    });

    it('should use "Details" as default summary when no summary element exists', () => {
      const html = '<details class="toggle-block"><p>Content only</p></details>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('<summary>Details</summary>');
    });
  });

  describe('mermaid diagram blocks', () => {
    it('should convert a mermaid diagram to a fenced code block', () => {
      // Turndown requires non-empty content to trigger the rule on a div
      const html =
        '<div data-type="mermaidDiagram" code="graph TD; A-->B;"><pre>graph TD; A-->B;</pre></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('```mermaid');
      expect(result).toContain('graph TD; A-->B;');
      expect(result).toContain('```');
    });

    it('should handle an empty code attribute', () => {
      const html = '<div data-type="mermaidDiagram" code=""><pre>placeholder</pre></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('```mermaid');
    });
  });

  describe('footnote references', () => {
    it('should convert a footnote reference with a label attribute', () => {
      const html = '<sup data-footnote-ref label="1">1</sup>';
      const result = htmlToMarkdown(html);
      expect(result).toBe('[^1]');
    });

    it('should fall back to textContent when label attribute is absent', () => {
      const html = '<sup data-footnote-ref>2</sup>';
      const result = htmlToMarkdown(html);
      expect(result).toBe('[^2]');
    });
  });

  describe('footnote content blocks', () => {
    it('should convert a footnote content block with a label attribute', () => {
      const html =
        '<div data-footnote-content label="1"><p>[1] This is the footnote text.</p></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('[^1]:');
      expect(result).toContain('This is the footnote text.');
    });

    it('should fall back to footnoteid attribute', () => {
      const html = '<div data-footnote-content footnoteid="fn2"><p>Another footnote.</p></div>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('[^fn2]:');
      expect(result).toContain('Another footnote.');
    });

    it('should strip leading bracketed reference from content', () => {
      const html = '<div data-footnote-content label="3"><p>[3] The actual note.</p></div>';
      const result = htmlToMarkdown(html);
      // The [3] prefix should be stripped
      expect(result).not.toMatch(/\[3\]\s+The actual note/);
      expect(result).toContain('The actual note.');
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML string', () => {
      const result = htmlToMarkdown('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only HTML', () => {
      const result = htmlToMarkdown('   ');
      expect(result.trim()).toBe('');
    });

    it('should handle plain text without HTML tags', () => {
      const result = htmlToMarkdown('Just plain text');
      expect(result).toBe('Just plain text');
    });

    it('should handle nested formatting', () => {
      const result = htmlToMarkdown('<p><strong><em>bold and italic</em></strong></p>');
      expect(result).toContain('bold and italic');
      // Should contain both bold and italic markers
      expect(result).toContain('**');
      expect(result).toContain('_');
    });

    it('should handle multiple paragraphs', () => {
      const result = htmlToMarkdown('<p>First</p><p>Second</p>');
      expect(result).toContain('First');
      expect(result).toContain('Second');
    });

    it('should handle line breaks', () => {
      const result = htmlToMarkdown('<p>Line one<br>Line two</p>');
      expect(result).toContain('Line one');
      expect(result).toContain('Line two');
    });

    it('should handle horizontal rules', () => {
      const result = htmlToMarkdown('<hr>');
      // Turndown defaults to '* * *' for horizontal rules
      expect(result).toContain('* * *');
    });
  });
});

// ============================================
// markdownToHtml
// ============================================

describe('markdownToHtml', () => {
  describe('basic markdown elements', () => {
    it('should convert a paragraph', async () => {
      const result = await markdownToHtml('Hello world');
      expect(result).toContain('<p>Hello world</p>');
    });

    it('should convert bold text', async () => {
      const result = await markdownToHtml('**bold**');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('should convert italic text', async () => {
      const result = await markdownToHtml('_italic_');
      expect(result).toContain('<em>italic</em>');
    });

    it('should convert inline code', async () => {
      const result = await markdownToHtml('`code`');
      expect(result).toContain('<code>code</code>');
    });

    it('should convert links', async () => {
      const result = await markdownToHtml('[Example](https://example.com)');
      expect(result).toContain('<a href="https://example.com">Example</a>');
    });

    it('should convert images', async () => {
      const result = await markdownToHtml('![Alt](image.png)');
      expect(result).toContain('<img');
      expect(result).toContain('src="image.png"');
      expect(result).toContain('alt="Alt"');
    });
  });

  describe('headings', () => {
    it('should convert atx-style headings', async () => {
      expect(await markdownToHtml('# H1')).toContain('<h1');
      expect(await markdownToHtml('## H2')).toContain('<h2');
      expect(await markdownToHtml('### H3')).toContain('<h3');
    });
  });

  describe('lists', () => {
    it('should convert unordered list', async () => {
      const result = await markdownToHtml('- One\n- Two');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>One</li>');
      expect(result).toContain('<li>Two</li>');
    });

    it('should convert ordered list', async () => {
      const result = await markdownToHtml('1. First\n2. Second');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
    });
  });

  describe('code blocks', () => {
    it('should convert fenced code block', async () => {
      const result = await markdownToHtml('```\nconsole.log("hi")\n```');
      expect(result).toContain('<pre>');
      expect(result).toContain('<code>');
      expect(result).toContain('console.log');
    });

    it('should convert fenced code block with language', async () => {
      const result = await markdownToHtml('```javascript\nconst x = 1;\n```');
      expect(result).toContain('<code');
      expect(result).toContain('const x = 1;');
    });
  });

  describe('blockquotes', () => {
    it('should convert blockquote', async () => {
      const result = await markdownToHtml('> A quote');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('A quote');
    });
  });

  describe('GFM features', () => {
    it('should convert strikethrough', async () => {
      const result = await markdownToHtml('~~removed~~');
      expect(result).toContain('<del>removed</del>');
    });

    it('should convert a table', async () => {
      const md = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
      const result = await markdownToHtml(md);
      expect(result).toContain('<table>');
      expect(result).toContain('<th>Name</th>');
      expect(result).toContain('<td>Alice</td>');
    });

    it('should convert task lists', async () => {
      const md = '- [x] Done\n- [ ] Todo';
      const result = await markdownToHtml(md);
      expect(result).toContain('type="checkbox"');
      expect(result).toContain('checked');
    });
  });

  describe('horizontal rules', () => {
    it('should convert horizontal rule', async () => {
      const result = await markdownToHtml('---');
      expect(result).toContain('<hr');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const result = await markdownToHtml('');
      expect(result).toBe('');
    });

    it('should handle whitespace-only input', async () => {
      const result = await markdownToHtml('   ');
      expect(result.trim()).toBe('');
    });

    it('should handle multiple paragraphs', async () => {
      const result = await markdownToHtml('First\n\nSecond');
      expect(result).toContain('<p>First</p>');
      expect(result).toContain('<p>Second</p>');
    });

    it('should preserve HTML entities in markdown', async () => {
      const result = await markdownToHtml('Use `<div>` for layout');
      expect(result).toContain('&lt;div&gt;');
    });
  });

  describe('round-trip consistency', () => {
    it('should preserve simple content through html->md->html', async () => {
      const originalHtml = '<p>Hello <strong>world</strong></p>';
      const md = htmlToMarkdown(originalHtml);
      const html = await markdownToHtml(md);
      expect(html).toContain('Hello');
      expect(html).toContain('<strong>world</strong>');
    });

    it('should preserve headings through html->md->html', async () => {
      const originalHtml = '<h2>My Heading</h2>';
      const md = htmlToMarkdown(originalHtml);
      const html = await markdownToHtml(md);
      expect(html).toContain('<h2');
      expect(html).toContain('My Heading');
    });

    it('should preserve lists through html->md->html', async () => {
      const originalHtml = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const md = htmlToMarkdown(originalHtml);
      const html = await markdownToHtml(md);
      expect(html).toContain('<ul>');
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
    });
  });
});
