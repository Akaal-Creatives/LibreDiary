import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'error' | 'success';

const CALLOUT_TYPES: readonly string[] = ['info', 'warning', 'error', 'success'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType;
      toggleCalloutType: (type: CalloutType) => ReturnType;
    };
  }
}

export const CalloutExtension = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-callout-type': attributes.type,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'callout' }), 0];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const type = node.attrs.type || 'info';
          state.write(`> [!${type}]\n`);
          node.content.forEach((child: any) => {
            state.write('> ');
            state.renderInline(child);
            state.ensureNewLine();
          });
          state.closeBlock(node);
        },
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('blockquote').forEach((bq) => {
              const firstP = bq.querySelector('p');
              if (!firstP) return;

              const textContent = firstP.textContent || '';
              const match = textContent.match(/^\[!(\w+)\]\s*/);
              if (!match) return;

              const calloutType = (match[1] || 'info').toLowerCase();
              if (!CALLOUT_TYPES.includes(calloutType)) return;

              // Remove the [!type] marker from the first paragraph's text
              const markerNode = firstP.firstChild;
              if (markerNode && markerNode.nodeType === 3 /* TEXT_NODE */) {
                markerNode.textContent = (markerNode.textContent ?? '').replace(/^\[!\w+\]\s*/, '');
              }

              // Convert blockquote to callout div
              const div = element.ownerDocument.createElement('div');
              div.setAttribute('data-callout-type', calloutType);
              div.className = 'callout';

              while (bq.firstChild) {
                div.appendChild(bq.firstChild);
              }

              // Remove empty first paragraph if the marker was the only content
              if (firstP.textContent?.trim() === '') {
                firstP.remove();
              }

              bq.replaceWith(div);
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      setCallout:
        (type: CalloutType = 'info') =>
        ({ commands }) => {
          return commands.wrapIn(this.name, { type });
        },

      toggleCalloutType:
        (type: CalloutType) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { type });
        },
    };
  },
});
