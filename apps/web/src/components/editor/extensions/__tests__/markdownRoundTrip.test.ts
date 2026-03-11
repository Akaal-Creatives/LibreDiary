import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { CalloutExtension } from '../CalloutExtension';
import { ToggleNode, ToggleSummaryNode, ToggleContentNode } from '../ToggleExtension';
import { FootnoteExtension } from '../FootnoteExtension';
import { MermaidExtension } from '../MermaidExtension';
import { MathBlockExtension } from '../MathBlockExtension';
import { TableOfContentsExtension } from '../TableOfContentsExtension';
import { SuperscriptMarkdown } from '../SuperSubMarkdown';
import { SubscriptMarkdown } from '../SuperSubMarkdown';
import { CodeBlockLowlightExtension } from '../CodeBlockLowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';

/**
 * Creates a test editor with all custom extensions and the Markdown extension.
 */
function createTestEditor(content = '') {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false, history: false }),
      CodeBlockLowlightExtension,
      Image,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CalloutExtension,
      ToggleNode,
      ToggleSummaryNode,
      ToggleContentNode,
      FootnoteExtension,
      MermaidExtension,
      MathBlockExtension,
      TableOfContentsExtension,
      SuperscriptMarkdown,
      SubscriptMarkdown,
    ],
    content,
  });
}

/**
 * Gets markdown from an editor instance.
 */
function getMarkdown(editor: Editor): string {
  const storage = editor.storage as Record<string, Record<string, unknown>>;
  const md = storage?.markdown;
  if (md && typeof md.getMarkdown === 'function') {
    return (md.getMarkdown as () => string)();
  }
  return editor.getHTML();
}

/**
 * Round-trip test: markdown → editor → markdown.
 * Compares the output with the expected string (or the original if not provided).
 */
function testRoundTrip(input: string, expected?: string) {
  const editor = createTestEditor(input);
  const output = getMarkdown(editor).trim();
  editor.destroy();
  expect(output).toBe((expected ?? input).trim());
}

describe('Markdown Round-Trip', () => {
  // ─── Standard Blocks ────────────────────────────────────────────

  describe('standard blocks', () => {
    it('round-trips headings H1-H6', () => {
      testRoundTrip('# Heading 1');
      testRoundTrip('## Heading 2');
      testRoundTrip('### Heading 3');
      testRoundTrip('#### Heading 4');
      testRoundTrip('##### Heading 5');
      testRoundTrip('###### Heading 6');
    });

    it('round-trips paragraphs', () => {
      testRoundTrip('Hello world');
    });

    it('round-trips bold and italic', () => {
      testRoundTrip('**bold** and *italic* text');
    });

    it('round-trips strikethrough', () => {
      testRoundTrip('~~struck through~~');
    });

    it('round-trips inline code', () => {
      testRoundTrip('Use `const x = 1` here');
    });

    it('round-trips blockquotes', () => {
      testRoundTrip('> This is a quote');
    });

    it('round-trips bullet lists', () => {
      testRoundTrip('- Item 1\n- Item 2\n- Item 3');
    });

    it('round-trips ordered lists', () => {
      testRoundTrip('1. First\n2. Second\n3. Third');
    });

    it('round-trips horizontal rules', () => {
      testRoundTrip('---');
    });

    it('round-trips code blocks with language', () => {
      testRoundTrip('```javascript\nconst x = 1;\n```');
    });

    it('round-trips links', () => {
      testRoundTrip('[LibreDiary](https://example.com)');
    });

    it('round-trips images', () => {
      testRoundTrip('![alt text](https://example.com/image.png)');
    });
  });

  // ─── Tables ─────────────────────────────────────────────────────

  describe('tables', () => {
    it('round-trips simple tables', () => {
      const input = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor);
      editor.destroy();
      // Tables should survive round-trip (exact formatting may differ slightly)
      expect(output).toContain('Name');
      expect(output).toContain('Age');
      expect(output).toContain('Alice');
      expect(output).toContain('30');
    });
  });

  // ─── Task Lists ─────────────────────────────────────────────────

  describe('task lists', () => {
    it('round-trips task lists', () => {
      const input = '- [ ] Todo item\n- [x] Done item';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor);
      editor.destroy();
      expect(output).toContain('[ ]');
      expect(output).toContain('[x]');
      expect(output).toContain('Todo item');
      expect(output).toContain('Done item');
    });
  });

  // ─── Custom Blocks ──────────────────────────────────────────────

  describe('callouts', () => {
    it('round-trips info callout', () => {
      const input = '> [!info]\n> This is an info callout';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[!info]');
      expect(output).toContain('This is an info callout');
    });

    it('round-trips warning callout', () => {
      const input = '> [!warning]\n> Be careful here';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[!warning]');
      expect(output).toContain('Be careful here');
    });

    it('round-trips error callout', () => {
      const input = '> [!error]\n> Something went wrong';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[!error]');
      expect(output).toContain('Something went wrong');
    });

    it('round-trips success callout', () => {
      const input = '> [!success]\n> Well done';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[!success]');
      expect(output).toContain('Well done');
    });

    it('preserves callout type after round-trip', () => {
      const types = ['info', 'warning', 'error', 'success'] as const;
      for (const type of types) {
        const input = `> [!${type}]\n> Content`;
        const editor = createTestEditor(input);
        const output = getMarkdown(editor).trim();
        editor.destroy();
        expect(output).toContain(`[!${type}]`);
      }
    });
  });

  describe('mermaid diagrams', () => {
    it('round-trips mermaid code blocks', () => {
      const input = '```mermaid\ngraph TD\n    A --> B\n```';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('```mermaid');
      expect(output).toContain('graph TD');
      expect(output).toContain('A --> B');
      expect(output).toContain('```');
    });

    it('round-trips complex mermaid diagrams', () => {
      const input =
        '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi\n```';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('sequenceDiagram');
      expect(output).toContain('Alice->>Bob');
    });
  });

  describe('math blocks', () => {
    it('round-trips LaTeX math blocks', () => {
      const input = '$$\nE = mc^2\n$$';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('$$');
      expect(output).toContain('E = mc^2');
    });

    it('round-trips multi-line LaTeX', () => {
      const input = '$$\n\\frac{a}{b} + \\sqrt{c}\n$$';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('\\frac{a}{b}');
      expect(output).toContain('\\sqrt{c}');
    });
  });

  describe('footnotes', () => {
    it('round-trips footnote references and definitions', () => {
      const input = 'Text with footnote[^1]\n\n[^1]: This is the footnote';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[^');
      expect(output).toContain('This is the footnote');
    });

    it('round-trips multiple footnotes', () => {
      const input = 'First[^1] and second[^2]\n\n[^1]: Note one\n\n[^2]: Note two';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('Note one');
      expect(output).toContain('Note two');
    });
  });

  describe('table of contents', () => {
    it('round-trips [TOC] marker', () => {
      const input = '[TOC]';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toBe('[TOC]');
    });

    it('round-trips [TOC] within a document', () => {
      const input = '# My Document\n\n[TOC]\n\n## Section 1\n\nContent here';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('[TOC]');
      expect(output).toContain('# My Document');
      expect(output).toContain('## Section 1');
    });
  });

  describe('toggle/details blocks', () => {
    it('round-trips toggle blocks as HTML details', () => {
      const input =
        '<details>\n<summary>Click to expand</summary>\n<div data-toggle-content>\n\nHidden content\n\n</div>\n</details>';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('<details>');
      expect(output).toContain('<summary>');
      expect(output).toContain('Click to expand');
      expect(output).toContain('</details>');
    });
  });

  // ─── Marks ──────────────────────────────────────────────────────

  describe('superscript and subscript', () => {
    it('round-trips superscript', () => {
      const input = 'E = mc^2^';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('^2^');
    });

    it('round-trips subscript', () => {
      const input = 'H~2~O is water';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('~2~');
      expect(output).toContain('water');
    });

    it('round-trips mixed super and subscript', () => {
      const input = 'x^2^ + y~i~ = z';
      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();
      expect(output).toContain('^2^');
      expect(output).toContain('~i~');
    });
  });

  // ─── Mixed Content ─────────────────────────────────────────────

  describe('mixed content', () => {
    it('round-trips a document with multiple custom blocks', () => {
      const input = [
        '# Document Title',
        '',
        '[TOC]',
        '',
        '## Introduction',
        '',
        '> [!info]',
        '> Important note here',
        '',
        '$$',
        'E = mc^2',
        '$$',
        '',
        '```mermaid',
        'graph TD',
        '    A --> B',
        '```',
        '',
        'Regular paragraph with ^super^ and ~sub~ text.',
      ].join('\n');

      const editor = createTestEditor(input);
      const output = getMarkdown(editor).trim();
      editor.destroy();

      expect(output).toContain('# Document Title');
      expect(output).toContain('[TOC]');
      expect(output).toContain('[!info]');
      expect(output).toContain('$$');
      expect(output).toContain('E = mc^2');
      expect(output).toContain('```mermaid');
      expect(output).toContain('graph TD');
    });
  });

  // ─── Serialisation-only tests (from JSON) ───────────────────────

  describe('serialisation from editor JSON', () => {
    it('serialises callout node to GitHub admonition', () => {
      const editor = createTestEditor();
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'callout',
            attrs: { type: 'warning' },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Watch out!' }],
              },
            ],
          },
        ],
      });
      const md = getMarkdown(editor).trim();
      editor.destroy();
      expect(md).toContain('> [!warning]');
      expect(md).toContain('> Watch out!');
    });

    it('serialises mermaid node to fenced code block', () => {
      const editor = createTestEditor();
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'mermaidDiagram',
            attrs: { code: 'graph LR\n    X --> Y' },
          },
        ],
      });
      const md = getMarkdown(editor).trim();
      editor.destroy();
      expect(md).toBe('```mermaid\ngraph LR\n    X --> Y\n```');
    });

    it('serialises math block to $$ delimiters', () => {
      const editor = createTestEditor();
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'mathBlock',
            attrs: { latex: '\\int_0^1 x^2 dx' },
          },
        ],
      });
      const md = getMarkdown(editor).trim();
      editor.destroy();
      expect(md).toBe('$$\n\\int_0^1 x^2 dx\n$$');
    });

    it('serialises table of contents to [TOC]', () => {
      const editor = createTestEditor();
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'tableOfContents' }],
      });
      const md = getMarkdown(editor).trim();
      editor.destroy();
      expect(md).toBe('[TOC]');
    });

    it('serialises footnote reference and content', () => {
      const editor = createTestEditor();
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello' },
              {
                type: 'footnoteReference',
                attrs: { footnoteId: 'fn-1', label: '1' },
              },
            ],
          },
          {
            type: 'footnoteContent',
            attrs: { footnoteId: 'fn-1', label: '1' },
            content: [{ type: 'text', text: 'A footnote' }],
          },
        ],
      });
      const md = getMarkdown(editor).trim();
      editor.destroy();
      expect(md).toContain('[^1]');
      expect(md).toContain('[^1]: A footnote');
    });
  });
});
