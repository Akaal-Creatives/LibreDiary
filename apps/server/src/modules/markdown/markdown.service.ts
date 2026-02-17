import TurndownService from 'turndown';
// @ts-expect-error — turndown-plugin-gfm has no type declarations
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';

// ============================================
// HTML → Markdown
// ============================================

// Helper to safely access DOM-like properties on Turndown's Node
// (which is a JSDOM node, but the server tsconfig does not include the DOM lib)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function el(node: any): any {
  return node;
}

/**
 * Convert HTML content to GFM-compatible Markdown.
 * Includes custom rules for LibreDiary's callout, toggle, and mermaid blocks.
 */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
  });

  // Enable GFM tables, strikethrough, task lists
  turndown.use(gfm);

  // Custom rule: Callout blocks → blockquote with type prefix
  turndown.addRule('callout', {
    filter: (node) => el(node).nodeName === 'DIV' && el(node).classList?.contains('callout'),
    replacement: (content, node) => {
      const type = el(node).getAttribute?.('data-callout-type') || 'info';
      const prefix = `> **${type.charAt(0).toUpperCase() + type.slice(1)}**`;
      const lines = content
        .trim()
        .split('\n')
        .map((line: string) => `> ${line}`)
        .join('\n');
      return `\n${prefix}\n${lines}\n\n`;
    },
  });

  // Custom rule: Toggle/details blocks
  turndown.addRule('toggle', {
    filter: (node) =>
      el(node).nodeName === 'DETAILS' && el(node).classList?.contains('toggle-block'),
    replacement: (content, node) => {
      const summary = el(node).querySelector?.('summary');
      const summaryText = summary?.textContent?.trim() || 'Details';
      const body = content.replace(summaryText, '').trim();
      return `\n<details>\n<summary>${summaryText}</summary>\n\n${body}\n\n</details>\n\n`;
    },
  });

  // Custom rule: Mermaid diagram blocks
  turndown.addRule('mermaid', {
    filter: (node) =>
      el(node).nodeName === 'DIV' && el(node).getAttribute?.('data-type') === 'mermaidDiagram',
    replacement: (_content, node) => {
      const code = el(node).getAttribute?.('code') || '';
      return `\n\`\`\`mermaid\n${code}\n\`\`\`\n\n`;
    },
  });

  // Custom rule: Footnote references
  turndown.addRule('footnoteRef', {
    filter: (node) => el(node).nodeName === 'SUP' && el(node).hasAttribute?.('data-footnote-ref'),
    replacement: (_content, node) => {
      const label = el(node).getAttribute?.('label') || el(node).textContent || '?';
      return `[^${label}]`;
    },
  });

  // Custom rule: Footnote content blocks
  turndown.addRule('footnoteContent', {
    filter: (node) =>
      el(node).nodeName === 'DIV' && el(node).hasAttribute?.('data-footnote-content'),
    replacement: (content, node) => {
      const label =
        el(node).getAttribute?.('label') || el(node).getAttribute?.('footnoteid') || '?';
      const text = content.replace(/^\[.*?\]\s*/, '').trim();
      return `\n[^${label}]: ${text}\n`;
    },
  });

  return turndown.turndown(html);
}

// ============================================
// Markdown → HTML
// ============================================

/**
 * Convert GFM Markdown to HTML.
 * Uses `marked` with GFM extensions enabled.
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const html = await marked(markdown, {
    gfm: true,
    breaks: false,
  });
  return html;
}
