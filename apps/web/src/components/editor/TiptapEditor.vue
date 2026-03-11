<script setup lang="ts">
import { ref, onBeforeUnmount, watch, shallowRef, computed } from 'vue';
import { Extension, Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import { useI18n } from 'vue-i18n';
import { SlashCommandExtension } from './slash-commands/SlashCommandExtension';
import { SLASH_COMMANDS, filterCommands } from './slash-commands/slashCommands';
import type { SlashCommand } from './slash-commands/slashCommands';
import SlashCommandMenu from './slash-commands/SlashCommandMenu.vue';
import { CodeBlockLowlightExtension } from './extensions/CodeBlockLowlight';
import { CalloutExtension } from './extensions/CalloutExtension';
import { ToggleNode, ToggleSummaryNode, ToggleContentNode } from './extensions/ToggleExtension';
import { TableOfContentsExtension } from './extensions/TableOfContentsExtension';
import { DragHandleExtension } from './extensions/DragHandleExtension';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { ImageUploadExtension } from './extensions/ImageUploadExtension';
import Typography from '@tiptap/extension-typography';
import { FootnoteExtension } from './extensions/FootnoteExtension';
import { MermaidExtension } from './extensions/MermaidExtension';
import { Markdown } from 'tiptap-markdown';
import { defineAsyncComponent } from 'vue';

const RawMarkdownEditor = defineAsyncComponent(() => import('./RawMarkdownEditor.vue'));
// Use yCursorPlugin from @tiptap/y-tiptap (same package as Collaboration) to ensure
// the ySyncPluginKey matches. The standalone @tiptap/extension-collaboration-cursor
// imports from y-prosemirror which creates a different PluginKey instance, causing a
// "Cannot read properties of undefined (reading 'doc')" crash.
import { yCursorPlugin, defaultSelectionBuilder } from '@tiptap/y-tiptap';
import type * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';

// Custom CollaborationCursor extension using yCursorPlugin from @tiptap/y-tiptap
// so the ySyncPluginKey is shared with the Collaboration extension.
const CollaborationCursor = Extension.create({
  name: 'collaborationCursor',

  addOptions() {
    return {
      provider: null as HocuspocusProvider | null,
      user: { name: 'Anonymous', color: '#6B8F71' },
    };
  },

  addStorage() {
    return { users: [] as Array<{ clientId: number; name?: string; color?: string }> };
  },

  // @ts-expect-error — custom command type not in tiptap's RawCommands interface
  addCommands() {
    return {
      updateUser: (attributes: { name?: string; color?: string }) => () => {
        this.options.user = attributes;
        this.options.provider?.awareness?.setLocalStateField('user', this.options.user);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const provider = this.options.provider as HocuspocusProvider;
    if (!provider?.awareness) return [];

    const awareness = provider.awareness;
    awareness.setLocalStateField('user', this.options.user);

    const updateUsers = () => {
      this.storage.users = Array.from(awareness.getStates().entries()).map(([clientId, state]) => ({
        clientId,
        ...(state as { user?: Record<string, unknown> }).user,
      }));
    };
    updateUsers();
    awareness.on('update', updateUsers);

    return [
      yCursorPlugin(awareness, {
        cursorBuilder: (user: { name?: string; color?: string }) => {
          const cursor = document.createElement('span');
          cursor.classList.add('collaboration-cursor__caret');
          cursor.setAttribute('style', `border-color: ${user.color}`);
          const label = document.createElement('div');
          label.classList.add('collaboration-cursor__label');
          label.setAttribute('style', `background-color: ${user.color}`);
          label.insertBefore(document.createTextNode(user.name || 'Anonymous'), null);
          cursor.insertBefore(label, null);
          return cursor;
        },
        selectionBuilder: defaultSelectionBuilder,
      }),
    ];
  },
});

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

// Editor mode: WYSIWYG or raw Markdown
const editorMode = ref<'wysiwyg' | 'markdown'>('wysiwyg');
const rawMarkdownContent = ref('');

function toggleEditorMode() {
  if (editorMode.value === 'wysiwyg') {
    // Switch to raw Markdown — extract current content
    if (editor.value) {
      const storage = editor.value.storage as any;
      if (storage?.markdown?.getMarkdown) {
        rawMarkdownContent.value = storage.markdown.getMarkdown();
      } else {
        rawMarkdownContent.value = editor.value.getHTML();
      }
    }
    editorMode.value = 'markdown';
  } else {
    // Switch back to WYSIWYG — import the raw Markdown
    if (editor.value && rawMarkdownContent.value) {
      editor.value.commands.setContent(rawMarkdownContent.value, { emitUpdate: true });
    }
    editorMode.value = 'wysiwyg';
  }
}

function onRawMarkdownUpdate(value: string) {
  rawMarkdownContent.value = value;
}

// Track if we've created a collaborative editor
const isCollaborativeEditor = ref(false);

// Slash command menu state
const { t } = useI18n();
const slashMenuVisible = ref(false);
const slashMenuSelectedIndex = ref(0);
const slashMenuCommands = ref<SlashCommand[]>([]);
const slashMenuClientRect = ref<(() => DOMRect) | null>(null);
let slashCommandRef: { command: (props: { action: (editor: Editor) => void }) => void } | null =
  null;

const resolvedLabels = computed(() => {
  const labels: Record<string, string> = {};
  for (const cmd of SLASH_COMMANDS) {
    labels[cmd.id] = t(cmd.labelKey);
  }
  return labels;
});

const slashMenuPosition = computed(() => {
  if (!slashMenuClientRect.value) return { top: '0px', left: '0px' };
  const rect = slashMenuClientRect.value();
  const menuHeight = 320;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Flip above if below would overflow
  const top = rect.bottom + menuHeight > viewportHeight ? rect.top - menuHeight : rect.bottom + 4;
  const left = rect.left;

  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 400,
  };
});

function handleSlashSelect(command: SlashCommand) {
  if (slashCommandRef) {
    slashCommandRef.command({ action: command.action });
  }
  slashMenuVisible.value = false;
}

function handleSlashNavigate(index: number) {
  slashMenuSelectedIndex.value = index;
}

// Build extensions based on mode
function buildExtensions(
  forCollaborative: boolean,
  ydoc?: Y.Doc | null,
  collabProvider?: HocuspocusProvider | null
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseExtensions: any[] = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
      // Disable built-in code block — replaced by CodeBlockLowlight with syntax highlighting
      codeBlock: false,
      // Disable history in collaborative mode - Yjs handles undo/redo
      // @ts-expect-error — StarterKit types don't expose history option but it works at runtime
      history: forCollaborative ? false : undefined,
    }),
    CodeBlockLowlightExtension,
    CalloutExtension,
    ToggleNode,
    ToggleSummaryNode,
    ToggleContentNode,
    TableOfContentsExtension,
    DragHandleExtension,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    ImageUploadExtension.configure({
      inline: false,
      allowBase64: false,
    }),
    Typography,
    FootnoteExtension,
    MermaidExtension,
    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: '-',
      transformPastedText: true,
      transformCopiedText: true,
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-node-empty',
    }),
    SlashCommandExtension.configure({
      suggestion: {
        char: '/',
        startOfLine: false,
        items: ({ query }: { query: string }) => {
          return filterCommands(query, resolvedLabels.value);
        },
        command: ({
          editor: e,
          range,
          props: cmdProps,
        }: {
          editor: any;
          range: any;
          props: any;
        }) => {
          e.chain().focus().deleteRange(range).run();
          cmdProps.action(e);
        },
        render: () => ({
          onStart: (suggestionProps: any) => {
            slashMenuCommands.value = suggestionProps.items;
            slashMenuSelectedIndex.value = 0;
            slashMenuClientRect.value = suggestionProps.clientRect;
            slashCommandRef = suggestionProps;
            slashMenuVisible.value = true;
          },
          onUpdate: (suggestionProps: any) => {
            slashMenuCommands.value = suggestionProps.items;
            slashMenuSelectedIndex.value = 0;
            slashMenuClientRect.value = suggestionProps.clientRect;
            slashCommandRef = suggestionProps;
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'Escape') {
              slashMenuVisible.value = false;
              return true;
            }
            if (event.key === 'ArrowDown') {
              slashMenuSelectedIndex.value =
                (slashMenuSelectedIndex.value + 1) % slashMenuCommands.value.length;
              return true;
            }
            if (event.key === 'ArrowUp') {
              slashMenuSelectedIndex.value =
                (slashMenuSelectedIndex.value - 1 + slashMenuCommands.value.length) %
                slashMenuCommands.value.length;
              return true;
            }
            if (event.key === 'Enter') {
              const cmd = slashMenuCommands.value[slashMenuSelectedIndex.value];
              if (cmd) {
                handleSlashSelect(cmd);
              }
              return true;
            }
            return false;
          },
          onExit: () => {
            slashMenuVisible.value = false;
            slashCommandRef = null;
          },
        }),
      },
    }),
  ];

  // Add Collaboration extension when in collaborative mode with ydoc
  if (forCollaborative && ydoc) {
    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
      })
    );

    // Add CollaborationCursor for real-time cursor positions
    // Guard: only add when provider and its awareness are ready
    if (collabProvider && collabProvider.awareness) {
      baseExtensions.push(
        CollaborationCursor.configure({
          provider: collabProvider,
          user: {
            name: props.userName,
            color: props.userColor,
          },
        })
      );
    }
  }

  return baseExtensions;
}

// Create the editor with graceful fallback:
// 1. Try collaborative + cursors
// 2. If that fails, try collaborative without cursors (document sync still works)
// 3. If that also fails, fall back to non-collaborative mode
function createEditor(
  forCollaborative: boolean,
  ydoc?: Y.Doc | null,
  collabProvider?: HocuspocusProvider | null
) {
  // Destroy existing editor
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorOptions: any = {
    content: props.modelValue || undefined,
    editable: props.editable,
    onUpdate: ({ editor: e }: { editor: Editor }) => {
      emit('update:modelValue', e.getHTML());
    },
  };

  if (forCollaborative && ydoc) {
    // Try with cursors first
    try {
      editor.value = new Editor({
        ...editorOptions,
        extensions: buildExtensions(true, ydoc, collabProvider),
      });
      isCollaborativeEditor.value = true;
      return;
    } catch (e) {
      console.warn('CollaborationCursor failed, retrying without cursors:', e);
      // Destroy the partially-created editor if any
      editor.value?.destroy();
      editor.value = null;
    }

    // Try collaborative without cursors (pass null for provider to skip cursor)
    try {
      editor.value = new Editor({
        ...editorOptions,
        extensions: buildExtensions(true, ydoc, null),
      });
      isCollaborativeEditor.value = true;
      return;
    } catch (e) {
      console.warn('Collaboration failed, falling back to non-collaborative mode:', e);
      editor.value?.destroy();
      editor.value = null;
    }
  }

  // Non-collaborative fallback
  editor.value = new Editor({
    ...editorOptions,
    extensions: buildExtensions(false),
  });
  isCollaborativeEditor.value = false;
}

// Initialize editor based on mode
if (props.collaborative) {
  // In collaborative mode, wait for ydoc to be available
  // Check that ydoc is a valid Y.Doc instance (not just truthy)
  if (props.ydoc && typeof props.ydoc.get === 'function') {
    createEditor(true, props.ydoc, props.provider);
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

// Watch for ydoc changes in collaborative mode
// When ydoc changes, provider changes too (both created together in useCollaboration)
watch(
  () => props.ydoc,
  (newYdoc, oldYdoc) => {
    // Check that ydoc is a valid Y.Doc instance
    if (props.collaborative && newYdoc && typeof newYdoc.get === 'function') {
      // Only recreate if ydoc actually changed
      if (newYdoc !== oldYdoc) {
        createEditor(true, newYdoc, props.provider);
      }
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

// Watch for user name/colour changes (for cursors)
watch([() => props.userName, () => props.userColor], ([name, color]) => {
  // Update cursor user via Tiptap command if CollaborationCursor is active
  if (editor.value && isCollaborativeEditor.value) {
    try {
      (editor.value.chain() as any).updateUser({ name, color }).run();
    } catch {
      // CollaborationCursor may not be loaded — fall through to provider update
    }
  }
  // Also update awareness on the provider directly
  if (props.provider) {
    props.provider.setAwarenessField('user', { name, color });
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
  get editorMode() {
    return editorMode.value;
  },
  toggleEditorMode,
});
</script>

<template>
  <div class="tiptap-editor">
    <template v-if="editorMode === 'wysiwyg'">
      <EditorContent v-if="editor" :editor="editor" class="editor-content" />
      <div v-else class="editor-loading">
        <span>Loading editor...</span>
      </div>
    </template>
    <template v-else>
      <RawMarkdownEditor
        :model-value="rawMarkdownContent"
        :read-only="collaborative"
        @update:model-value="onRawMarkdownUpdate"
      />
    </template>

    <Teleport to="body">
      <div
        v-if="slashMenuVisible && slashMenuCommands.length > 0"
        class="slash-menu-positioner"
        :style="slashMenuPosition"
      >
        <SlashCommandMenu
          :commands="slashMenuCommands"
          :selected-index="slashMenuSelectedIndex"
          @select="handleSlashSelect"
          @close="slashMenuVisible = false"
          @navigate="handleSlashNavigate"
        />
      </div>
    </Teleport>
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

.editor-content .ProseMirror h4 {
  margin-top: 0.75em;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: 1.45;
  color: var(--color-text-primary);
}

.editor-content .ProseMirror h5 {
  margin-top: 0.5em;
  font-size: var(--text-base);
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.editor-content .ProseMirror h6 {
  margin-top: 0.5em;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Paragraph */
.editor-content .ProseMirror p {
  font-size: var(--text-base);
  line-height: 1.75;
  color: var(--color-text-primary);
}

/* Lists */
.editor-content .ProseMirror ul:not([data-type='taskList']) {
  padding-left: 1.5em;
  list-style-type: disc;
}

.editor-content .ProseMirror ol {
  padding-left: 1.5em;
  list-style-type: decimal;
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

/* Nested blockquotes */
.editor-content .ProseMirror blockquote blockquote {
  margin: 0.75em 0;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border-left: 2px solid var(--color-border-strong);
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

.editor-content .ProseMirror hr.ProseMirror-selectednode {
  border-top-color: var(--color-accent);
  border-top-width: 2px;
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

/* Table selected cell */
.editor-content .ProseMirror .selectedCell::after {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: '';
  background: var(--color-accent-subtle);
}

.editor-content .ProseMirror .column-resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: -2px;
  width: 4px;
  pointer-events: none;
  background-color: var(--color-accent);
}

.editor-content .ProseMirror.resize-cursor {
  cursor: col-resize;
}

/* Strikethrough */
.editor-content .ProseMirror s {
  text-decoration: line-through;
  opacity: 0.7;
}

/* Slash command menu positioner */
.slash-menu-positioner {
  position: fixed;
  z-index: 400;
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

/* ==========================================================================
   Syntax-highlighted Code Blocks (lowlight)
   ========================================================================== */

.editor-content .ProseMirror pre code .hljs-comment,
.editor-content .ProseMirror pre code .hljs-quote {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.editor-content .ProseMirror pre code .hljs-keyword,
.editor-content .ProseMirror pre code .hljs-selector-tag,
.editor-content .ProseMirror pre code .hljs-built_in {
  color: var(--color-error);
}

.editor-content .ProseMirror pre code .hljs-string,
.editor-content .ProseMirror pre code .hljs-attr,
.editor-content .ProseMirror pre code .hljs-template-tag {
  color: var(--color-success);
}

.editor-content .ProseMirror pre code .hljs-number,
.editor-content .ProseMirror pre code .hljs-literal {
  color: var(--color-warning);
}

.editor-content .ProseMirror pre code .hljs-title,
.editor-content .ProseMirror pre code .hljs-section,
.editor-content .ProseMirror pre code .hljs-type {
  color: var(--color-accent);
}

.editor-content .ProseMirror pre code .hljs-variable,
.editor-content .ProseMirror pre code .hljs-params {
  color: var(--color-text-secondary);
}

/* ==========================================================================
   Callout Blocks
   ========================================================================== */

.editor-content .ProseMirror .callout {
  margin: var(--space-4) 0;
  padding: var(--space-4) var(--space-5);
  border-left: 3px solid;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.editor-content .ProseMirror .callout[data-callout-type='info'] {
  border-left-color: var(--color-info);
  background: var(--color-info-subtle);
}

.editor-content .ProseMirror .callout[data-callout-type='warning'] {
  border-left-color: var(--color-warning);
  background: var(--color-warning-subtle);
}

.editor-content .ProseMirror .callout[data-callout-type='error'] {
  border-left-color: var(--color-error);
  background: var(--color-error-subtle);
}

.editor-content .ProseMirror .callout[data-callout-type='success'] {
  border-left-color: var(--color-success);
  background: var(--color-success-subtle);
}

.editor-content .ProseMirror .callout p:first-child {
  margin-top: 0;
}

.editor-content .ProseMirror .callout p:last-child {
  margin-bottom: 0;
}

/* ==========================================================================
   Toggle / Collapsible Blocks
   ========================================================================== */

.editor-content .ProseMirror details.toggle-block {
  margin: var(--space-4) 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.editor-content .ProseMirror details.toggle-block summary.toggle-summary {
  padding: var(--space-3) var(--space-4);
  font-weight: 500;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.editor-content .ProseMirror details.toggle-block summary.toggle-summary::-webkit-details-marker {
  display: none;
}

.editor-content .ProseMirror details.toggle-block summary.toggle-summary::before {
  content: '';
  display: inline-block;
  width: 0;
  height: 0;
  margin-right: var(--space-2);
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 6px solid var(--color-text-tertiary);
  transition: transform var(--transition-fast);
  vertical-align: middle;
}

.editor-content .ProseMirror details.toggle-block[open] summary.toggle-summary::before {
  transform: rotate(90deg);
}

.editor-content .ProseMirror details.toggle-block .toggle-content {
  padding: 0 var(--space-4) var(--space-3);
  border-top: 1px solid var(--color-border);
}

/* ==========================================================================
   Table of Contents
   ========================================================================== */

.editor-content .ProseMirror .toc-block {
  margin: var(--space-4) 0;
  padding: var(--space-4);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
}

.editor-content .ProseMirror .toc-block .toc-title {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.editor-content .ProseMirror .toc-block .toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.editor-content .ProseMirror .toc-block .toc-item {
  padding: var(--space-1) 0;
}

.editor-content .ProseMirror .toc-block .toc-link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--text-sm);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.editor-content .ProseMirror .toc-block .toc-link:hover {
  color: var(--color-accent);
}

.editor-content .ProseMirror .toc-block .toc-level-2 {
  padding-left: var(--space-4);
}

.editor-content .ProseMirror .toc-block .toc-level-3 {
  padding-left: var(--space-8);
}

.editor-content .ProseMirror .toc-block .toc-level-4 {
  padding-left: calc(var(--space-8) + var(--space-4));
}

.editor-content .ProseMirror .toc-block .toc-level-5 {
  padding-left: calc(var(--space-8) + var(--space-8));
}

.editor-content .ProseMirror .toc-block .toc-level-6 {
  padding-left: calc(var(--space-8) + var(--space-8) + var(--space-4));
}

.editor-content .ProseMirror .toc-block .toc-empty {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  font-style: italic;
}

/* ==========================================================================
   Mermaid Diagrams
   ========================================================================== */

.editor-content .ProseMirror .mermaid-block {
  margin: var(--space-4) 0;
  padding: var(--space-4);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: relative;
}

.editor-content .ProseMirror .mermaid-edit-btn {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  padding: var(--space-1) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  z-index: 1;
}

.editor-content .ProseMirror .mermaid-edit-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.editor-content .ProseMirror .mermaid-code-input {
  width: 100%;
  min-height: 100px;
  padding: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
  outline: none;
  margin-bottom: var(--space-3);
}

.editor-content .ProseMirror .mermaid-code-input:focus {
  border-color: var(--color-accent);
}

.editor-content .ProseMirror .mermaid-diagram {
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

.editor-content .ProseMirror .mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}

.editor-content .ProseMirror .mermaid-error {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-md);
}

.editor-content .ProseMirror .mermaid-error code {
  font-size: var(--text-xs);
  word-break: break-all;
}

.editor-content .ProseMirror .mermaid-placeholder {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  font-style: italic;
}

/* ==========================================================================
   Footnotes
   ========================================================================== */

.editor-content .ProseMirror .footnote-ref {
  color: var(--color-accent);
  font-size: 0.75em;
  cursor: pointer;
  vertical-align: super;
  font-weight: 600;
}

.editor-content .ProseMirror .footnote-ref:hover {
  text-decoration: underline;
}

.editor-content .ProseMirror .footnote-content {
  margin: var(--space-2) 0;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  border-left: 2px solid var(--color-border);
}

.editor-content .ProseMirror .footnote-label {
  font-weight: 600;
  color: var(--color-accent);
}

/* ==========================================================================
   Drag Handle
   ========================================================================== */

.editor-content .drag-handle:hover {
  color: var(--color-text-secondary);
}

.editor-content .drop-indicator {
  background-color: var(--color-accent);
}
</style>
