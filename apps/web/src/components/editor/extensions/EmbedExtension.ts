import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';
import { matchProvider, toEmbedUrl } from './embed/embedProviders';
import EmbedNodeView from './EmbedNodeView.vue';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (url?: string) => ReturnType;
    };
  }
}

export const EmbedExtension = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
      embedUrl: { default: null },
      provider: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'embed' }), 0];
  },

  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: { attrs: { url: string | null } }
        ) {
          state.write(node.attrs.url ?? '');
          state.closeBlock(node);
        },
      },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(EmbedNodeView as Component);
  },

  addCommands() {
    return {
      insertEmbed:
        (url?: string) =>
        ({ chain }) => {
          const embedUrl = url ? (toEmbedUrl(url) ?? null) : null;
          const provider = url ? (matchProvider(url) ?? null) : null;
          return chain()
            .insertContent({
              type: 'embed',
              attrs: { url: url ?? null, embedUrl, provider },
            })
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')?.trim();
            if (!text || !/^https?:\/\/\S+$/.test(text) || text.includes('\n')) return false;

            const provider = matchProvider(text);
            if (!provider) return false;

            const embedUrl = toEmbedUrl(text);
            if (!embedUrl) return false;

            const embedType = view.state.schema.nodes['embed'];
            if (!embedType) return false;

            const embedNode = embedType.create({ url: text, embedUrl, provider });
            view.dispatch(view.state.tr.replaceSelectionWith(embedNode));
            return true;
          },
        },
      }),
    ];
  },
});
