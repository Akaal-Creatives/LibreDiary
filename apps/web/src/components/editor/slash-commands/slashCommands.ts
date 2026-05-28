import type { Editor, ChainedCommands } from '@tiptap/core';
import { createApp, ref } from 'vue';
import AiInputDialog from '@/components/editor/AiInputDialog.vue';
import { generateSchedule, generateTodos, createAiDatabase } from '@/services/ai-content.service';
import { useAuthStore } from '@/stores';
import { useToast } from '@/composables';

/**
 * Helper to cast a chained command to access custom extension commands
 * that are not part of Tiptap's built-in RawCommands interface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function custom(chain: ChainedCommands): any {
  return chain;
}

function openAiDialog(
  opts: { title: string; placeholder: string },
  onSubmit: (value: string) => Promise<void>
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const loading = ref(false);

  const app = createApp(AiInputDialog, {
    title: opts.title,
    placeholder: opts.placeholder,
    get loading() {
      return loading.value;
    },
    onSubmit: async (value: string) => {
      if (loading.value) return;
      loading.value = true;
      try {
        await onSubmit(value);
      } catch (err) {
        const { error } = useToast();
        error(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        loading.value = false;
        app.unmount();
        container.remove();
      }
    },
    onCancel: () => {
      if (loading.value) return;
      app.unmount();
      container.remove();
    },
  });
  app.mount(container);
}

export interface SlashCommand {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  group: string;
  keywords: string[];
  action: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'paragraph',
    labelKey: 'slashCommands.paragraph',
    descriptionKey: 'slashCommands.paragraphDescription',
    icon: 'M4 7V4h16v3M9 20h6M12 4v16',
    group: 'basic',
    keywords: ['text', 'plain', 'body'],
    action: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: 'heading1',
    labelKey: 'slashCommands.heading1',
    descriptionKey: 'slashCommands.heading1Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17 12l3-4M17 12l3 4',
    group: 'basic',
    keywords: ['h1', 'title', 'large'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 1 }).run();
    },
  },
  {
    id: 'heading2',
    labelKey: 'slashCommands.heading2',
    descriptionKey: 'slashCommands.heading2Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17.5 9.5a2.5 2.5 0 013 4l-3.5 3.5h4',
    group: 'basic',
    keywords: ['h2', 'subtitle', 'medium'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 2 }).run();
    },
  },
  {
    id: 'heading3',
    labelKey: 'slashCommands.heading3',
    descriptionKey: 'slashCommands.heading3Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17.5 10a2.5 2.5 0 011 4.5M17.5 14a2.5 2.5 0 011 4.5',
    group: 'basic',
    keywords: ['h3', 'small heading', 'section'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 3 }).run();
    },
  },
  {
    id: 'heading4',
    labelKey: 'slashCommands.heading4',
    descriptionKey: 'slashCommands.heading4Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17 10v8M15 10h4',
    group: 'basic',
    keywords: ['h4', 'heading', 'subsection'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 4 }).run();
    },
  },
  {
    id: 'heading5',
    labelKey: 'slashCommands.heading5',
    descriptionKey: 'slashCommands.heading5Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17 10h3l-3 4h3',
    group: 'basic',
    keywords: ['h5', 'heading', 'minor heading'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 5 }).run();
    },
  },
  {
    id: 'heading6',
    labelKey: 'slashCommands.heading6',
    descriptionKey: 'slashCommands.heading6Description',
    icon: 'M4 12h8M4 4v16M12 4v16M17.5 13a2 2 0 110 4 2 2 0 010-4zM19 10l-2 3',
    group: 'basic',
    keywords: ['h6', 'heading', 'smallest heading'],
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 6 }).run();
    },
  },
  {
    id: 'blockquote',
    labelKey: 'slashCommands.blockquote',
    descriptionKey: 'slashCommands.blockquoteDescription',
    icon: 'M6 17h3l2-4V7H5v6h3M13 17h3l2-4V7h-6v6h3',
    group: 'basic',
    keywords: ['quote', 'citation', 'blockquote'],
    action: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    id: 'codeBlock',
    labelKey: 'slashCommands.codeBlock',
    descriptionKey: 'slashCommands.codeBlockDescription',
    icon: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
    group: 'basic',
    keywords: ['code', 'pre', 'snippet', 'programming'],
    action: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: 'divider',
    labelKey: 'slashCommands.divider',
    descriptionKey: 'slashCommands.dividerDescription',
    icon: 'M5 12h14',
    group: 'basic',
    keywords: ['hr', 'horizontal rule', 'separator', 'line'],
    action: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    id: 'bulletList',
    labelKey: 'slashCommands.bulletList',
    descriptionKey: 'slashCommands.bulletListDescription',
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    group: 'lists',
    keywords: ['ul', 'unordered', 'bullets', 'list'],
    action: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'orderedList',
    labelKey: 'slashCommands.orderedList',
    descriptionKey: 'slashCommands.orderedListDescription',
    icon: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
    group: 'lists',
    keywords: ['ol', 'numbered', 'numbers', 'list'],
    action: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    id: 'taskList',
    labelKey: 'slashCommands.taskList',
    descriptionKey: 'slashCommands.taskListDescription',
    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    group: 'lists',
    keywords: ['task', 'todo', 'checklist', 'checkbox'],
    action: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  // Advanced blocks
  {
    id: 'table',
    labelKey: 'slashCommands.table',
    descriptionKey: 'slashCommands.tableDescription',
    icon: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
    group: 'advanced',
    keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
    action: (editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'image',
    labelKey: 'slashCommands.image',
    descriptionKey: 'slashCommands.imageDescription',
    icon: 'M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10m18 0l-4.5-4.5a1 1 0 00-1.4 0L9 16m12-1v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m6-5a2 2 0 11-4 0 2 2 0 014 0z',
    group: 'advanced',
    keywords: ['image', 'picture', 'photo', 'img'],
    action: (editor) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor.commands as any).uploadImage(file);
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    },
  },
  {
    id: 'embed',
    labelKey: 'slashCommands.embed',
    descriptionKey: 'slashCommands.embedDescription',
    icon: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
    group: 'advanced',
    keywords: ['embed', 'youtube', 'vimeo', 'figma', 'maps', 'video', 'iframe', 'link'],
    action: (editor) => {
      editor.commands.insertEmbed();
    },
  },
  {
    id: 'aiDatabase',
    labelKey: 'slashCommands.aiDatabase',
    descriptionKey: 'slashCommands.aiDatabaseDescription',
    icon: 'M3 10h18M3 14h18M3 6h18M3 18h18M9 6v12M15 6v12',
    group: 'advanced',
    keywords: ['ai', 'database', 'table', 'schema', 'generate'],
    action: (editor) => {
      const orgId = useAuthStore().currentOrganizationId;
      if (!orgId) return;
      openAiDialog(
        {
          title: 'AI Database',
          placeholder:
            'Describe your database… e.g. "a project tracker with name, status, deadline, and priority"',
        },
        async (description) => {
          const { databaseId, name } = await createAiDatabase(orgId, description);
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `${name} (AI-generated database)`,
                  marks: [{ type: 'link', attrs: { href: `/app/database/${databaseId}` } }],
                },
              ],
            })
            .run();
        }
      );
    },
  },
  {
    id: 'aiSchedule',
    labelKey: 'slashCommands.aiSchedule',
    descriptionKey: 'slashCommands.aiScheduleDescription',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    group: 'advanced',
    keywords: ['ai', 'schedule', 'calendar', 'plan', 'week', 'timetable'],
    action: (editor) => {
      const orgId = useAuthStore().currentOrganizationId;
      if (!orgId) return;
      openAiDialog(
        {
          title: 'AI Schedule',
          placeholder: 'Describe your schedule… e.g. "a typical engineering sprint week"',
        },
        async (description) => {
          const { content } = await generateSchedule(orgId, description);
          editor.chain().focus().insertContent(content).run();
        }
      );
    },
  },
  {
    id: 'aiTodos',
    labelKey: 'slashCommands.aiTodos',
    descriptionKey: 'slashCommands.aiTodosDescription',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    group: 'advanced',
    keywords: ['ai', 'todos', 'tasks', 'checklist', 'generate', 'list'],
    action: (editor) => {
      const orgId = useAuthStore().currentOrganizationId;
      if (!orgId) return;
      openAiDialog(
        {
          title: 'AI To-Do List',
          placeholder: 'Describe your goal… e.g. "tasks to launch a new mobile app"',
        },
        async (description) => {
          const { content } = await generateTodos(orgId, description);
          editor.chain().focus().insertContent(content).run();
        }
      );
    },
  },
  {
    id: 'calloutInfo',
    labelKey: 'slashCommands.calloutInfo',
    descriptionKey: 'slashCommands.calloutInfoDescription',
    icon: 'M12 16v-4M12 8h.01M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
    group: 'advanced',
    keywords: ['callout', 'info', 'note', 'tip'],
    action: (editor) => {
      custom(editor.chain().focus()).setCallout('info').run();
    },
  },
  {
    id: 'calloutWarning',
    labelKey: 'slashCommands.calloutWarning',
    descriptionKey: 'slashCommands.calloutWarningDescription',
    icon: 'M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    group: 'advanced',
    keywords: ['callout', 'warning', 'caution', 'alert'],
    action: (editor) => {
      custom(editor.chain().focus()).setCallout('warning').run();
    },
  },
  {
    id: 'calloutError',
    labelKey: 'slashCommands.calloutError',
    descriptionKey: 'slashCommands.calloutErrorDescription',
    icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'advanced',
    keywords: ['callout', 'error', 'danger', 'important'],
    action: (editor) => {
      custom(editor.chain().focus()).setCallout('error').run();
    },
  },
  {
    id: 'calloutSuccess',
    labelKey: 'slashCommands.calloutSuccess',
    descriptionKey: 'slashCommands.calloutSuccessDescription',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    group: 'advanced',
    keywords: ['callout', 'success', 'done', 'check'],
    action: (editor) => {
      custom(editor.chain().focus()).setCallout('success').run();
    },
  },
  {
    id: 'tableOfContents',
    labelKey: 'slashCommands.tableOfContents',
    descriptionKey: 'slashCommands.tableOfContentsDescription',
    icon: 'M4 6h16M4 12h10M4 18h14',
    group: 'advanced',
    keywords: ['toc', 'table of contents', 'outline', 'navigation'],
    action: (editor) => {
      custom(editor.chain().focus()).setTableOfContents().run();
    },
  },
  {
    id: 'toggle',
    labelKey: 'slashCommands.toggle',
    descriptionKey: 'slashCommands.toggleDescription',
    icon: 'M9 5l7 7-7 7',
    group: 'advanced',
    keywords: ['toggle', 'collapsible', 'accordion', 'details', 'expand'],
    action: (editor) => {
      custom(editor.chain().focus()).setToggle().run();
    },
  },
  {
    id: 'mermaidDiagram',
    labelKey: 'slashCommands.mermaidDiagram',
    descriptionKey: 'slashCommands.mermaidDiagramDescription',
    icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM9 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4zM7 10v4M17 10v1a2 2 0 01-2 2h-2M7 10h10',
    group: 'advanced',
    keywords: ['mermaid', 'diagram', 'chart', 'flowchart', 'graph', 'sequence'],
    action: (editor) => {
      custom(editor.chain().focus()).insertMermaidDiagram().run();
    },
  },
  {
    id: 'mathBlock',
    labelKey: 'slashCommands.mathBlock',
    descriptionKey: 'slashCommands.mathBlockDescription',
    icon: 'M7 4v16M17 4v16M4 12h16M6 4h2M6 20h2M16 4h2M16 20h2',
    group: 'advanced',
    keywords: ['math', 'latex', 'katex', 'equation', 'formula'],
    action: (editor) => {
      custom(editor.chain().focus()).insertMathBlock().run();
    },
  },
  {
    id: 'footnote',
    labelKey: 'slashCommands.footnote',
    descriptionKey: 'slashCommands.footnoteDescription',
    icon: 'M4 19h16M4 15h16M4 11h16M4 7h16M17 3v4M15 5h4',
    group: 'advanced',
    keywords: ['footnote', 'reference', 'citation', 'note'],
    action: (editor) => {
      custom(editor.chain().focus()).insertFootnote().run();
    },
  },
];

export function filterCommands(
  query: string,
  resolvedLabels?: Record<string, string>
): SlashCommand[] {
  if (!query) return SLASH_COMMANDS;

  const q = query.toLowerCase();

  return SLASH_COMMANDS.filter((cmd) => {
    if (cmd.id.toLowerCase().includes(q)) return true;
    if (cmd.keywords.some((kw) => kw.toLowerCase().includes(q))) return true;
    if (resolvedLabels) {
      const label = resolvedLabels[cmd.id];
      if (label && label.toLowerCase().includes(q)) return true;
    }
    return false;
  });
}
