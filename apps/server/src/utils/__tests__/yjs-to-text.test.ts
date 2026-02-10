import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { yjsDocToText, yjsStateToText } from '../yjs-to-text.js';

function createDocWithContent(setup: (fragment: Y.XmlFragment) => void): Y.Doc {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('default');
  setup(fragment);
  return doc;
}

describe('yjsDocToText', () => {
  it('returns empty string for empty document', () => {
    const doc = new Y.Doc();
    expect(yjsDocToText(doc)).toBe('');
  });

  it('extracts text from a paragraph element', () => {
    const doc = createDocWithContent((fragment) => {
      const paragraph = new Y.XmlElement('paragraph');
      paragraph.insert(0, [new Y.XmlText('Hello world')]);
      fragment.insert(0, [paragraph]);
    });

    expect(yjsDocToText(doc)).toBe('Hello world');
  });

  it('extracts text from multiple paragraphs', () => {
    const doc = createDocWithContent((fragment) => {
      const p1 = new Y.XmlElement('paragraph');
      p1.insert(0, [new Y.XmlText('First paragraph')]);
      const p2 = new Y.XmlElement('paragraph');
      p2.insert(0, [new Y.XmlText('Second paragraph')]);
      fragment.insert(0, [p1, p2]);
    });

    const text = yjsDocToText(doc);
    expect(text).toContain('First paragraph');
    expect(text).toContain('Second paragraph');
  });

  it('extracts text from heading elements', () => {
    const doc = createDocWithContent((fragment) => {
      const heading = new Y.XmlElement('heading');
      heading.insert(0, [new Y.XmlText('My Heading')]);
      fragment.insert(0, [heading]);
    });

    expect(yjsDocToText(doc)).toBe('My Heading');
  });

  it('handles nested elements (blockquote with paragraphs)', () => {
    const doc = createDocWithContent((fragment) => {
      const blockquote = new Y.XmlElement('blockquote');
      const p = new Y.XmlElement('paragraph');
      p.insert(0, [new Y.XmlText('Quoted text')]);
      blockquote.insert(0, [p]);
      fragment.insert(0, [blockquote]);
    });

    expect(yjsDocToText(doc)).toContain('Quoted text');
  });

  it('handles list items', () => {
    const doc = createDocWithContent((fragment) => {
      const list = new Y.XmlElement('bulletList');
      const li1 = new Y.XmlElement('listItem');
      const p1 = new Y.XmlElement('paragraph');
      p1.insert(0, [new Y.XmlText('Item 1')]);
      li1.insert(0, [p1]);
      const li2 = new Y.XmlElement('listItem');
      const p2 = new Y.XmlElement('paragraph');
      p2.insert(0, [new Y.XmlText('Item 2')]);
      li2.insert(0, [p2]);
      list.insert(0, [li1, li2]);
      fragment.insert(0, [list]);
    });

    const text = yjsDocToText(doc);
    expect(text).toContain('Item 1');
    expect(text).toContain('Item 2');
  });

  it('does not produce excessive blank lines', () => {
    const doc = createDocWithContent((fragment) => {
      for (let i = 0; i < 5; i++) {
        const p = new Y.XmlElement('paragraph');
        p.insert(0, [new Y.XmlText(`Line ${i}`)]);
        fragment.insert(fragment.length, [p]);
      }
    });

    const text = yjsDocToText(doc);
    expect(text).not.toMatch(/\n{3,}/);
  });
});

describe('yjsStateToText', () => {
  it('extracts text from a binary state update', () => {
    const doc = createDocWithContent((fragment) => {
      const p = new Y.XmlElement('paragraph');
      p.insert(0, [new Y.XmlText('State text')]);
      fragment.insert(0, [p]);
    });

    const state = Y.encodeStateAsUpdate(doc);
    expect(yjsStateToText(state)).toBe('State text');
  });

  it('handles empty state', () => {
    const doc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(doc);
    expect(yjsStateToText(state)).toBe('');
  });

  it('accepts Buffer input', () => {
    const doc = createDocWithContent((fragment) => {
      const p = new Y.XmlElement('paragraph');
      p.insert(0, [new Y.XmlText('Buffer text')]);
      fragment.insert(0, [p]);
    });

    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    expect(yjsStateToText(state)).toBe('Buffer text');
  });
});
