import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Inline footnote reference — renders as a clickable superscript number.
 * Stores a `footnoteId` attribute that links to the corresponding footnoteContent block.
 */
export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      footnoteId: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote-ref]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-ref': '',
        class: 'footnote-ref',
      }),
      HTMLAttributes.label || HTMLAttributes.footnoteId || '?',
    ];
  },
});

/**
 * Block-level footnote content — rendered at the bottom of the document.
 * Each footnote block holds its content and a `footnoteId` linking back to the reference.
 */
export const FootnoteContent = Node.create({
  name: 'footnoteContent',
  group: 'block',
  content: 'inline*',

  addAttributes() {
    return {
      footnoteId: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-footnote-content]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-content': '',
        class: 'footnote-content',
      }),
      [
        'span',
        { class: 'footnote-label' },
        `[${HTMLAttributes.label || HTMLAttributes.footnoteId || '?'}] `,
      ],
      ['span', { class: 'footnote-text' }, 0],
    ];
  },
});

/**
 * Convenience wrapper that registers both nodes and adds an `insertFootnote` command.
 */
export const FootnoteExtension = Node.create({
  name: 'footnote',

  // This is a meta-extension — it doesn't define its own schema node
  // but registers the two child extensions and provides the command.
  addExtensions() {
    return [FootnoteReference, FootnoteContent];
  },

  // @ts-expect-error — custom command type not in tiptap's RawCommands interface
  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ chain, state }: { chain: () => any; state: any }) => {
          // Count existing footnotes to determine the next label
          let count = 0;
          state.doc.descendants((node: any) => {
            if (node.type.name === 'footnoteReference') count++;
          });
          const label = String(count + 1);
          const footnoteId = `fn-${Date.now()}`;

          return chain()
            .insertContent({
              type: 'footnoteReference',
              attrs: { footnoteId, label },
            })
            .insertContentAt(state.doc.content.size, {
              type: 'footnoteContent',
              attrs: { footnoteId, label },
              content: [{ type: 'text', text: 'Footnote text' }],
            })
            .run();
        },
    };
  },
});
