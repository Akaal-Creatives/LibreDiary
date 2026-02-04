<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    editable?: boolean;
  }>(),
  {
    modelValue: '',
    placeholder: "Start writing, or press '/' for commands...",
    editable: true,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-node-empty',
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML());
  },
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue, false);
    }
  }
);

watch(
  () => props.editable,
  (editable) => {
    editor.value?.setEditable(editable);
  }
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

defineExpose({
  editor,
});
</script>

<template>
  <div class="tiptap-editor">
    <EditorContent :editor="editor" class="editor-content" />
  </div>
</template>

<style>
/* Tiptap Editor Styles */
.tiptap-editor {
  width: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
    'Helvetica Neue', sans-serif;
}

.editor-content {
  min-height: 200px;
}

.editor-content .ProseMirror {
  min-height: 200px;
  padding: 8px 0;
  outline: none;
}

.editor-content .ProseMirror > * + * {
  margin-top: 0.75em;
}

/* Placeholder styles */
.editor-content .ProseMirror .is-editor-empty:first-child::before {
  height: 0;
  float: left;
  pointer-events: none;
  color: var(--va-secondary, #94a3b8);
  content: attr(data-placeholder);
}

.editor-content .ProseMirror .is-node-empty:first-child::before {
  height: 0;
  float: left;
  pointer-events: none;
  color: var(--va-secondary, #94a3b8);
  content: attr(data-placeholder);
}

/* Heading styles */
.editor-content .ProseMirror h1 {
  margin-top: 1.5em;
  font-size: 2em;
  font-weight: 700;
  line-height: 1.2;
}

.editor-content .ProseMirror h2 {
  margin-top: 1.25em;
  font-size: 1.5em;
  font-weight: 600;
  line-height: 1.3;
}

.editor-content .ProseMirror h3 {
  margin-top: 1em;
  font-size: 1.25em;
  font-weight: 600;
  line-height: 1.4;
}

/* Paragraph */
.editor-content .ProseMirror p {
  font-size: 1em;
  line-height: 1.7;
}

/* Lists */
.editor-content .ProseMirror ul,
.editor-content .ProseMirror ol {
  padding-left: 1.5em;
}

.editor-content .ProseMirror li {
  margin: 0.25em 0;
}

.editor-content .ProseMirror li p {
  margin: 0;
}

/* Blockquote */
.editor-content .ProseMirror blockquote {
  margin: 1em 0;
  padding-left: 1em;
  color: var(--va-secondary, #64748b);
  border-left: 3px solid var(--va-primary, #6366f1);
}

/* Code */
.editor-content .ProseMirror code {
  padding: 0.2em 0.4em;
  font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.875em;
  background-color: var(--va-surface-variant, #f1f5f9);
  border-radius: 4px;
}

.editor-content .ProseMirror pre {
  padding: 1em;
  overflow-x: auto;
  font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.875em;
  background-color: var(--va-surface-variant, #f1f5f9);
  border-radius: 8px;
}

.editor-content .ProseMirror pre code {
  padding: 0;
  background: none;
  border-radius: 0;
}

/* Horizontal rule */
.editor-content .ProseMirror hr {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid var(--va-surface-variant, #e2e8f0);
}

/* Strong and emphasis */
.editor-content .ProseMirror strong {
  font-weight: 600;
}

.editor-content .ProseMirror em {
  font-style: italic;
}

/* Links */
.editor-content .ProseMirror a {
  color: var(--va-primary, #6366f1);
  text-decoration: underline;
  cursor: pointer;
}

.editor-content .ProseMirror a:hover {
  text-decoration: none;
}

/* Selection */
.editor-content .ProseMirror ::selection {
  background: rgba(99, 102, 241, 0.2);
}

/* Task lists (if enabled) */
.editor-content .ProseMirror ul[data-type='taskList'] {
  padding-left: 0;
  list-style: none;
}

.editor-content .ProseMirror ul[data-type='taskList'] li {
  display: flex;
  gap: 0.5em;
  align-items: flex-start;
}

.editor-content .ProseMirror ul[data-type='taskList'] li > label {
  flex-shrink: 0;
  margin-top: 0.25em;
}
</style>
