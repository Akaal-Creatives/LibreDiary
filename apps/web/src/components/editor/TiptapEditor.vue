<script setup lang="ts">
import { ref, onBeforeUnmount, watch, shallowRef } from 'vue';
import { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import type * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    editable?: boolean;
    // Collaboration props
    collaborative?: boolean;
    ydoc?: Y.Doc | null;
    provider?: HocuspocusProvider | null;
    providerSynced?: boolean;
    userName?: string;
    userColor?: string;
  }>(),
  {
    modelValue: '',
    placeholder: "Start writing, or press '/' for commands...",
    editable: true,
    collaborative: false,
    ydoc: null,
    provider: null,
    providerSynced: false,
    userName: 'Anonymous',
    userColor: '#6B8F71',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// Use shallowRef to avoid reactivity issues with the Editor instance
const editor = shallowRef<Editor | null>(null);

// Track if we've created a collaborative editor
const isCollaborativeEditor = ref(false);

// Build extensions based on mode
// Note: CollaborationCursor is temporarily disabled due to initialization issues
// with the ySyncPlugin state not being accessible. This can be re-enabled once
// the timing issue between Collaboration and CollaborationCursor is resolved.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CollaborationCursor = CollaborationCursor; // Keep import for future use

function buildExtensions(forCollaborative: boolean, ydoc?: Y.Doc | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseExtensions: any[] = [
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
      // Disable history in collaborative mode - Yjs handles undo/redo
      history: forCollaborative ? false : undefined,
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-node-empty',
    }),
  ];

  // Add Collaboration extension when in collaborative mode with ydoc
  if (forCollaborative && ydoc) {
    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
      })
    );
  }

  return baseExtensions;
}

// Create the editor
function createEditor(forCollaborative: boolean, ydoc?: Y.Doc | null) {
  // Destroy existing editor
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }

  // In collaborative mode, we still pass modelValue as fallback content.
  // The Collaboration extension will use this as initial content if the
  // Yjs document is empty (e.g., first time loading a page with htmlContent).
  editor.value = new Editor({
    content: props.modelValue || undefined,
    editable: props.editable,
    extensions: buildExtensions(forCollaborative, ydoc),
    onUpdate: ({ editor: e }) => {
      emit('update:modelValue', e.getHTML());
    },
  });

  isCollaborativeEditor.value = forCollaborative && !!ydoc;
}

// Initialize editor based on mode
// Use try-catch to handle any errors during initialization
try {
  if (props.collaborative) {
    // In collaborative mode, wait for ydoc to be available
    // Check that ydoc is a valid Y.Doc instance (not just truthy)
    if (props.ydoc && typeof props.ydoc.get === 'function') {
      createEditor(true, props.ydoc);
    }
    // Otherwise, we'll create it when ydoc becomes available (via watch)
    else {
      // Start in non-collaborative mode immediately to show something
      createEditor(false);
    }
  } else {
    // Non-collaborative mode - create immediately
    createEditor(false);
  }
} catch (e) {
  console.error('Error initializing editor, falling back to non-collaborative mode:', e);
  createEditor(false);
}

// Watch for ydoc changes in collaborative mode
// Note: CollaborationCursor is temporarily disabled due to initialization issues
// TODO: Fix CollaborationCursor "Cannot read properties of undefined (reading 'doc')" error
watch(
  () => props.ydoc,
  (newYdoc, oldYdoc) => {
    try {
      // Check that ydoc is a valid Y.Doc instance
      if (props.collaborative && newYdoc && typeof newYdoc.get === 'function') {
        // Only recreate if ydoc actually changed
        if (newYdoc !== oldYdoc) {
          createEditor(true, newYdoc);
        }
      }
    } catch (e) {
      console.error('Error creating collaborative editor:', e);
    }
  },
  { immediate: false }
);

// Watch for content changes (non-collaborative mode only)
watch(
  () => props.modelValue,
  (newValue) => {
    if (!props.collaborative && editor.value && newValue !== editor.value.getHTML()) {
      editor.value.commands.setContent(newValue, { emitUpdate: false });
    }
  }
);

// Watch for editable changes
watch(
  () => props.editable,
  (editable) => {
    editor.value?.setEditable(editable);
  }
);

// Watch for user name/color changes (for cursors)
watch([() => props.userName, () => props.userColor], ([name, color]) => {
  if (props.provider) {
    props.provider.setAwarenessField('user', {
      name,
      color,
    });
  }
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// Expose editor instance directly (not the ref) for parent components
defineExpose({
  get editor() {
    return editor.value;
  },
});
</script>

<template>
  <div class="tiptap-editor">
    <EditorContent v-if="editor" :editor="editor" class="editor-content" />
    <div v-else class="editor-loading">
      <span>Loading editor...</span>
    </div>
  </div>
</template>

<style>
/* Tiptap Editor Styles - Using LibreDiary Design System */
.tiptap-editor {
  width: 100%;
  font-family: var(--font-sans);
}

.editor-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.editor-content {
  min-height: 200px;
}

.editor-content .ProseMirror {
  min-height: 200px;
  padding: var(--space-2) 0;
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
  color: var(--color-text-tertiary);
  content: attr(data-placeholder);
}

.editor-content .ProseMirror .is-node-empty:first-child::before {
  height: 0;
  float: left;
  pointer-events: none;
  color: var(--color-text-tertiary);
  content: attr(data-placeholder);
}

/* Heading styles */
.editor-content .ProseMirror h1 {
  margin-top: 1.5em;
  font-size: var(--text-3xl);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.editor-content .ProseMirror h2 {
  margin-top: 1.25em;
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.editor-content .ProseMirror h3 {
  margin-top: 1em;
  font-size: var(--text-xl);
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}

/* Paragraph */
.editor-content .ProseMirror p {
  font-size: var(--text-base);
  line-height: 1.75;
  color: var(--color-text-primary);
}

/* Lists */
.editor-content .ProseMirror ul,
.editor-content .ProseMirror ol {
  padding-left: 1.5em;
}

.editor-content .ProseMirror li {
  margin: 0.25em 0;
  color: var(--color-text-primary);
}

.editor-content .ProseMirror li p {
  margin: 0;
}

.editor-content .ProseMirror li::marker {
  color: var(--color-text-tertiary);
}

/* Blockquote */
.editor-content .ProseMirror blockquote {
  margin: 1.5em 0;
  padding: var(--space-4) var(--space-5);
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
  border-left: 3px solid var(--color-accent);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.editor-content .ProseMirror blockquote p {
  margin: 0;
  color: inherit;
}

/* Code */
.editor-content .ProseMirror code {
  padding: 0.2em 0.4em;
  font-family: var(--font-mono);
  font-size: 0.875em;
  color: var(--color-accent);
  background-color: var(--color-accent-subtle);
  border-radius: var(--radius-sm);
}

.editor-content .ProseMirror pre {
  padding: var(--space-4);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.875em;
  color: var(--color-text-primary);
  background-color: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.editor-content .ProseMirror pre code {
  padding: 0;
  color: inherit;
  background: none;
  border-radius: 0;
}

/* Horizontal rule */
.editor-content .ProseMirror hr {
  margin: var(--space-8) 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

/* Strong and emphasis */
.editor-content .ProseMirror strong {
  font-weight: 600;
  color: var(--color-text-primary);
}

.editor-content .ProseMirror em {
  font-style: italic;
}

/* Links */
.editor-content .ProseMirror a {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-color: var(--color-accent-muted);
  text-underline-offset: 2px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.editor-content .ProseMirror a:hover {
  text-decoration-color: var(--color-accent);
}

/* Selection */
.editor-content .ProseMirror ::selection {
  background: var(--color-accent-subtle);
}

/* Task lists (if enabled) */
.editor-content .ProseMirror ul[data-type='taskList'] {
  padding-left: 0;
  list-style: none;
}

.editor-content .ProseMirror ul[data-type='taskList'] li {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
}

.editor-content .ProseMirror ul[data-type='taskList'] li > label {
  flex-shrink: 0;
  margin-top: 0.25em;
}

.editor-content .ProseMirror ul[data-type='taskList'] li > label input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

/* Focus ring for accessibility */
.editor-content .ProseMirror:focus-visible {
  outline: none;
}

/* Image styles */
.editor-content .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
}

/* Table styles (if enabled) */
.editor-content .ProseMirror table {
  width: 100%;
  margin: var(--space-4) 0;
  border-collapse: collapse;
}

.editor-content .ProseMirror th,
.editor-content .ProseMirror td {
  padding: var(--space-3);
  text-align: left;
  border: 1px solid var(--color-border);
}

.editor-content .ProseMirror th {
  font-weight: 600;
  background: var(--color-surface-sunken);
}

/* Strikethrough */
.editor-content .ProseMirror s {
  text-decoration: line-through;
  opacity: 0.7;
}

/* Collaboration cursor styles */
.collaboration-cursor__caret {
  position: relative;
  margin-right: -1px;
  margin-left: -1px;
  pointer-events: none;
  word-break: normal;
  border-right: 1px solid;
  border-left: 1px solid;
}

.collaboration-cursor__label {
  position: absolute;
  top: -1.4em;
  left: -1px;
  padding: 0.1rem 0.3rem;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  color: white;
  white-space: nowrap;
  border-radius: 3px 3px 3px 0;
  user-select: none;
}
</style>
