/**
 * Utility to convert a simplified Tiptap JSON structure to Yjs binary state.
 *
 * Uses Yjs XML API to build the same structure that y-prosemirror / @tiptap/extension-collaboration
 * creates when syncing a ProseMirror document. The root XmlFragment is named "default".
 */
import * as Y from 'yjs';

// Simplified Tiptap node representation
export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

/**
 * Insert a TiptapNode into a Yjs XmlFragment or XmlElement
 */
function insertNode(parent: Y.XmlFragment | Y.XmlElement, node: TiptapNode): void {
  if (node.type === 'text' && node.text !== undefined) {
    const xmlText = new Y.XmlText();
    const formattingAttrs: Record<string, unknown> = {};
    if (node.marks) {
      for (const mark of node.marks) {
        formattingAttrs[mark.type] = mark.attrs ?? {};
      }
    }
    xmlText.insert(
      0,
      node.text,
      Object.keys(formattingAttrs).length > 0 ? formattingAttrs : undefined
    );
    parent.insert(parent.length, [xmlText]);
    return;
  }

  const element = new Y.XmlElement(node.type);

  // Set attributes
  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    }
  }

  // Recursively insert child nodes
  if (node.content) {
    for (const child of node.content) {
      insertNode(element, child);
    }
  }

  parent.insert(parent.length, [element]);
}

/**
 * Convert a Tiptap JSON document to Yjs binary state (Buffer).
 *
 * @param doc - A Tiptap document node (type: "doc") with content array
 * @returns Buffer containing the Yjs encoded state
 */
export function tiptapJsonToYjsState(doc: TiptapNode): Buffer {
  if (doc.type !== 'doc') {
    throw new Error('Root node must be of type "doc"');
  }

  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment('default');

  if (doc.content) {
    for (const node of doc.content) {
      insertNode(fragment, node);
    }
  }

  return Buffer.from(Y.encodeStateAsUpdate(ydoc));
}
