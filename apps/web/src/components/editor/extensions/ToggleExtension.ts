import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
      unsetToggle: () => ReturnType;
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

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        // Cursor at start of toggleSummary → unwrap the entire toggle
        if ($from.parent.type.name === 'toggleSummary' && $from.parentOffset === 0) {
          return editor.commands.unsetToggle();
        }

        // Cursor at start of the first block inside toggleContent → join up into summary
        if ($from.parentOffset === 0) {
          for (let d = $from.depth - 1; d >= 0; d--) {
            if ($from.node(d).type.name === 'toggleContent') {
              // Only act if this is the first child of toggleContent
              const contentNode = $from.node(d);
              const firstChildPos = $from.before(d) + 1;
              const cursorBlockPos = $from.before($from.depth);
              if (cursorBlockPos === firstChildPos) {
                // Merge this block's inline content into the toggleSummary
                const toggleDepth = d - 1;
                const toggleNode = $from.node(toggleDepth);
                if (toggleNode.type.name !== 'toggle') break;

                const togglePos = $from.before(toggleDepth);
                const summaryNode = toggleNode.child(0);
                const summaryEnd = togglePos + 1 + summaryNode.nodeSize;
                const blockNode = $from.parent;

                if (blockNode.content.size === 0) {
                  // Empty first block — just delete it if there are more blocks
                  if (contentNode.childCount > 1) {
                    const { tr } = state;
                    tr.delete(cursorBlockPos, cursorBlockPos + blockNode.nodeSize);
                    tr.setSelection(TextSelection.create(tr.doc, summaryEnd - 1));
                    editor.view.dispatch(tr);
                    return true;
                  }
                  // Only block in content — unwrap the whole toggle
                  return editor.commands.unsetToggle();
                }

                // Non-empty first block — append its content to the summary
                const { tr } = state;
                const inlineContent = blockNode.content;
                // Insert inline content at end of summary
                tr.insert(summaryEnd - 1, inlineContent);
                // Delete the now-empty first block in toggleContent
                // Positions shifted by the insertion
                const shift = inlineContent.size;
                tr.delete(cursorBlockPos + shift, cursorBlockPos + shift + blockNode.nodeSize);
                tr.setSelection(TextSelection.create(tr.doc, summaryEnd - 1));
                editor.view.dispatch(tr);
                return true;
              }
              break;
            }
          }
        }

        return false;
      },
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

      unsetToggle:
        () =>
        ({ state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the toggle ancestor
          let toggleDepth = -1;
          for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'toggle') {
              toggleDepth = d;
              break;
            }
          }

          if (toggleDepth === -1) return false;

          const toggleNode = $from.node(toggleDepth);
          const togglePos = $from.before(toggleDepth);

          if (!dispatch) return true;

          const { tr } = state;
          const summaryNode = toggleNode.child(0);
          const contentNode = toggleNode.child(1);

          const nodes: ProseMirrorNode[] = [];

          // Convert summary text into a paragraph
          if (summaryNode.content.size > 0) {
            nodes.push(state.schema.nodes.paragraph!.create(null, summaryNode.content));
          }

          // Lift all blocks from toggleContent
          contentNode.forEach((child) => {
            nodes.push(child);
          });

          // Fallback: at least one empty paragraph
          if (nodes.length === 0) {
            nodes.push(state.schema.nodes.paragraph!.create());
          }

          tr.replaceWith(togglePos, togglePos + toggleNode.nodeSize, Fragment.from(nodes));

          // Place cursor at start of the first replacement node
          tr.setSelection(TextSelection.create(tr.doc, togglePos + 1));

          dispatch(tr);
          return true;
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
