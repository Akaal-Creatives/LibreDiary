import * as Y from 'yjs';

/**
 * Extract plain text from a Yjs document by walking the XmlFragment tree.
 *
 * Tiptap stores editor content as an XmlFragment named 'default'.
 * We walk its child XmlElements recursively to collect all text content,
 * without needing any Tiptap dependency on the server side.
 */
export function yjsDocToText(doc: Y.Doc): string {
  const fragment = doc.getXmlFragment('default');
  return xmlFragmentToText(fragment).trim();
}

/**
 * Extract plain text from a Yjs document provided as a binary state update.
 */
export function yjsStateToText(state: Uint8Array | Buffer): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(state));
  const text = yjsDocToText(doc);
  doc.destroy();
  return text;
}

function xmlFragmentToText(fragment: Y.XmlFragment): string {
  const parts: string[] = [];

  for (let i = 0; i < fragment.length; i++) {
    const child = fragment.get(i);
    if (child instanceof Y.XmlText) {
      parts.push(child.toString());
    } else if (child instanceof Y.XmlElement) {
      const nodeName = child.nodeName.toLowerCase();
      const inner = xmlFragmentToText(child);

      // Block-level elements get newlines
      if (isBlockElement(nodeName)) {
        parts.push('\n' + inner + '\n');
      } else {
        parts.push(inner);
      }
    }
  }

  return parts
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const BLOCK_ELEMENTS = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeblock',
  'codeBlock',
  'bulletlist',
  'bulletList',
  'orderedlist',
  'orderedList',
  'listitem',
  'listItem',
  'horizontalrule',
  'horizontalRule',
  'table',
  'tablerow',
  'tableRow',
  'tablecell',
  'tableCell',
  'tableheader',
  'tableHeader',
  'callout',
  'toggle',
  'toggleSummary',
  'toggleContent',
  'tableOfContents',
]);

function isBlockElement(nodeName: string): boolean {
  return BLOCK_ELEMENTS.has(nodeName);
}
