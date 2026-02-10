import type { Editor } from '@tiptap/core';

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
