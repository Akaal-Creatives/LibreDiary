import { Node, mergeAttributes } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';
import { defineComponent, ref, watch, onMounted, h } from 'vue';

/**
 * Vue component used as the NodeView for mermaid code blocks.
 * Lazy-loads mermaid and renders diagrams with debouncing.
 */
const MermaidNodeView = defineComponent({
  name: 'MermaidNodeView',
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
    editor: { type: Object, required: true },
  },
  setup(props) {
    const diagramHtml = ref('');
    const errorMsg = ref('');
    const editing = ref(false);
    const codeInput = ref(props.node.attrs.code || '');
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mermaidLib: any = null;

    async function loadMermaid() {
      if (mermaidLib) return mermaidLib;
      const m = await import('mermaid');
      mermaidLib = m.default;
      mermaidLib.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
      });
      return mermaidLib;
    }

    async function renderDiagram(code: string) {
      if (!code.trim()) {
        diagramHtml.value = '';
        errorMsg.value = '';
        return;
      }
      try {
        const mermaid = await loadMermaid();
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        diagramHtml.value = svg;
        errorMsg.value = '';
      } catch (err) {
        errorMsg.value = String(err);
        diagramHtml.value = '';
      }
    }

    function debouncedRender(code: string) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => renderDiagram(code), 500);
    }

    onMounted(() => {
      renderDiagram(codeInput.value);
    });

    watch(
      () => props.node.attrs.code,
      (newCode) => {
        codeInput.value = newCode || '';
        debouncedRender(codeInput.value);
      }
    );

    function onInput(e: Event) {
      const value = (e.target as HTMLTextAreaElement).value;
      codeInput.value = value;
      props.updateAttributes({ code: value });
      debouncedRender(value);
    }

    function toggleEdit() {
      editing.value = !editing.value;
    }

    return () => {
      const children = [];

      // Edit button
      children.push(
        h(
          'button',
          {
            class: 'mermaid-edit-btn',
            onClick: toggleEdit,
            contenteditable: false,
          },
          editing.value ? 'Preview' : 'Edit'
        )
      );

      if (editing.value) {
        children.push(
          h('textarea', {
            class: 'mermaid-code-input',
            value: codeInput.value,
            onInput,
            spellcheck: false,
            placeholder: 'Enter Mermaid diagram code...',
          })
        );
      }

      // Render diagram or error
      if (diagramHtml.value) {
        children.push(
          h('div', {
            class: 'mermaid-diagram',
            innerHTML: diagramHtml.value,
          })
        );
      } else if (errorMsg.value) {
        children.push(
          h('div', { class: 'mermaid-error' }, [
            h('span', 'Diagram error: '),
            h('code', errorMsg.value),
          ])
        );
      } else if (!codeInput.value.trim()) {
        children.push(h('div', { class: 'mermaid-placeholder' }, 'Enter Mermaid diagram code...'));
      }

      return h(
        'div',
        {
          class: 'mermaid-block',
          'data-type': 'mermaidDiagram',
        },
        children
      );
    };
  },
});

/**
 * Tiptap Node extension for Mermaid diagrams.
 * Stores the mermaid source in a `code` attribute and renders via a Vue NodeView.
 */
export const MermaidExtension = Node.create({
  name: 'mermaidDiagram',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: 'graph TD\n    A --> B' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaidDiagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaidDiagram' }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidNodeView as Component);
  },

  // @ts-expect-error — custom command type not in tiptap's RawCommands interface
  addCommands() {
    return {
      insertMermaidDiagram:
        (code?: string) =>
        ({ chain }: { chain: () => ChainedCommands }) => {
          return chain()
            .insertContent({
              type: 'mermaidDiagram',
              attrs: { code: code || 'graph TD\n    A --> B' },
            })
            .run();
        },
    };
  },
});
