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
    return ['details', mergeAttributes(HTMLAttributes, { class: 'toggle-block', open: true }), 0];
  },

  addNodeView() {
    return ({ HTMLAttributes }) => {
      const details = document.createElement('details');
      details.classList.add('toggle-block');
      // Always keep open in the editor so content is editable
      details.open = true;
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          details.setAttribute(key, String(value));
        }
      });

      // Prevent native toggle from collapsing — it hides content from ProseMirror
      details.addEventListener('toggle', () => {
        if (!details.open) {
          details.open = true;
        }
      });

      const contentDOM = document.createElement('div');
      details.appendChild(contentDOM);

      return {
        dom: details,
        contentDOM,
      };
    };
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
