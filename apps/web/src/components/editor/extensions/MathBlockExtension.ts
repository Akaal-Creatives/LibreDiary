import 'katex/dist/katex.min.css';
import { Node, mergeAttributes } from '@tiptap/core';
import type { ChainedCommands } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';
import { defineComponent, ref, watch, onMounted, h } from 'vue';
import DOMPurify from 'dompurify';

/** Minimal KaTeX interface for dynamic import */
interface KaTeX {
  renderToString(latex: string, options?: Record<string, unknown>): string;
}

/** Markdown serialiser state (prosemirror-markdown) */
interface MarkdownSerializerState {
  write(text: string): void;
  text(text: string, escape?: boolean): void;
  ensureNewLine(): void;
  closeBlock(node: MarkdownNode): void;
}

interface MarkdownNode {
  attrs: Record<string, unknown>;
}

/** Minimal MarkdownIt interfaces for block rule and renderer */
interface MarkdownItBlockState {
  bMarks: number[];
  tShift: number[];
  eMarks: number[];
  src: string;
  line: number;
  push(type: string, tag: string, nesting: number): MarkdownItToken;
}

interface MarkdownItToken {
  content: string;
  map: [number, number] | null;
  attrSet(name: string, value: string): void;
  attrGet(name: string): string | null;
}

interface MarkdownItInstance {
  block: {
    ruler: {
      before(
        beforeName: string,
        ruleName: string,
        fn: (
          state: MarkdownItBlockState,
          startLine: number,
          endLine: number,
          silent: boolean
        ) => boolean
      ): void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: MarkdownItToken[], idx: number) => string>;
  };
}

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
    let katexLib: KaTeX | null = null;

    async function loadKatex(): Promise<KaTeX> {
      if (katexLib) return katexLib;
      const k = await import('katex');
      katexLib = k.default as KaTeX;
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
        const rawHtml = katex.renderToString(latex, {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        renderedHtml.value = DOMPurify.sanitize(rawHtml);
        errorMsg.value = '';
      } catch (err) {
        errorMsg.value = err instanceof Error ? err.message : String(err);
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

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: MarkdownNode) {
          state.write('$$\n');
          state.text(String(node.attrs.latex ?? ''), false);
          state.ensureNewLine();
          state.write('$$');
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: MarkdownItInstance) {
            // Add a block rule to parse $$...$$ as math blocks
            markdownit.block.ruler.before(
              'fence',
              'math_block',
              (
                state: MarkdownItBlockState,
                startLine: number,
                endLine: number,
                silent: boolean
              ) => {
                const startPos = state.bMarks[startLine]! + state.tShift[startLine]!;
                const maxPos = state.eMarks[startLine]!;

                if (startPos + 2 > maxPos) return false;
                if (state.src.slice(startPos, startPos + 2) !== '$$') return false;

                // Check there's nothing else on the opening line (or just whitespace)
                const restOfLine = state.src.slice(startPos + 2, maxPos).trim();
                if (restOfLine.length > 0) return false;

                if (silent) return true;

                let nextLine = startLine;
                let hasEnding = false;

                while (++nextLine < endLine) {
                  const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!;
                  const lineMax = state.eMarks[nextLine]!;
                  const lineText = state.src.slice(lineStart, lineMax).trim();

                  if (lineText === '$$') {
                    hasEnding = true;
                    break;
                  }
                }

                if (!hasEnding) return false;

                // Collect content between $$ markers
                const contentLines: string[] = [];
                for (let i = startLine + 1; i < nextLine; i++) {
                  contentLines.push(
                    state.src.slice(state.bMarks[i]! + state.tShift[i]!, state.eMarks[i]!)
                  );
                }

                const token = state.push('math_block', 'div', 0);
                token.content = contentLines.join('\n');
                token.map = [startLine, nextLine + 1];
                token.attrSet('data-type', 'mathBlock');
                token.attrSet('latex', token.content);

                state.line = nextLine + 1;
                return true;
              }
            );

            // Renderer for math_block tokens
            markdownit.renderer.rules.math_block = (tokens: MarkdownItToken[], idx: number) => {
              const token = tokens[idx]!;
              const latex = token.attrGet('latex') || token.content || '';
              return `<div data-type="mathBlock" latex="${latex.replace(/"/g, '&quot;')}"></div>`;
            };
          },
        },
      },
    };
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
