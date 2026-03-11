import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import markdownItSup from 'markdown-it-sup';
import markdownItSub from 'markdown-it-sub';

/**
 * Superscript with markdown support: ^text^
 */
export const SuperscriptMarkdown = Superscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '^',
          close: '^',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parse: {
          setup(markdownit: any) {
            markdownit.use(markdownItSup);
          },
        },
      },
    };
  },
});

/**
 * Subscript with markdown support: ~text~
 */
export const SubscriptMarkdown = Subscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '~',
          close: '~',
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parse: {
          setup(markdownit: any) {
            markdownit.use(markdownItSub);
          },
        },
      },
    };
  },
});
