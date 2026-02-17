<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { EditorView } from '@codemirror/view';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    readOnly?: boolean;
  }>(),
  {
    modelValue: '',
    readOnly: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

async function initEditor(content?: string) {
  // Lazy-load CodeMirror to keep the initial bundle small
  const [{ EditorView: CMEditorView, basicSetup }, { markdown }, { oneDark }, { EditorState }] =
    await Promise.all([
      import('codemirror'),
      import('@codemirror/lang-markdown'),
      import('@codemirror/theme-one-dark'),
      import('@codemirror/state'),
    ]);

  if (!editorContainer.value) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extensions: any[] = [
    basicSetup,
    markdown(),
    oneDark,
    CMEditorView.lineWrapping,
    CMEditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString());
      }
    }),
  ];

  if (props.readOnly) {
    extensions.push(EditorState.readOnly.of(true));
  }

  view = new CMEditorView({
    state: EditorState.create({
      doc: content ?? props.modelValue,
      extensions,
    }),
    parent: editorContainer.value,
  });
}

onMounted(() => {
  initEditor();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (newVal !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: newVal },
      });
    }
  }
);

// Recreate the editor on readOnly change — simplest approach
// since Compartment-based reconfigure requires additional setup
watch(
  () => props.readOnly,
  () => {
    if (view && editorContainer.value) {
      const content = view.state.doc.toString();
      view.destroy();
      view = null;
      initEditor(content);
    }
  }
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="editorContainer" class="raw-markdown-editor" />
</template>

<style>
.raw-markdown-editor {
  min-height: 200px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.raw-markdown-editor .cm-editor {
  min-height: 200px;
}

.raw-markdown-editor .cm-editor .cm-scroller {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.raw-markdown-editor .cm-editor.cm-focused {
  outline: none;
}
</style>
