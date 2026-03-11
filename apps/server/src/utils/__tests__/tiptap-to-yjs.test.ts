import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { tiptapJsonToYjsState, type TiptapNode } from '../tiptap-to-yjs.js';

describe('tiptapJsonToYjsState', () => {
  it('throws if root node is not of type "doc"', () => {
    expect(() => tiptapJsonToYjsState({ type: 'paragraph' })).toThrow(
      'Root node must be of type "doc"'
    );
  });

  it('returns valid Yjs state buffer for an empty doc', () => {
    const buf = tiptapJsonToYjsState({ type: 'doc' });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    // Verify it can be applied to a new Y.Doc
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');
    expect(fragment.length).toBe(0);
  });

  it('creates correct Yjs XML structure for a paragraph with text', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    expect(fragment.length).toBe(1);
    const para = fragment.get(0) as Y.XmlElement;
    expect(para.nodeName).toBe('paragraph');
    expect(para.length).toBe(1);
  });

  it('handles heading with level attribute', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Title' }],
        },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    const heading = fragment.get(0) as Y.XmlElement;
    expect(heading.nodeName).toBe('heading');
    expect(heading.getAttribute('level')).toBe(2);
  });

  it('handles text with bold mark', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bold text', marks: [{ type: 'bold' }] }],
        },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    expect(fragment.length).toBe(1);
    const para = fragment.get(0) as Y.XmlElement;
    expect(para.length).toBe(1);
  });

  it('handles nested structures (list with list items)', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item 1' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item 2' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    const list = fragment.get(0) as Y.XmlElement;
    expect(list.nodeName).toBe('bulletList');
    expect(list.length).toBe(2);
  });

  it('handles taskList with checked attribute', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Done' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    const taskList = fragment.get(0) as Y.XmlElement;
    expect(taskList.nodeName).toBe('taskList');
    const taskItem = taskList.get(0) as Y.XmlElement;
    expect(taskItem.getAttribute('checked')).toBe(true);
  });

  it('handles multiple blocks in sequence', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Body text' }],
        },
        { type: 'horizontalRule' },
      ],
    };

    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    expect(fragment.length).toBe(3);
    expect((fragment.get(0) as Y.XmlElement).nodeName).toBe('heading');
    expect((fragment.get(1) as Y.XmlElement).nodeName).toBe('paragraph');
    expect((fragment.get(2) as Y.XmlElement).nodeName).toBe('horizontalRule');
  });

  it('handles null attributes gracefully', () => {
    const tiptapDoc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, textAlign: null },
          content: [{ type: 'text', text: 'Title' }],
        },
      ],
    };

    // Should not throw
    const buf = tiptapJsonToYjsState(tiptapDoc);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    const fragment = doc.getXmlFragment('default');

    const heading = fragment.get(0) as Y.XmlElement;
    expect(heading.getAttribute('level')).toBe(1);
    expect(heading.getAttribute('textAlign')).toBeUndefined();
  });
});
