import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

export const ToggleNode = Node.create({
  name: 'toggle',

  group: 'block',

  content: 'toggleSummary toggleContent',

  defining: true,

  parseHTML() {
    return [{ tag: 'details' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { class: 'toggle-block' }), 0];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'toggle',
            content: [
              {
                type: 'toggleSummary',
                content: [{ type: 'text', text: 'Toggle heading' }],
              },
              {
                type: 'toggleContent',
                content: [{ type: 'paragraph' }],
              },
            ],
          });
        },
    };
  },
});

export const ToggleSummaryNode = Node.create({
  name: 'toggleSummary',

  content: 'inline*',

  defining: true,

  parseHTML() {
    return [{ tag: 'summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes, { class: 'toggle-summary' }), 0];
  },
});

export const ToggleContentNode = Node.create({
  name: 'toggleContent',

  content: 'block+',

  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-toggle-content]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-toggle-content': '', class: 'toggle-content' }),
      0,
    ];
  },
});
