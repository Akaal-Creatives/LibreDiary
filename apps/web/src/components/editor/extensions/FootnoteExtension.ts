import { Node, mergeAttributes } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import type { Node as PmNode } from '@tiptap/pm/model';
import markdownItFootnote from 'markdown-it-footnote';

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

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const label = node.attrs.label || node.attrs.footnoteId || '?';
          state.write(`[^${label}]`);
        },
        parse: {},
      },
    };
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

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const label = node.attrs.label || node.attrs.footnoteId || '?';
          state.write(`[^${label}]: `);
          state.renderInline(node);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
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

  addStorage() {
    return {
      markdown: {
        serialize() {
          // Meta-extension — serialisation handled by child extensions
        },
        parse: {
          setup(markdownit: any) {
            markdownit.use(markdownItFootnote);
          },
          updateDOM(element: HTMLElement) {
            // markdown-it-footnote renders references as <sup class="footnote-ref">
            // with <a href="#fn1">[1]</a> inside, and definitions as
            // <section class="footnotes"><ol><li id="fn1">...</li></ol></section>

            // Convert footnote references
            element.querySelectorAll('sup.footnote-ref').forEach((sup) => {
              const anchor = sup.querySelector('a');
              if (!anchor) return;

              const href = anchor.getAttribute('href') || '';
              const idMatch = href.match(/#fn(\d+)$/);
              const label = (idMatch ? idMatch[1] : anchor.textContent) || '?';
              const footnoteId = `fn-${label}`;

              const newSup = element.ownerDocument.createElement('sup');
              newSup.setAttribute('data-footnote-ref', '');
              newSup.setAttribute('footnoteid', footnoteId);
              newSup.setAttribute('label', label);
              newSup.textContent = label;

              sup.replaceWith(newSup);
            });

            // Convert footnote definitions
            const footnotesSection = element.querySelector('section.footnotes');
            if (footnotesSection) {
              const items = footnotesSection.querySelectorAll('li[id^="fn"]');
              items.forEach((li) => {
                const idMatch = (li.getAttribute('id') || '').match(/^fn(\d+)$/);
                const label = (idMatch ? idMatch[1] : null) || '?';
                const footnoteId = `fn-${label}`;

                const div = element.ownerDocument.createElement('div');
                div.setAttribute('data-footnote-content', '');
                div.setAttribute('footnoteid', footnoteId);
                div.setAttribute('label', label);
                div.className = 'footnote-content';

                // Get text content (remove backref links)
                const backref = li.querySelector('a.footnote-backref');
                if (backref) backref.remove();

                // Extract inline content from the first <p> or use li content directly
                const firstP = li.querySelector('p');
                const contentSource = firstP || li;

                const labelSpan = element.ownerDocument.createElement('span');
                labelSpan.className = 'footnote-label';
                labelSpan.textContent = `[${label}] `;

                const textSpan = element.ownerDocument.createElement('span');
                textSpan.className = 'footnote-text';
                while (contentSource.firstChild) {
                  textSpan.appendChild(contentSource.firstChild);
                }

                div.appendChild(labelSpan);
                div.appendChild(textSpan);

                // Insert before the footnotes section
                footnotesSection.parentElement?.insertBefore(div, footnotesSection);
              });

              footnotesSection.remove();
            }
          },
        },
      },
    };
  },

  // @ts-expect-error — custom command type not in tiptap's RawCommands interface
  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ chain, state }: { chain: () => ChainedCommands; state: EditorState }) => {
          // Count existing footnotes to determine the next label
          let count = 0;
          state.doc.descendants((node: PmNode) => {
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
