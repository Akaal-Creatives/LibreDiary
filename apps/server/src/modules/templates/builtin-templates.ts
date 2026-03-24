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
  if (parts.length === 0) return { type: 'paragraph' };
  return {
    type: 'paragraph',
    content: parts.map((p) => (typeof p === 'string' ? { type: 'text', text: p } : p)),
  };
}

function bold(text: string): TiptapNode {
  return { type: 'text', text, marks: [{ type: 'bold' }] };
}

function italic(text: string): TiptapNode {
  return { type: 'text', text, marks: [{ type: 'italic' }] };
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
        [paragraph(bold('Date: '), '24/03/2026')],
        [paragraph(bold('Time: '), '10:00 – 10:45 GMT')],
        [paragraph(bold('Attendees: '), 'Sarah Chen, James Okafor, Priya Sharma, Tom Eriksson')],
        [paragraph(bold('Facilitator: '), 'Sarah Chen')]
      ),
      horizontalRule(),
      heading(2, 'Agenda'),
      bulletList(
        [paragraph('Review Q1 sprint retrospective findings')],
        [paragraph('Discuss new feature prioritisation for Q2')],
        [paragraph('Align on updated deployment schedule')]
      ),
      heading(2, 'Discussion Notes'),
      paragraph(
        'Sarah opened the meeting by summarising the retrospective feedback. The team agreed that shorter sprint cycles (two weeks instead of three) improved delivery cadence. James raised concerns about test coverage dropping in the final sprint — the team discussed adding a dedicated QA day before each release.'
      ),
      paragraph(
        'Priya presented the Q2 feature proposals ranked by customer impact. The group debated whether to prioritise the offline mode (high demand, high effort) or the notification improvements (moderate demand, lower effort). After reviewing the customer survey data, the consensus was to begin with notifications and run offline mode as a parallel track.'
      ),
      paragraph(
        'Tom provided an update on the deployment pipeline. The new staging environment is ready and the canary deployment process has been tested successfully. He recommended a two-week burn-in period before enabling it for production releases.'
      ),
      heading(2, 'Decisions'),
      bulletList(
        [paragraph('Adopt two-week sprint cycles starting next quarter')],
        [paragraph('Prioritise notification improvements for Q2 Sprint 1')],
        [paragraph('Run offline mode as a parallel track with a dedicated sub-team')],
        [paragraph('Enable canary deployments for production after a two-week staging burn-in')]
      ),
      heading(2, 'Action Items'),
      taskList(
        [false, 'Update sprint board configuration for two-week cycles — @James, by 28/03'],
        [false, 'Draft the Q2 notification improvements RFC — @Priya, by 31/03'],
        [false, 'Set up offline mode project board and assign initial team — @Sarah, by 01/04'],
        [false, 'Schedule canary deployment burn-in review for 07/04 — @Tom, by 25/03'],
        [false, 'Share meeting notes with wider engineering team — @Sarah, today']
      ),
      heading(2, 'Next Meeting'),
      paragraph('31/03/2026 at 10:00 GMT — Q2 Sprint 1 kick-off')
    ),
  },
  {
    name: 'Project Tracker',
    description: 'Plan and track project milestones, tasks, and progress.',
    icon: '🎯',
    category: 'Project',
    content: doc(
      heading(1, 'Mobile App Redesign'),
      blockquote(
        paragraph(
          'Redesign the mobile application to improve user retention and onboarding conversion. Target: reduce drop-off during onboarding by 40% and increase daily active usage by 25%.'
        )
      ),
      heading(2, 'Overview'),
      bulletList(
        [paragraph(bold('Status: '), 'In Progress')],
        [paragraph(bold('Start Date: '), '10/02/2026')],
        [paragraph(bold('Target Date: '), '30/06/2026')],
        [paragraph(bold('Owner: '), 'Priya Sharma')],
        [paragraph(bold('Team: '), 'Design (2), Frontend (3), QA (1)')]
      ),
      horizontalRule(),
      heading(2, 'Milestones'),
      taskList(
        [true, 'Discovery & user research — completed 28/02'],
        [true, 'Wireframes and design system update — completed 21/03'],
        [false, 'Prototype and usability testing — due 18/04'],
        [false, 'Frontend implementation — due 30/05'],
        [false, 'QA, performance testing, and bug fixes — due 20/06'],
        [false, 'Staged rollout and monitoring — due 30/06']
      ),
      heading(2, 'Current Sprint'),
      paragraph(italic('Sprint 4 — 17/03 to 31/03')),
      heading(3, 'To Do'),
      taskList(
        [false, 'Implement new onboarding flow screens'],
        [false, 'Integrate updated illustration assets'],
        [false, 'Write accessibility tests for onboarding components']
      ),
      heading(3, 'In Progress'),
      taskList(
        [false, 'Build bottom navigation with gesture support — @Amir'],
        [false, 'Migrate profile settings to new design system tokens — @Lena']
      ),
      heading(3, 'Done'),
      taskList(
        [true, 'Initial planning and team allocation'],
        [true, 'Design system colour palette and typography update'],
        [true, 'Home screen layout with new card components'],
        [true, 'Set up automated visual regression tests']
      ),
      heading(2, 'Risks & Blockers'),
      bulletList(
        [
          paragraph(
            bold('API latency on older devices: '),
            'The redesigned home screen loads more data upfront. Mitigation: implement skeleton loaders and lazy-load below-the-fold content.'
          ),
        ],
        [
          paragraph(
            bold('Design handoff delays: '),
            'Illustration assets are pending final approval from brand. Fallback: use existing illustrations and swap later.'
          ),
        ]
      ),
      heading(2, 'Notes'),
      paragraph(
        'The usability study with 12 participants showed strong preference for the simplified onboarding flow (4 steps vs. previous 7). Two participants had difficulty finding the settings page — consider adding a contextual tooltip on first visit.'
      ),
      paragraph(
        'Performance budget: initial load must remain under 2.5s on 3G. Current prototype loads in 2.1s — within budget but leaves little headroom. Monitor closely during implementation.'
      )
    ),
  },
  {
    name: 'Personal Journal',
    description: 'Daily journal template for reflections, gratitude, and personal growth.',
    icon: '📝',
    category: 'Personal',
    content: doc(
      heading(1, 'Journal Entry'),
      paragraph(bold('Date: '), '24/03/2026'),
      horizontalRule(),
      heading(2, 'Gratitude'),
      bulletList(
        [
          paragraph(
            'I am grateful for the long conversation I had with Mum this morning — it reminded me how much I value those quiet, unhurried calls.'
          ),
        ],
        [
          paragraph(
            'Grateful for the sunshine after three days of rain. Managed to take a walk at lunch and it completely reset my energy for the afternoon.'
          ),
        ],
        [
          paragraph(
            'Thankful for my colleague Amir, who spotted a bug in my pull request that would have caused real headaches in production. Good teammates make all the difference.'
          ),
        ]
      ),
      heading(2, 'Reflections'),
      paragraph(
        'Today was a mixed bag. The morning started well — I finished the feature I had been stuck on since Friday. The trick was stepping away from the screen yesterday evening and coming back with fresh eyes. I keep re-learning this lesson: grinding through a problem past the point of diminishing returns is rarely the answer.'
      ),
      paragraph(
        'Had an awkward moment in the team standup where I realised I had completely forgotten about the design review. I need to be more disciplined about checking my calendar at the start of each day. Going to set a morning reminder for this.'
      ),
      paragraph(
        'Read an interesting article about spaced repetition during lunch. Thinking about trying it for learning Spanish — my Duolingo streak is solid but I am not retaining vocabulary as well as I would like.'
      ),
      heading(2, 'Goals for Tomorrow'),
      taskList(
        [false, 'Review and merge the onboarding PR before standup'],
        [false, 'Prepare talking points for the 1:1 with my manager'],
        [false, 'Go for a 20-minute run before work — no excuses'],
        [false, 'Spend 15 minutes on Spanish vocabulary (try Anki this time)']
      ),
      heading(2, 'Mood'),
      paragraph(
        'Feeling content and a little tired. The productive morning gave me a sense of accomplishment, but the afternoon slump hit hard around 3pm. Overall, a 7/10 day. Energy could be better — going to aim for an earlier bedtime tonight.'
      )
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
        'Welcome to the team wiki. This is your central hub for documentation, processes, and resources. If you are new to the team, start with the onboarding section below.'
      ),
      horizontalRule(),
      heading(2, 'Getting Started'),
      paragraph(italic('For new team members — complete these within your first week.')),
      taskList(
        [false, 'Read this wiki from top to bottom'],
        [false, 'Set up development environment (see setup guide)'],
        [false, 'Get access to GitHub, Slack, Linear, and Figma'],
        [false, 'Join the #engineering and #team-social Slack channels'],
        [false, 'Schedule 1:1 introductions with each team member'],
        [false, 'Complete your first "good first issue" and open a PR']
      ),
      heading(2, 'Processes'),
      heading(3, 'Development Workflow'),
      bulletList(
        [
          paragraph(
            bold('Branch naming: '),
            'Use the format ',
            italic('type/short-description'),
            ' — e.g. ',
            italic('feat/user-onboarding'),
            ', ',
            italic('fix/login-redirect'),
            ', ',
            italic('chore/update-deps')
          ),
        ],
        [
          paragraph(
            bold('Code review: '),
            'All PRs require at least one approval. Aim to review within 4 working hours. Leave constructive, specific comments — "this could be simpler" is less helpful than "consider extracting this into a helper function because…"'
          ),
        ],
        [
          paragraph(
            bold('Commit messages: '),
            'Follow Conventional Commits — ',
            italic('feat(scope): description'),
            '. This drives our automated changelog and versioning.'
          ),
        ],
        [
          paragraph(
            bold('Deployment: '),
            'Merges to ',
            italic('main'),
            ' trigger CI. On a successful build, semantic-release creates a version tag and Docker images are built automatically. Staging deploys immediately; production requires manual approval.'
          ),
        ]
      ),
      heading(3, 'Communication'),
      bulletList(
        [
          paragraph(
            bold('Daily standup: '),
            '09:30 GMT, 15 minutes max. Share what you did yesterday, what you are doing today, and any blockers. Post async updates in #standups if you cannot attend.'
          ),
        ],
        [
          paragraph(
            bold('Weekly team sync: '),
            'Tuesdays at 14:00 GMT. Longer-form discussion on priorities, demos, and cross-team coordination.'
          ),
        ],
        [
          paragraph(
            bold('Retrospectives: '),
            'Every two weeks on Friday at 15:00 GMT. We use the Start/Stop/Continue format. Notes are kept in the Retrospectives page.'
          ),
        ]
      ),
      heading(2, 'Resources'),
      bulletList(
        [
          paragraph(
            bold('Design system: '),
            'Figma workspace → "LibreDiary Design System" project'
          ),
        ],
        [paragraph(bold('API documentation: '), 'Available at /api/v1 on the running server')],
        [
          paragraph(
            bold('Architecture: '),
            'See the Architecture Decision Records (ADR) folder in the repository'
          ),
        ],
        [paragraph(bold('Monitoring: '), 'Grafana dashboard at grafana.internal/d/overview')],
        [paragraph(bold('Error tracking: '), 'Sentry project "librediary-production"')]
      ),
      heading(2, 'Team Members'),
      bulletList(
        [paragraph(bold('Sarah Chen'), ' — Engineering Lead')],
        [paragraph(bold('James Okafor'), ' — Senior Backend Engineer')],
        [paragraph(bold('Priya Sharma'), ' — Senior Frontend Engineer')],
        [paragraph(bold('Tom Eriksson'), ' — DevOps & Infrastructure')],
        [paragraph(bold('Amir Hassan'), ' — Full-stack Engineer')],
        [paragraph(bold('Lena Kowalski'), ' — Frontend Engineer')]
      ),
      heading(2, 'FAQ'),
      paragraph(bold('Q: How do I get access to the staging environment?')),
      paragraph(
        'A: Ask Tom in #infrastructure. You will need your SSH key added to the bastion host. Turnaround is usually same-day.'
      ),
      paragraph(bold('Q: What is the on-call rotation?')),
      paragraph(
        'A: We run a weekly rotation. Check the #oncall channel topic for the current responder. On-call expectations: acknowledge alerts within 15 minutes during working hours, 30 minutes out-of-hours.'
      ),
      paragraph(bold('Q: How do I propose a new tool or library?')),
      paragraph(
        'A: Open a lightweight ADR in the repository. Include the problem, options considered, and your recommendation. Discuss in the weekly sync before merging.'
      )
    ),
  },
];
