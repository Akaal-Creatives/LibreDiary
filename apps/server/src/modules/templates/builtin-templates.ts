/**
 * Built-in starter template definitions.
 *
 * Each template has metadata and Tiptap JSON content that gets converted
 * to Yjs binary state when seeded into the database.
 */
import type { TiptapNode } from '../../utils/tiptap-to-yjs.js';

export interface BuiltInTemplateDefinition {
  name: string;
  description: string;
  icon: string;
  category: string;
  content: TiptapNode;
}

// ---- Helper builders for concise content authoring ----

function doc(...content: TiptapNode[]): TiptapNode {
  return { type: 'doc', content };
}

function heading(level: number, text: string): TiptapNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(...parts: (string | TiptapNode)[]): TiptapNode {
  return {
    type: 'paragraph',
    content: parts.map((p) => (typeof p === 'string' ? { type: 'text', text: p } : p)),
  };
}

function bold(text: string): TiptapNode {
  return { type: 'text', text, marks: [{ type: 'bold' }] };
}

function bulletList(...items: TiptapNode[][]): TiptapNode {
  return {
    type: 'bulletList',
    content: items.map((itemContent) => ({
      type: 'listItem',
      content: itemContent.map((c) =>
        c.type === 'paragraph' || c.type === 'bulletList' ? c : paragraph(c as unknown as string)
      ),
    })),
  };
}

function taskList(...items: [boolean, string][]): TiptapNode {
  return {
    type: 'taskList',
    content: items.map(([checked, text]) => ({
      type: 'taskItem',
      attrs: { checked },
      content: [paragraph(text)],
    })),
  };
}

function horizontalRule(): TiptapNode {
  return { type: 'horizontalRule' };
}

function blockquote(...content: TiptapNode[]): TiptapNode {
  return { type: 'blockquote', content };
}

// ---- Template definitions ----

export const BUILTIN_TEMPLATES: BuiltInTemplateDefinition[] = [
  {
    name: 'Meeting Notes',
    description: 'Structured template for capturing meeting agendas, decisions, and action items.',
    icon: '📋',
    category: 'Meeting',
    content: doc(
      heading(1, 'Meeting Notes'),
      heading(2, 'Details'),
      bulletList(
        [paragraph(bold('Date: '), 'DD/MM/YYYY')],
        [paragraph(bold('Attendees: '))],
        [paragraph(bold('Facilitator: '))]
      ),
      horizontalRule(),
      heading(2, 'Agenda'),
      bulletList([paragraph('Topic 1')], [paragraph('Topic 2')], [paragraph('Topic 3')]),
      heading(2, 'Discussion Notes'),
      paragraph(''),
      heading(2, 'Decisions'),
      bulletList([paragraph('')]),
      heading(2, 'Action Items'),
      taskList(
        [false, 'Action item 1 — @owner'],
        [false, 'Action item 2 — @owner'],
        [false, 'Action item 3 — @owner']
      ),
      heading(2, 'Next Meeting'),
      paragraph('Date: ')
    ),
  },
  {
    name: 'Project Tracker',
    description: 'Plan and track project milestones, tasks, and progress.',
    icon: '🎯',
    category: 'Project',
    content: doc(
      heading(1, 'Project Name'),
      blockquote(paragraph('Brief description of the project goals and scope.')),
      heading(2, 'Overview'),
      bulletList(
        [paragraph(bold('Status: '), 'In Progress')],
        [paragraph(bold('Start Date: '), 'DD/MM/YYYY')],
        [paragraph(bold('Target Date: '), 'DD/MM/YYYY')],
        [paragraph(bold('Owner: '))]
      ),
      horizontalRule(),
      heading(2, 'Milestones'),
      taskList(
        [false, 'Milestone 1 — Define requirements'],
        [false, 'Milestone 2 — Design & prototyping'],
        [false, 'Milestone 3 — Implementation'],
        [false, 'Milestone 4 — Testing & QA'],
        [false, 'Milestone 5 — Launch']
      ),
      heading(2, 'Current Sprint'),
      heading(3, 'To Do'),
      taskList([false, 'Task 1'], [false, 'Task 2']),
      heading(3, 'In Progress'),
      taskList([false, 'Task 3']),
      heading(3, 'Done'),
      taskList([true, 'Initial planning']),
      heading(2, 'Risks & Blockers'),
      bulletList([paragraph('')]),
      heading(2, 'Notes'),
      paragraph('')
    ),
  },
  {
    name: 'Personal Journal',
    description: 'Daily journal template for reflections, gratitude, and personal growth.',
    icon: '📝',
    category: 'Personal',
    content: doc(
      heading(1, 'Journal Entry'),
      paragraph(bold('Date: '), 'DD/MM/YYYY'),
      horizontalRule(),
      heading(2, 'Gratitude'),
      bulletList([paragraph('I am grateful for...')], [paragraph('')], [paragraph('')]),
      heading(2, 'Reflections'),
      paragraph('How was today? What happened? What did I learn?'),
      paragraph(''),
      heading(2, 'Goals for Tomorrow'),
      taskList([false, 'Goal 1'], [false, 'Goal 2'], [false, 'Goal 3']),
      heading(2, 'Mood'),
      paragraph('How am I feeling right now?'),
      paragraph('')
    ),
  },
  {
    name: 'Team Wiki',
    description: 'Central knowledge base for team processes, guidelines, and resources.',
    icon: '📚',
    category: 'Team',
    content: doc(
      heading(1, 'Team Wiki'),
      paragraph(
        'Welcome to the team wiki. This is your central hub for documentation, processes, and resources.'
      ),
      horizontalRule(),
      heading(2, 'Getting Started'),
      bulletList(
        [paragraph('Onboarding checklist')],
        [paragraph('Tools and access setup')],
        [paragraph('Team communication channels')]
      ),
      heading(2, 'Processes'),
      heading(3, 'Development Workflow'),
      bulletList(
        [paragraph('Branch naming convention')],
        [paragraph('Code review process')],
        [paragraph('Deployment procedure')]
      ),
      heading(3, 'Communication'),
      bulletList(
        [paragraph('Daily standups')],
        [paragraph('Weekly team sync')],
        [paragraph('Retrospectives')]
      ),
      heading(2, 'Resources'),
      bulletList(
        [paragraph('Design system')],
        [paragraph('API documentation')],
        [paragraph('Architecture diagrams')]
      ),
      heading(2, 'Team Members'),
      bulletList([paragraph(bold('Name'), ' — Role')]),
      heading(2, 'FAQ'),
      paragraph('Add frequently asked questions and answers here.'),
      paragraph('')
    ),
  },
];
