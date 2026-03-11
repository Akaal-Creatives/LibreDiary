import 'katex/dist/katex.min.css';
import { Node, mergeAttributes } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';
import { defineComponent, ref, watch, onMounted, h } from 'vue';

/**
 * Vue component used as the NodeView for KaTeX math blocks.
 * Renders LaTeX expressions with KaTeX, with edit/preview toggle.
 */
const MathNodeView = defineComponent({
  name: 'MathNodeView',
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
    editor: { type: Object, required: true },
  },
  setup(props) {
    const renderedHtml = ref('');
    const errorMsg = ref('');
    const editing = ref(false);
    const latexInput = ref(props.node.attrs.latex || '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let katexLib: any = null;

    async function loadKatex() {
      if (katexLib) return katexLib;
      const k = await import('katex');
      katexLib = k.default;
      return katexLib;
    }

    async function renderMath(latex: string) {
      if (!latex.trim()) {
        renderedHtml.value = '';
        errorMsg.value = '';
        return;
      }
      try {
        const katex = await loadKatex();
        renderedHtml.value = katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        errorMsg.value = '';
      } catch (err) {
        errorMsg.value = String(err);
        renderedHtml.value = '';
      }
    }

    onMounted(() => {
      renderMath(latexInput.value);
    });

    watch(
      () => props.node.attrs.latex,
      (newLatex) => {
        latexInput.value = newLatex || '';
        renderMath(latexInput.value);
      }
    );

    function onInput(e: Event) {
      const value = (e.target as HTMLTextAreaElement).value;
      latexInput.value = value;
      props.updateAttributes({ latex: value });
      renderMath(value);
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
            class: 'math-edit-btn',
            onClick: toggleEdit,
            contenteditable: false,
          },
          editing.value ? 'Preview' : 'Edit'
        )
      );

      if (editing.value) {
        children.push(
          h('textarea', {
            class: 'math-code-input',
            value: latexInput.value,
            onInput,
            spellcheck: false,
            placeholder: 'Enter LaTeX expression...',
          })
        );
      }

      // Render maths or error
      if (renderedHtml.value) {
        children.push(
          h('div', {
            class: 'math-rendered',
            innerHTML: renderedHtml.value,
          })
        );
      } else if (errorMsg.value) {
        children.push(
          h('div', { class: 'math-error' }, [h('span', 'Math error: '), h('code', errorMsg.value)])
        );
      } else if (!latexInput.value.trim()) {
        children.push(h('div', { class: 'math-placeholder' }, 'Enter LaTeX expression...'));
      }

      return h(
        'div',
        {
          class: 'math-block',
          'data-type': 'mathBlock',
        },
        children
      );
    };
  },
});

/**
 * Tiptap Node extension for KaTeX maths blocks.
 * Stores the LaTeX source in a `latex` attribute and renders via a Vue NodeView.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */
export const MathBlockExtension = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      latex: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mathBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mathBlock' }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(MathNodeView as Component);
  },

  // @ts-expect-error — custom command type not in tiptap's RawCommands interface
  addCommands() {
    return {
      insertMathBlock:
        (latex?: string) =>
        ({ chain }: { chain: () => ChainedCommands }) => {
          return chain()
            .insertContent({
              type: 'mathBlock',
              attrs: { latex: latex || '' },
            })
            .run();
        },
    };
  },
});
