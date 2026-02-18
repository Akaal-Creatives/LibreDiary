import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const SlashCommandExtension = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: { action: (editor: Editor) => void };
        }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
