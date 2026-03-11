import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableOfContents: {
      setTableOfContents: () => ReturnType;
    };
  }
}

export const TableOfContentsExtension = Node.create({
  name: 'tableOfContents',

  group: 'block',

  atom: true,

  selectable: true,

  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-table-of-contents]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-table-of-contents': '',
        class: 'table-of-contents',
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write('[TOC]');
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            // Find paragraphs containing only [TOC] and convert them
            element.querySelectorAll('p').forEach((p) => {
              if (p.textContent?.trim() === '[TOC]') {
                const div = element.ownerDocument.createElement('div');
                div.setAttribute('data-table-of-contents', '');
                div.className = 'table-of-contents';
                p.replaceWith(div);
              }
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      setTableOfContents:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },

  addNodeView() {
    return ({ editor }) => {
      const dom = document.createElement('div');
      dom.className = 'table-of-contents';
      dom.setAttribute('contenteditable', 'false');

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const extractHeadings = (doc: ProseMirrorNode): HeadingItem[] => {
        const headings: HeadingItem[] = [];

        doc.descendants((node, pos) => {
          if (node.type.name === 'heading' && node.attrs.level >= 1 && node.attrs.level <= 6) {
            headings.push({
              level: node.attrs.level,
              text: node.textContent,
              pos: pos + 1,
            });
          }
        });

        return headings;
      };

      const renderTOC = () => {
        while (dom.firstChild) {
          dom.removeChild(dom.firstChild);
        }

        const headings = extractHeadings(editor.state.doc);

        if (headings.length === 0) {
          const emptyState = document.createElement('p');
          emptyState.textContent = 'No headings found';
          emptyState.className = 'toc-empty';
          dom.appendChild(emptyState);
          return;
        }

        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'Table of contents');

        const ul = document.createElement('ul');
        ul.className = 'toc-list';

        headings.forEach((heading) => {
          const li = document.createElement('li');
          li.className = `toc-item toc-level-${heading.level}`;

          const link = document.createElement('a');
          link.textContent = heading.text || 'Untitled';
          link.href = '#';
          link.className = 'toc-link';

          link.addEventListener('click', (e) => {
            e.preventDefault();
            editor.commands.setTextSelection(heading.pos);
            editor.commands.scrollIntoView();
            editor.commands.focus();
          });

          li.appendChild(link);
          ul.appendChild(li);
        });

        nav.appendChild(ul);
        dom.appendChild(nav);
      };

      renderTOC();

      const updateHandler = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          renderTOC();
          debounceTimer = null;
        }, 200);
      };

      editor.on('transaction', updateHandler);

      return {
        dom,
        destroy() {
          if (debounceTimer) clearTimeout(debounceTimer);
          editor.off('transaction', updateHandler);
        },
      };
    };
  },
});
