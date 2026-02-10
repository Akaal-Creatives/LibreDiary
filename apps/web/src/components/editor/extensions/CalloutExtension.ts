import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'error' | 'success';

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
