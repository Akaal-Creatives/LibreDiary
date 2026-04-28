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

  // ================================================================
  // WORK TEMPLATES
  // ================================================================

  {
    name: '1:1 Meeting',
    description: 'Structured template for regular one-on-one meetings with your manager or report.',
    icon: '🤝',
    category: 'Meeting',
    content: doc(
      heading(1, '1:1 Meeting'),
      bulletList(
        [paragraph(bold('Date: '), '24/03/2026')],
        [paragraph(bold('Participants: '), 'Sarah Chen & Amir Hassan')],
        [paragraph(bold('Cadence: '), 'Fortnightly, Mondays 11:00')]
      ),
      horizontalRule(),
      heading(2, 'Check-in'),
      paragraph(
        'How are you doing generally? Anything on your mind outside of work that might be affecting your focus?'
      ),
      paragraph(
        italic(
          'Amir mentioned he has been sleeping poorly due to a noisy building renovation next door. Agreed he can start later this week and make up the time in the afternoon.'
        )
      ),
      heading(2, 'Progress & Wins'),
      bulletList(
        [
          paragraph(
            'Shipped the new onboarding flow ahead of schedule — early metrics show a 15% improvement in completion rate.'
          ),
        ],
        [
          paragraph(
            'Pair-programmed with Lena on the notification service refactor. She mentioned it was really helpful for her ramp-up.'
          ),
        ]
      ),
      heading(2, 'Challenges'),
      bulletList(
        [
          paragraph(
            'Feeling stretched between the onboarding project and the ad-hoc bug fixes. Would like clearer prioritisation so I can protect focus time.'
          ),
        ],
        [
          paragraph(
            'The flaky integration test suite is slowing down every PR. Spending 15–20 minutes per PR waiting for retries.'
          ),
        ]
      ),
      heading(2, 'Growth & Development'),
      paragraph(
        'Amir expressed interest in leading the upcoming offline-mode project. Discussed what "tech lead" responsibilities would look like — owning the RFC, running design reviews, and mentoring the junior engineers on the sub-team.'
      ),
      paragraph(
        'Agreed to shadow Sarah in the next architecture review as a first step. Sarah will share the tech lead expectations document.'
      ),
      heading(2, 'Action Items'),
      taskList(
        [false, 'Sarah: Shield Amir from ad-hoc bug requests this sprint'],
        [false, 'Amir: Draft a proposal for fixing the flaky test suite'],
        [false, 'Sarah: Share tech lead expectations doc by Wednesday'],
        [false, 'Amir: Shadow Sarah in the architecture review on 02/04']
      ),
      heading(2, 'Parking Lot'),
      paragraph(italic('Topics to revisit next time:')),
      bulletList(
        [paragraph('Mid-year review preparation')],
        [paragraph('Conference budget for Q3')]
      )
    ),
  },
  {
    name: 'Weekly Status Report',
    description: 'Concise weekly update on progress, plans, and blockers for stakeholders.',
    icon: '📊',
    category: 'Work',
    content: doc(
      heading(1, 'Weekly Status Report'),
      bulletList(
        [paragraph(bold('Team: '), 'Platform Engineering')],
        [paragraph(bold('Week: '), '18/03 – 24/03/2026')],
        [paragraph(bold('Author: '), 'Tom Eriksson')]
      ),
      horizontalRule(),
      heading(2, 'Summary'),
      paragraph(
        'Good progress on the deployment pipeline migration. Staging environment is fully operational on the new infrastructure. Production cut-over preparation is underway. One blocker on the database migration tooling needs resolution before we can proceed.'
      ),
      heading(2, 'Completed This Week'),
      taskList(
        [true, 'Migrated staging environment to new Kubernetes cluster'],
        [true, 'Set up automated SSL certificate rotation'],
        [true, 'Completed load testing — sustained 2,500 req/s with p99 < 200ms'],
        [true, 'Updated runbooks for the new deployment process'],
        [true, 'Onboarded James to the infrastructure on-call rotation']
      ),
      heading(2, 'In Progress'),
      bulletList(
        [
          paragraph(
            bold('Production migration plan: '),
            '70% complete. Drafting the rollback procedure and coordinating the maintenance window with customer success.'
          ),
        ],
        [
          paragraph(
            bold('Database migration tooling: '),
            'Blocked — see below. Investigating alternative approaches.'
          ),
        ],
        [
          paragraph(
            bold('Monitoring dashboard redesign: '),
            '40% complete. New Grafana panels for pod health and request latency are live. Alert rules still pending.'
          ),
        ]
      ),
      heading(2, 'Planned for Next Week'),
      taskList(
        [false, 'Finalise production migration plan and get sign-off'],
        [false, 'Resolve database migration blocker'],
        [false, 'Complete monitoring alert rules and test escalation paths'],
        [false, 'Run disaster recovery drill on staging']
      ),
      heading(2, 'Blockers & Risks'),
      bulletList([
        paragraph(
          bold('Database migration tool incompatibility: '),
          'The pgloader version in our toolchain does not support the new partitioned tables. Evaluating pg_dump/pg_restore as an alternative. ',
          italic('Impact: may delay production cut-over by 3–5 days if not resolved by Wednesday.')
        ),
      ]),
      heading(2, 'Metrics'),
      bulletList(
        [paragraph(bold('Uptime: '), '99.97% (target: 99.9%)')],
        [paragraph(bold('Deployment frequency: '), '14 deploys this week (up from 9 last week)')],
        [paragraph(bold('Mean time to recovery: '), '4 minutes (one incident, auto-resolved)')],
        [paragraph(bold('Open incidents: '), '0')]
      )
    ),
  },
  {
    name: 'Decision Log',
    description: 'Architecture Decision Record (ADR) for documenting technical decisions.',
    icon: '⚖️',
    category: 'Work',
    content: doc(
      heading(1, 'ADR-007: Adopt PostgreSQL for Primary Data Store'),
      bulletList(
        [paragraph(bold('Status: '), 'Accepted')],
        [paragraph(bold('Date: '), '15/03/2026')],
        [paragraph(bold('Author: '), 'James Okafor')],
        [paragraph(bold('Reviewers: '), 'Sarah Chen, Tom Eriksson')]
      ),
      horizontalRule(),
      heading(2, 'Context'),
      paragraph(
        'We are building a multi-tenant document collaboration platform that requires ACID transactions, full-text search, and JSON document storage. The application needs to support complex queries across relational data (users, organisations, permissions) while also storing semi-structured content (page metadata, database rows, webhook payloads).'
      ),
      paragraph(
        'Our team has strong experience with PostgreSQL and limited experience with MongoDB. The hosting infrastructure already includes managed PostgreSQL instances.'
      ),
      heading(2, 'Options Considered'),
      heading(3, 'Option 1: PostgreSQL'),
      bulletList(
        [paragraph('Mature, battle-tested relational database')],
        [paragraph('Native JSONB support for semi-structured data')],
        [paragraph('Built-in full-text search with tsvector/tsquery')],
        [paragraph('Strong ecosystem (Prisma, pgBouncer, pg_stat_statements)')],
        [paragraph('Already available in our infrastructure')]
      ),
      heading(3, 'Option 2: MongoDB'),
      bulletList(
        [paragraph('Flexible document model suits varied content shapes')],
        [paragraph('Horizontal scaling via sharding')],
        [paragraph('Atlas Search for full-text search')],
        [paragraph('Steeper learning curve for the team')],
        [paragraph('Would require new infrastructure provisioning')]
      ),
      heading(3, 'Option 3: PostgreSQL + Elasticsearch'),
      bulletList(
        [paragraph('PostgreSQL for relational data, Elasticsearch for search')],
        [paragraph('Best-in-class search capabilities')],
        [paragraph('Significant operational overhead — two systems to maintain')],
        [paragraph('Data synchronisation complexity')]
      ),
      heading(2, 'Decision'),
      paragraph(
        bold('We will use PostgreSQL as the sole primary data store'),
        ', leveraging JSONB columns for semi-structured data and the built-in full-text search for the initial release. Meilisearch will be added as an optional enhancement for advanced search if the built-in capabilities prove insufficient.'
      ),
      heading(2, 'Rationale'),
      bulletList(
        [paragraph('Simplicity: one database to operate, back up, and monitor')],
        [
          paragraph(
            'Team expertise: the entire team is proficient with PostgreSQL, reducing ramp-up time'
          ),
        ],
        [paragraph('JSONB covers our semi-structured needs without sacrificing query performance')],
        [
          paragraph(
            'Built-in FTS is sufficient for our scale (< 1M documents) and avoids sync complexity'
          ),
        ],
        [paragraph('Infrastructure already provisioned and hardened')]
      ),
      heading(2, 'Consequences'),
      bulletList(
        [
          paragraph(
            bold('Positive: '),
            'Faster development, simpler operations, lower infrastructure cost'
          ),
        ],
        [
          paragraph(
            bold('Negative: '),
            'Full-text search is less feature-rich than Elasticsearch. If we need fuzzy matching, typo tolerance, or faceted search, we will need to introduce Meilisearch later.'
          ),
        ],
        [
          paragraph(
            bold('Mitigation: '),
            'Search is abstracted behind a service interface so the implementation can be swapped without changing the API contract.'
          ),
        ]
      )
    ),
  },
  {
    name: 'Interview Scorecard',
    description: 'Structured evaluation form for candidate interviews.',
    icon: '🎤',
    category: 'Work',
    content: doc(
      heading(1, 'Interview Scorecard'),
      bulletList(
        [paragraph(bold('Candidate: '), 'Alex Rivera')],
        [paragraph(bold('Role: '), 'Senior Frontend Engineer')],
        [paragraph(bold('Interview Date: '), '22/03/2026')],
        [paragraph(bold('Interviewer: '), 'Priya Sharma')],
        [paragraph(bold('Stage: '), 'Technical Interview (Round 2 of 3)')]
      ),
      horizontalRule(),
      heading(2, 'Technical Skills'),
      paragraph(bold('Rating: Strong Hire')),
      paragraph(
        'Alex demonstrated deep understanding of React component architecture and state management. When given the live coding exercise (build a paginated data table with sorting), they wrote clean, well-structured code with proper TypeScript types. They proactively added error boundaries and loading states without being asked.'
      ),
      paragraph(
        'Particularly impressed by their explanation of React rendering optimisation — they identified a performance issue in the mock codebase (unnecessary re-renders from context) and proposed both memo and a restructured component hierarchy as solutions.'
      ),
      heading(2, 'System Design'),
      paragraph(bold('Rating: Hire')),
      paragraph(
        'Asked Alex to design a real-time collaborative editor. They outlined a solid CRDT-based approach, mentioned Yjs by name, and discussed the trade-offs between operational transform and CRDTs. Their understanding of WebSocket connection management and offline-first considerations was above average for the level.'
      ),
      paragraph(
        'Area for improvement: they did not deeply explore the data persistence layer or consider how to handle large documents efficiently. When prompted, they acknowledged the gap and proposed chunked loading as a mitigation.'
      ),
      heading(2, 'Communication & Collaboration'),
      paragraph(bold('Rating: Strong Hire')),
      paragraph(
        'Alex was articulate and structured in their responses. They thought aloud clearly during the coding exercise, making it easy to follow their reasoning. When they hit a bug, they calmly debugged it rather than getting flustered. Asked thoughtful clarifying questions before starting each task.'
      ),
      heading(2, 'Culture & Values'),
      paragraph(bold('Rating: Hire')),
      paragraph(
        'Spoke enthusiastically about mentoring junior developers at their current company. Described a situation where they pushed back on a tight deadline by presenting data on technical debt accumulation — showed good judgement and courage.'
      ),
      heading(2, 'Overall Recommendation'),
      paragraph(
        bold('Strong Hire'),
        '. Alex is a technically strong candidate with excellent communication skills. Their React and TypeScript expertise exceeds the bar for senior level. The only minor gap is in backend/infrastructure design, which is acceptable for a frontend-focused role. I would recommend proceeding to the final round.'
      ),
      heading(2, 'Questions for Next Round'),
      bulletList(
        [paragraph('Probe deeper into their experience leading projects end-to-end')],
        [
          paragraph(
            'Discuss their approach to cross-team collaboration (design, backend, product)'
          ),
        ],
        [paragraph('Explore their long-term career goals and alignment with our team direction')]
      )
    ),
  },

  // ================================================================
  // TEAM TEMPLATES
  // ================================================================

  {
    name: 'Sprint Retrospective',
    description: 'Facilitate team retrospectives with the Start/Stop/Continue format.',
    icon: '🔄',
    category: 'Team',
    content: doc(
      heading(1, 'Sprint Retrospective'),
      bulletList(
        [paragraph(bold('Sprint: '), 'Sprint 14 (10/03 – 24/03/2026)')],
        [paragraph(bold('Facilitator: '), 'James Okafor')],
        [paragraph(bold('Attendees: '), 'Sarah, James, Priya, Tom, Amir, Lena')]
      ),
      horizontalRule(),
      heading(2, 'Sprint Summary'),
      paragraph(
        'Delivered 18 of 21 planned story points (86%). Shipped the notification improvements feature and completed the annotation layer foundation. Carried over 3 points related to the image export edge cases.'
      ),
      heading(2, 'Start'),
      paragraph(italic('Things we should begin doing.')),
      bulletList(
        [
          paragraph(
            bold('Dedicated QA day before release: '),
            'We shipped two bugs to staging this sprint that a focused testing session would have caught. Propose reserving the last day of each sprint for QA.'
          ),
        ],
        [
          paragraph(
            bold('Async standup option: '),
            'Half the team is in different time zones now. A written standup in Slack by 10:00 would let everyone contribute without early morning calls.'
          ),
        ],
        [
          paragraph(
            bold('Design review before implementation: '),
            'Amir spent a day building a component that was later redesigned. Reviewing designs before starting code would save time.'
          ),
        ]
      ),
      heading(2, 'Stop'),
      paragraph(italic('Things we should stop doing.')),
      bulletList(
        [
          paragraph(
            bold('Merging PRs on Friday afternoon: '),
            'Two of the three bugs this sprint came from Friday merges that nobody monitored over the weekend.'
          ),
        ],
        [
          paragraph(
            bold('Overcommitting in sprint planning: '),
            'We have over-scoped the last three sprints. Better to plan for 80% capacity and pull in stretch goals if we have time.'
          ),
        ]
      ),
      heading(2, 'Continue'),
      paragraph(italic('Things that are working well.')),
      bulletList(
        [
          paragraph(
            bold('Pair programming sessions: '),
            'Lena and Amir found these extremely valuable for knowledge sharing. Priya and James also paired on the sync composable and delivered it faster than estimated.'
          ),
        ],
        [
          paragraph(
            bold('TDD approach: '),
            'Test coverage has improved from 72% to 84% since we adopted test-first. Bug count in staging is noticeably lower.'
          ),
        ],
        [
          paragraph(
            bold('Weekly demo to stakeholders: '),
            'Product and design teams appreciate the visibility. Getting early feedback has prevented two scope misalignments this sprint.'
          ),
        ]
      ),
      heading(2, 'Action Items'),
      taskList(
        [false, 'James: Add "No Friday merges" to the team working agreement'],
        [false, 'Sarah: Trial async standups next sprint and review at next retro'],
        [false, 'Priya: Set up a design review checkpoint in the sprint workflow'],
        [false, 'Tom: Configure CI to block merges after 16:00 on Fridays']
      )
    ),
  },
  {
    name: 'Incident Post-Mortem',
    description: 'Blameless post-mortem template for analysing and learning from incidents.',
    icon: '🚨',
    category: 'Team',
    content: doc(
      heading(1, 'Incident Post-Mortem: API Outage'),
      bulletList(
        [paragraph(bold('Incident ID: '), 'INC-2026-042')],
        [paragraph(bold('Severity: '), 'SEV-2 (Partial service disruption)')],
        [paragraph(bold('Date: '), '20/03/2026')],
        [paragraph(bold('Duration: '), '47 minutes (14:23 – 15:10 GMT)')],
        [paragraph(bold('Author: '), 'Tom Eriksson')],
        [paragraph(bold('Reviewers: '), 'Sarah Chen, James Okafor')]
      ),
      horizontalRule(),
      heading(2, 'Summary'),
      paragraph(
        'The API became unresponsive for approximately 47 minutes due to a connection pool exhaustion in the PostgreSQL database. This affected all authenticated API endpoints. The web application showed "Failed to load" errors for page content. Unauthenticated endpoints (login, public pages) remained operational.'
      ),
      heading(2, 'Impact'),
      bulletList(
        [paragraph(bold('Users affected: '), '~340 active users during the incident window')],
        [paragraph(bold('Revenue impact: '), 'None (no paid tier affected)')],
        [
          paragraph(
            bold('Data loss: '),
            'None. All in-flight writes were queued and processed after recovery.'
          ),
        ],
        [paragraph(bold('SLA impact: '), 'Monthly uptime dropped from 99.98% to 99.89%')]
      ),
      heading(2, 'Timeline'),
      bulletList(
        [
          paragraph(
            bold('14:15 — '),
            'Deployment of v1.6.1 completed. Included a database migration adding an index to the audit_logs table.'
          ),
        ],
        [
          paragraph(
            bold('14:23 — '),
            'First alerts fire: API response times exceed 5s threshold. PagerDuty notifies on-call (Tom).'
          ),
        ],
        [
          paragraph(
            bold('14:28 — '),
            'Tom begins investigation. Database CPU at 95%, connection count at max (100/100).'
          ),
        ],
        [
          paragraph(
            bold('14:35 — '),
            'Root cause identified: the CREATE INDEX migration acquired a long-held lock on audit_logs, blocking all writes. Queued transactions consumed all connections.'
          ),
        ],
        [
          paragraph(
            bold('14:42 — '),
            'Attempted to cancel the migration via pg_cancel_backend. Lock released.'
          ),
        ],
        [
          paragraph(
            bold('14:50 — '),
            'Connection pool began draining. Response times improving but still elevated.'
          ),
        ],
        [
          paragraph(
            bold('15:10 — '),
            'Full recovery confirmed. All metrics returned to baseline. Incident resolved.'
          ),
        ]
      ),
      heading(2, 'Root Cause'),
      paragraph(
        'The database migration ran CREATE INDEX without the CONCURRENTLY option. On the audit_logs table (2.3M rows), this acquired an exclusive lock that blocked all INSERT and UPDATE operations. As application threads waited for locks, the connection pool filled up and new requests could not acquire connections.'
      ),
      heading(2, 'Contributing Factors'),
      bulletList(
        [paragraph('No policy requiring CONCURRENTLY for index creation on large tables')],
        [paragraph('Migration was not tested against production-sized data in staging')],
        [
          paragraph(
            'Connection pool size (100) was adequate for normal load but insufficient to absorb a lock queue'
          ),
        ],
        [paragraph('No automated check in CI to flag non-concurrent index migrations')]
      ),
      heading(2, 'Corrective Actions'),
      taskList(
        [false, 'Add a CI linter that rejects CREATE INDEX without CONCURRENTLY — @Tom, by 27/03'],
        [
          false,
          'Increase connection pool to 200 and add a pool exhaustion alert at 80% — @Tom, by 25/03',
        ],
        [
          false,
          'Add a "migration testing with production data volume" step to the deploy checklist — @James, by 28/03',
        ],
        [
          false,
          'Re-run the index creation with CONCURRENTLY during a low-traffic window — @Tom, by 25/03',
        ],
        [
          false,
          'Document this incident pattern in the team wiki under "Common Pitfalls" — @Sarah, by 31/03',
        ]
      ),
      heading(2, 'Lessons Learned'),
      bulletList(
        [
          paragraph(
            'Database migrations on large tables need special attention. Always use CONCURRENTLY for index creation in production.'
          ),
        ],
        [
          paragraph(
            'Our alerting worked well — the on-call was notified within 5 minutes. The gap was in diagnosis speed, not detection.'
          ),
        ],
        [
          paragraph(
            'The blameless approach helped: the engineer who wrote the migration identified the fix themselves and will present this post-mortem to the team as a learning opportunity.'
          ),
        ]
      )
    ),
  },
  {
    name: 'New Starter Onboarding',
    description: 'Comprehensive onboarding checklist for new team members.',
    icon: '🎒',
    category: 'Team',
    content: doc(
      heading(1, 'New Starter Onboarding'),
      bulletList(
        [paragraph(bold('Name: '), 'Lena Kowalski')],
        [paragraph(bold('Role: '), 'Frontend Engineer')],
        [paragraph(bold('Start Date: '), '03/03/2026')],
        [paragraph(bold('Buddy: '), 'Priya Sharma')],
        [paragraph(bold('Manager: '), 'Sarah Chen')]
      ),
      horizontalRule(),
      heading(2, 'Day 1'),
      taskList(
        [true, 'Laptop and equipment collected from IT'],
        [true, 'Email and Slack accounts activated'],
        [true, 'Welcome meeting with manager (30 min)'],
        [true, 'Read the Team Wiki page'],
        [true, 'Join Slack channels: #engineering, #team-social, #standups, #deployments'],
        [true, 'Set up 1:1 calendar invite with manager (fortnightly)']
      ),
      heading(2, 'Week 1'),
      taskList(
        [true, 'Complete HR onboarding paperwork'],
        [true, 'Set up development environment (follow setup guide)'],
        [true, 'Get access to GitHub, Linear, Figma, and Sentry'],
        [true, 'Schedule 30-min intros with each team member'],
        [true, 'Read the Architecture Decision Records folder'],
        [true, 'Shadow a code review with buddy'],
        [false, 'Pick up and complete a "good first issue"'],
        [false, 'Open your first pull request']
      ),
      heading(2, 'Week 2–4'),
      taskList(
        [false, 'Complete 3–5 small issues to learn the codebase'],
        [false, 'Attend and contribute to sprint planning'],
        [false, 'Present a small demo in the weekly team sync'],
        [false, 'Set up local end-to-end test suite and run it successfully'],
        [false, 'Review at least 2 pull requests from other team members'],
        [false, 'Write your first set of unit tests for a feature you built'],
        [false, 'Read the deployment runbook and understand the release process']
      ),
      heading(2, 'Month 2–3'),
      taskList(
        [false, 'Take ownership of a medium-sized feature'],
        [false, 'Join the on-call rotation (shadow first, then primary)'],
        [false, 'Write or update a page in the team wiki'],
        [false, 'Participate in a sprint retrospective and contribute action items'],
        [false, 'Discuss 90-day goals with manager and document them']
      ),
      heading(2, 'Notes'),
      paragraph(
        'Lena settled in quickly during the first week. She had her dev environment running by Tuesday and opened her first PR on Thursday. Her buddy Priya reported that Lena asks excellent questions and is proactive about reading documentation before asking for help.'
      ),
      paragraph(
        'One area to watch: Lena mentioned she has limited experience with Yjs and CRDTs. Priya will schedule a knowledge-sharing session on the collaboration layer during Week 2.'
      )
    ),
  },

  // ================================================================
  // PERSONAL TEMPLATES
  // ================================================================

  {
    name: 'Reading Notes',
    description: 'Capture key takeaways, quotes, and reflections from books and articles.',
    icon: '📖',
    category: 'Personal',
    content: doc(
      heading(1, 'Deep Work — Cal Newport'),
      bulletList(
        [paragraph(bold('Type: '), 'Non-fiction / Productivity')],
        [paragraph(bold('Started: '), '10/03/2026')],
        [paragraph(bold('Finished: '), '22/03/2026')],
        [paragraph(bold('Rating: '), '★★★★☆ (4/5)')]
      ),
      horizontalRule(),
      heading(2, 'Summary'),
      paragraph(
        'Newport argues that the ability to perform "deep work" — focused, uninterrupted cognitive effort — is becoming increasingly rare and increasingly valuable. He contrasts this with "shallow work" (email, meetings, Slack) that feels productive but generates little lasting value. The book provides strategies for cultivating deep work habits.'
      ),
      heading(2, 'Key Takeaways'),
      bulletList(
        [
          paragraph(
            bold('Deep work is a skill, not a talent. '),
            'Like any skill, it can be trained and strengthened through deliberate practice. Starting with 60–90 minute focused blocks and gradually extending is more sustainable than attempting 4-hour stretches immediately.'
          ),
        ],
        [
          paragraph(
            bold('Attention residue is real. '),
            'When you switch tasks, part of your attention stays on the previous task for 10–20 minutes. This means "quick checks" of email between deep work sessions are far more costly than they seem.'
          ),
        ],
        [
          paragraph(
            bold('Schedule every minute of your day. '),
            'Not to be rigid, but to be intentional. Time-blocking forces you to make conscious decisions about how you spend your hours rather than reacting to whatever arrives in your inbox.'
          ),
        ],
        [
          paragraph(
            bold('Embrace boredom. '),
            'If you reach for your phone every time you are waiting in a queue, you are training your brain to need constant stimulation. This makes deep focus harder.'
          ),
        ]
      ),
      heading(2, 'Favourite Quotes'),
      blockquote(
        paragraph(
          italic(
            '"The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy. As a consequence, the few who cultivate this skill, and then make it the core of their working life, will thrive."'
          )
        )
      ),
      blockquote(
        paragraph(
          italic(
            '"If you don\'t produce, you won\'t thrive — no matter how skilled or talented you are."'
          )
        )
      ),
      heading(2, 'How I Will Apply This'),
      taskList(
        [false, 'Block 09:00–11:00 as deep work time on my calendar (no meetings, no Slack)'],
        [false, 'Move email checks to three fixed times: 08:30, 12:30, 16:30'],
        [false, 'Delete social media apps from my phone for a 30-day trial'],
        [false, 'Start a "deep work hours" log to track my weekly total']
      ),
      heading(2, 'Related Reading'),
      bulletList(
        [
          paragraph(
            italic('Digital Minimalism'),
            ' — Cal Newport (already read, complements this)'
          ),
        ],
        [paragraph(italic('Flow'), ' — Mihaly Csikszentmihalyi (on the to-read list)')],
        [paragraph(italic('Atomic Habits'), ' — James Clear (for building the routines)')]
      )
    ),
  },
  {
    name: 'Quarterly Goals',
    description: 'Set and track personal or professional goals with measurable outcomes.',
    icon: '🎯',
    category: 'Personal',
    content: doc(
      heading(1, 'Q2 2026 Goals'),
      paragraph(bold('Review Date: '), '01/04/2026'),
      paragraph(
        'Focus areas this quarter: technical leadership, health, and creative projects. Fewer goals, done well, rather than an overwhelming list.'
      ),
      horizontalRule(),
      heading(2, 'Professional'),
      heading(3, '1. Lead the offline-mode project from RFC to launch'),
      bulletList(
        [paragraph(bold('Measure: '), 'Feature shipped to 100% of users by 30/06')],
        [paragraph(bold('Key results:'))],
        [
          paragraph('    RFC approved by 15/04'),
          paragraph('    Beta with 10% of users by 31/05'),
          paragraph('    Full rollout by 30/06'),
        ]
      ),
      paragraph(
        italic(
          'Why this matters: this is my first tech lead opportunity. Demonstrating I can own a project end-to-end opens the door to a senior engineer promotion.'
        )
      ),
      heading(3, '2. Improve system design skills'),
      bulletList(
        [paragraph(bold('Measure: '), 'Complete 12 system design practice problems (3 per month)')],
        [
          paragraph(
            bold('Resources: '),
            'Designing Data-Intensive Applications (book), ByteByteGo (newsletter), weekly practice with a study partner'
          ),
        ]
      ),
      heading(2, 'Health & Wellbeing'),
      heading(3, '3. Run 3 times per week consistently'),
      bulletList(
        [paragraph(bold('Measure: '), 'Log at least 12 runs per month in Strava')],
        [
          paragraph(
            bold('Stretch goal: '),
            'Complete a 10K race in under 55 minutes by end of June'
          ),
        ]
      ),
      heading(3, '4. Improve sleep quality'),
      bulletList(
        [paragraph(bold('Measure: '), 'Average 7+ hours per night (tracked via watch)')],
        [
          paragraph(
            bold('Actions: '),
            'No screens after 22:00, consistent 23:00 bedtime, no caffeine after 14:00'
          ),
        ]
      ),
      heading(2, 'Creative'),
      heading(3, '5. Write and publish 6 blog posts'),
      bulletList(
        [paragraph(bold('Measure: '), '6 posts published on personal blog (2 per month)')],
        [
          paragraph(
            bold('Topics: '),
            'Technical deep dives from work projects, book reviews, lessons learned'
          ),
        ]
      ),
      heading(2, 'Monthly Check-ins'),
      bulletList(
        [paragraph(bold('April: '), '(to be filled)')],
        [paragraph(bold('May: '), '(to be filled)')],
        [paragraph(bold('June: '), '(to be filled, plus end-of-quarter review)')]
      )
    ),
  },
  {
    name: 'Travel Planner',
    description: 'Organise trip details, itinerary, packing, and budget in one place.',
    icon: '✈️',
    category: 'Personal',
    content: doc(
      heading(1, 'Lisbon, Portugal'),
      bulletList(
        [paragraph(bold('Dates: '), '18/04 – 23/04/2026 (5 nights)')],
        [paragraph(bold('Travellers: '), '2 (with partner)')],
        [paragraph(bold('Budget: '), '€1,200 total (excluding flights)')],
        [paragraph(bold('Flights: '), 'BA 502 LHR→LIS dep 07:15, BA 507 LIS→LHR dep 18:40')]
      ),
      horizontalRule(),
      heading(2, 'Accommodation'),
      paragraph(
        bold('Hotel: '),
        'The Lumiares, Bairro Alto. Confirmed booking ref: LUM-28491. Check-in from 15:00, check-out by 11:00. Rooftop bar with views over the city — worth visiting on the first evening.'
      ),
      heading(2, 'Itinerary'),
      heading(3, 'Day 1 — Friday 18/04 (Arrival)'),
      bulletList(
        [paragraph('Arrive LIS 10:30 local time. Metro to Baixa-Chiado (€1.50 per person)')],
        [paragraph('Check in and freshen up')],
        [paragraph('Lunch at Time Out Market — try the seafood rice at Marlene Vieira')],
        [
          paragraph(
            'Afternoon walk through Alfama district. Visit São Jorge Castle (€10 entry, book online to skip the queue)'
          ),
        ],
        [paragraph('Dinner at Taberna da Rua das Flores (book ahead — tiny, always full)')]
      ),
      heading(3, 'Day 2 — Saturday 19/04 (Belém)'),
      bulletList(
        [paragraph('Tram 15E to Belém (or Uber, ~€8)')],
        [
          paragraph(
            'Jerónimos Monastery (free entry before 10:00 on Sundays — but this is Saturday, €10)'
          ),
        ],
        [paragraph('Pastéis de Belém — the original pastel de nata. Go early, queue moves fast')],
        [paragraph('MAAT museum (€9, interesting architecture alone)')],
        [paragraph('Walk along the waterfront back towards the city')]
      ),
      heading(3, 'Day 3 — Sunday 20/04 (Day trip to Sintra)'),
      bulletList(
        [paragraph('Train from Rossio to Sintra (40 min, €2.30)')],
        [paragraph('Pena Palace (€14, book timed entry online)')],
        [paragraph('Walk down through the gardens to the town centre')],
        [paragraph('Lunch in Sintra town — Incomum is excellent')],
        [paragraph('Moorish Castle if energy permits (€8)')],
        [paragraph('Return to Lisbon by 18:00')]
      ),
      heading(3, 'Day 4 — Monday 21/04'),
      paragraph(
        'Flexible day. Options: Feira da Ladra flea market (Tuesday/Saturday only — skip), LX Factory for brunch and shopping, or a food tour of Mouraria neighbourhood.'
      ),
      heading(3, 'Day 5 — Tuesday 22/04 (Last full day)'),
      bulletList(
        [paragraph('Morning at Feira da Ladra flea market')],
        [paragraph('Miradouro da Graça for coffee and city views')],
        [paragraph('Final pastel de nata run')],
        [paragraph('Pack and prepare for early transfer tomorrow')]
      ),
      heading(2, 'Packing Checklist'),
      taskList(
        [false, 'Passport and boarding passes (digital)'],
        [false, 'Travel insurance documents'],
        [false, 'Comfortable walking shoes (cobblestones!)'],
        [false, 'Light layers — April is 15–22°C'],
        [false, 'Sunscreen and sunglasses'],
        [false, 'Portable battery pack'],
        [false, 'EU plug adapter'],
        [false, 'Reusable water bottle']
      ),
      heading(2, 'Budget Tracker'),
      bulletList(
        [paragraph(bold('Accommodation: '), '€480 (5 nights, prepaid)')],
        [paragraph(bold('Food & drink: '), '€400 budget (€80/day)')],
        [paragraph(bold('Activities: '), '€120 budget')],
        [paragraph(bold('Transport: '), '€100 budget (metro, trams, Sintra train)')],
        [paragraph(bold('Contingency: '), '€100')],
        [paragraph(bold('Total: '), '€1,200')]
      )
    ),
  },
  {
    name: 'Recipe',
    description: 'Store your favourite recipes with ingredients, method, and notes.',
    icon: '🍳',
    category: 'Personal',
    content: doc(
      heading(1, 'Mushroom & Thyme Risotto'),
      bulletList(
        [paragraph(bold('Serves: '), '4')],
        [paragraph(bold('Prep time: '), '15 minutes')],
        [paragraph(bold('Cook time: '), '35 minutes')],
        [paragraph(bold('Difficulty: '), 'Medium')]
      ),
      horizontalRule(),
      heading(2, 'Ingredients'),
      bulletList(
        [paragraph('300g arborio rice')],
        [paragraph('400g mixed mushrooms (chestnut, shiitake, king oyster), sliced')],
        [paragraph('1 litre hot vegetable stock')],
        [paragraph('150ml dry white wine')],
        [paragraph('1 medium onion, finely diced')],
        [paragraph('3 cloves garlic, minced')],
        [paragraph('60g parmesan, finely grated (plus extra for serving)')],
        [paragraph('30g unsalted butter')],
        [paragraph('2 tbsp olive oil')],
        [paragraph('4–5 sprigs fresh thyme (leaves picked)')],
        [paragraph('Salt and freshly ground black pepper')],
        [paragraph('Small handful of flat-leaf parsley, chopped (for garnish)')]
      ),
      heading(2, 'Method'),
      bulletList(
        [
          paragraph(
            bold('1. '),
            'Heat the stock in a saucepan and keep it at a gentle simmer. This is important — adding cold stock will slow everything down.'
          ),
        ],
        [
          paragraph(
            bold('2. '),
            'Heat 1 tbsp olive oil and half the butter in a wide, heavy-bottomed pan over medium-high heat. Add the mushrooms and cook for 5–6 minutes until golden and any liquid has evaporated. Season with salt and half the thyme leaves. Transfer to a plate and set aside.'
          ),
        ],
        [
          paragraph(
            bold('3. '),
            'In the same pan, heat the remaining olive oil over medium heat. Add the onion and cook gently for 4–5 minutes until soft and translucent. Add the garlic and cook for 1 minute.'
          ),
        ],
        [
          paragraph(
            bold('4. '),
            'Add the rice and stir for 1–2 minutes until the grains are coated and slightly translucent at the edges.'
          ),
        ],
        [
          paragraph(
            bold('5. '),
            'Pour in the wine and stir until fully absorbed. This is the moment the kitchen starts to smell incredible.'
          ),
        ],
        [
          paragraph(
            bold('6. '),
            'Add the stock one ladleful at a time, stirring frequently. Wait until each addition is mostly absorbed before adding the next. This takes about 18–20 minutes. The rice is done when it is creamy but still has a slight bite (al dente).'
          ),
        ],
        [
          paragraph(
            bold('7. '),
            'Remove from heat. Stir in the remaining butter, the parmesan, the remaining thyme, and the reserved mushrooms. Season to taste with salt and pepper.'
          ),
        ],
        [
          paragraph(
            bold('8. '),
            'Cover and let it rest for 2 minutes. The consistency should be loose and flowing (it firms up quickly). If it is too thick, stir in a splash of warm stock.'
          ),
        ]
      ),
      heading(2, 'Notes'),
      bulletList(
        [
          paragraph(
            bold('Wine: '),
            'A dry Pinot Grigio or Sauvignon Blanc works well. Avoid anything oaky. If you prefer not to use wine, substitute with extra stock and a squeeze of lemon juice.'
          ),
        ],
        [
          paragraph(
            bold('Mushrooms: '),
            'Dried porcini (soaked for 20 min) add an incredible depth of flavour. Use the soaking liquid as part of your stock.'
          ),
        ],
        [
          paragraph(
            bold('Make it vegan: '),
            'Replace butter with olive oil and parmesan with nutritional yeast (3 tbsp). Add a squeeze of lemon at the end for brightness.'
          ),
        ],
        [
          paragraph(
            bold('Leftovers: '),
            'Risotto does not reheat well as-is, but leftover risotto makes excellent arancini (form into balls, bread with panko, deep fry).'
          ),
        ]
      )
    ),
  },

  // ================================================================
  // SHARED / GENERAL TEMPLATES
  // ================================================================

  {
    name: 'Event Planning',
    description: 'Organise events with checklists, timelines, and logistics.',
    icon: '🎉',
    category: 'General',
    content: doc(
      heading(1, 'Team Offsite — Q2 2026'),
      bulletList(
        [paragraph(bold('Date: '), '15–16 May 2026 (Thursday–Friday)')],
        [paragraph(bold('Location: '), 'The Greenhouse, Shoreditch, London')],
        [paragraph(bold('Attendees: '), '12 people (engineering + product)')],
        [paragraph(bold('Budget: '), '£3,600 (£300 per person)')],
        [paragraph(bold('Organiser: '), 'Sarah Chen')]
      ),
      horizontalRule(),
      heading(2, 'Objectives'),
      bulletList(
        [paragraph('Strengthen cross-team relationships (engineering + product)')],
        [paragraph('Align on H2 product roadmap and technical strategy')],
        [paragraph('Celebrate Q1 achievements and recognise individual contributions')],
        [paragraph('Have fun — this is not just another meeting')]
      ),
      heading(2, 'Agenda'),
      heading(3, 'Day 1 — Thursday 15/05'),
      bulletList(
        [paragraph(bold('09:30 '), 'Arrive and breakfast')],
        [paragraph(bold('10:00 '), 'Welcome and icebreaker activity')],
        [paragraph(bold('10:30 '), 'Q1 retrospective: wins, learnings, and metrics')],
        [paragraph(bold('11:30 '), 'Break')],
        [paragraph(bold('11:45 '), 'H2 roadmap presentation and discussion')],
        [paragraph(bold('12:45 '), 'Lunch')],
        [paragraph(bold('14:00 '), 'Workshop: cross-functional collaboration improvements')],
        [paragraph(bold('15:30 '), 'Break')],
        [paragraph(bold('15:45 '), 'Lightning talks (5 min each, volunteer speakers)')],
        [paragraph(bold('17:00 '), 'Wrap up and free time')],
        [paragraph(bold('19:00 '), 'Team dinner at Dishoom Shoreditch')]
      ),
      heading(3, 'Day 2 — Friday 16/05'),
      bulletList(
        [paragraph(bold('09:30 '), 'Arrive and breakfast')],
        [paragraph(bold('10:00 '), 'Hackathon kick-off (teams of 3, build anything)')],
        [paragraph(bold('12:30 '), 'Lunch')],
        [paragraph(bold('13:30 '), 'Hackathon continues')],
        [paragraph(bold('15:00 '), 'Demo and voting')],
        [paragraph(bold('15:45 '), 'Awards and closing remarks')],
        [paragraph(bold('16:00 '), 'End')]
      ),
      heading(2, 'Logistics Checklist'),
      taskList(
        [true, 'Book venue (confirmed, deposit paid)'],
        [true, 'Send calendar invites to all attendees'],
        [false, 'Order catering: breakfast, lunch, snacks for both days'],
        [false, 'Book dinner reservation (12 people, Dishoom)'],
        [false, 'Arrange AV equipment: projector, screen, microphone'],
        [false, 'Print name badges and agenda handouts'],
        [false, 'Buy hackathon prizes (3 categories)'],
        [false, 'Prepare icebreaker materials'],
        [false, 'Share pre-read document with attendees 1 week before'],
        [false, 'Arrange travel reimbursement for out-of-town attendees']
      ),
      heading(2, 'Budget Breakdown'),
      bulletList(
        [paragraph(bold('Venue hire: '), '£1,200 (2 days)')],
        [paragraph(bold('Catering: '), '£960 (£40/person/day × 2 days)')],
        [paragraph(bold('Dinner: '), '£720 (£60/person)')],
        [paragraph(bold('Prizes & materials: '), '£200')],
        [paragraph(bold('Contingency: '), '£520')],
        [paragraph(bold('Total: '), '£3,600')]
      )
    ),
  },
  {
    name: 'Pros and Cons',
    description: 'Structured comparison to support decision-making.',
    icon: '⚡',
    category: 'General',
    content: doc(
      heading(1, 'Decision: Should We Adopt a Monorepo?'),
      paragraph(
        'We are evaluating whether to consolidate our 4 separate repositories (web, server, shared, infrastructure) into a single monorepo. This document captures the trade-offs to inform the team decision.'
      ),
      horizontalRule(),
      heading(2, 'Pros'),
      bulletList(
        [
          paragraph(
            bold('Atomic changes across packages: '),
            'A single PR can update the shared types, server API, and web client together. No more coordinating releases across repos.'
          ),
        ],
        [
          paragraph(
            bold('Simplified dependency management: '),
            'Shared packages (types, utilities) are always in sync. No version matrix to maintain.'
          ),
        ],
        [
          paragraph(
            bold('Better code discoverability: '),
            'New team members can search the entire codebase in one place. Cross-package refactors are easier.'
          ),
        ],
        [
          paragraph(
            bold('Unified CI/CD: '),
            'One pipeline with affected-only builds (Turborepo). Currently we run 4 separate CI configurations.'
          ),
        ],
        [
          paragraph(
            bold('Shared tooling: '),
            'ESLint, Prettier, TypeScript configs defined once. Currently duplicated across repos with subtle differences.'
          ),
        ]
      ),
      heading(2, 'Cons'),
      bulletList(
        [
          paragraph(
            bold('Repository size: '),
            'Combined repo will be ~800MB with history. Git operations (clone, fetch) will be slower for new contributors.'
          ),
        ],
        [
          paragraph(
            bold('Migration effort: '),
            'Estimated 2–3 days of engineering time to consolidate, set up Turborepo, and update CI. All open PRs will need to be re-created.'
          ),
        ],
        [
          paragraph(
            bold('Permission granularity: '),
            'Currently, infrastructure repo has stricter access controls. In a monorepo, we would need CODEOWNERS rules to replicate this.'
          ),
        ],
        [
          paragraph(
            bold('Build complexity: '),
            'Need to configure task dependencies and caching correctly. Misconfigured Turborepo can lead to stale builds.'
          ),
        ]
      ),
      heading(2, 'Verdict'),
      paragraph(
        bold('Recommendation: Proceed with monorepo migration.'),
        ' The benefits of atomic changes, simplified dependency management, and unified tooling outweigh the one-time migration cost. The repository size concern is mitigated by shallow clones in CI. Permission granularity can be addressed with CODEOWNERS.'
      ),
      heading(2, 'Next Steps'),
      taskList(
        [false, 'Create a migration plan with detailed steps and rollback procedure'],
        [false, 'Set up Turborepo in a proof-of-concept branch'],
        [false, 'Test CI performance with affected-only builds'],
        [false, 'Schedule migration for a low-activity week']
      )
    ),
  },
  {
    name: 'SWOT Analysis',
    description: 'Evaluate strengths, weaknesses, opportunities, and threats.',
    icon: '🧭',
    category: 'General',
    content: doc(
      heading(1, 'SWOT Analysis: LibreDiary'),
      paragraph(italic('Prepared for the Q2 strategy review, March 2026.')),
      horizontalRule(),
      heading(2, 'Strengths'),
      bulletList(
        [
          paragraph(
            bold('Open source and self-hostable: '),
            'Strong differentiator against Notion, which is cloud-only. Appeals to privacy-conscious users, educational institutions, and organisations with data residency requirements.'
          ),
        ],
        [
          paragraph(
            bold('Real-time collaboration: '),
            'CRDT-based editing via Yjs is robust and handles offline-to-online transitions well. Competitive with Notion and ahead of most open-source alternatives.'
          ),
        ],
        [
          paragraph(
            bold('End-to-end encryption: '),
            'Unique in the workspace tools category. Neither Notion nor Obsidian offer E2EE. This is a strong selling point for security-focused teams.'
          ),
        ],
        [
          paragraph(
            bold('Active community: '),
            'Growing contributor base with 15 external PRs merged in Q1. Positive sentiment on Reddit and Hacker News.'
          ),
        ]
      ),
      heading(2, 'Weaknesses'),
      bulletList(
        [
          paragraph(
            bold('Limited mobile experience: '),
            'PWA works but lacks native app polish. Notion and Obsidian have mature mobile apps with offline support.'
          ),
        ],
        [
          paragraph(
            bold('Small team: '),
            '6 engineers. Feature velocity is limited compared to Notion (500+ employees). Must be extremely selective about what we build.'
          ),
        ],
        [
          paragraph(
            bold('No API ecosystem: '),
            'No public API for third-party integrations. Zapier, Make, and other automation tools cannot connect to LibreDiary yet.'
          ),
        ]
      ),
      heading(2, 'Opportunities'),
      bulletList(
        [
          paragraph(
            bold('Notion fatigue: '),
            'Growing dissatisfaction with Notion pricing changes and performance issues. "Notion alternatives" search volume has increased 3x in 12 months.'
          ),
        ],
        [
          paragraph(
            bold('EU data sovereignty regulations: '),
            'GDPR and upcoming EU regulations push organisations towards self-hosted solutions. LibreDiary is well-positioned.'
          ),
        ],
        [
          paragraph(
            bold('Education market: '),
            'Universities and schools need collaborative note-taking tools with data ownership. Several have inquired about bulk licensing.'
          ),
        ],
        [
          paragraph(
            bold('AI integration: '),
            'Adding local AI features (summarisation, translation, writing assistance) that run on-device would be a differentiator over cloud-only AI tools.'
          ),
        ]
      ),
      heading(2, 'Threats'),
      bulletList(
        [
          paragraph(
            bold('Notion offline mode improvement: '),
            'Notion shipped improved offline support in 2025. If they continue improving, our offline-first advantage narrows.'
          ),
        ],
        [
          paragraph(
            bold('Obsidian team features: '),
            'Obsidian is adding real-time collaboration. If they succeed, they become a direct competitor with a larger community.'
          ),
        ],
        [
          paragraph(
            bold('Funding sustainability: '),
            'As an open-source project, long-term funding depends on enterprise adoption or sponsorship. Need to establish a sustainable revenue model.'
          ),
        ]
      ),
      heading(2, 'Strategic Priorities'),
      taskList(
        [false, 'Invest in mobile experience (native wrapper or React Native)'],
        [false, 'Launch public API and developer documentation'],
        [false, 'Develop enterprise pricing tier with priority support'],
        [false, 'Explore local AI features for on-device processing']
      )
    ),
  },
  {
    name: 'Standard Operating Procedure',
    description: 'Document step-by-step processes for consistent execution.',
    icon: '📜',
    category: 'General',
    content: doc(
      heading(1, 'SOP: Production Deployment'),
      bulletList(
        [paragraph(bold('Version: '), '2.1')],
        [paragraph(bold('Last Updated: '), '20/03/2026')],
        [paragraph(bold('Owner: '), 'Tom Eriksson')],
        [paragraph(bold('Approved by: '), 'Sarah Chen')]
      ),
      horizontalRule(),
      heading(2, 'Purpose'),
      paragraph(
        'This document describes the standard procedure for deploying a new version of the LibreDiary application to the production environment. Following this procedure ensures consistent, safe deployments with minimal risk of downtime.'
      ),
      heading(2, 'Prerequisites'),
      taskList(
        [false, 'All CI checks pass on the main branch (build, lint, type check, tests)'],
        [false, 'Semantic-release has created a new version tag'],
        [false, 'Docker images have been built and pushed to the container registry'],
        [false, 'Changelog has been reviewed and is accurate'],
        [false, 'No active incidents or ongoing maintenance windows']
      ),
      heading(2, 'Procedure'),
      heading(3, 'Step 1: Pre-deployment Checks'),
      bulletList(
        [paragraph('Verify the new Docker image tags exist in the container registry')],
        [paragraph('Check the staging environment is running the same version and healthy')],
        [
          paragraph(
            'Review the changelog for any breaking changes or required database migrations'
          ),
        ],
        [paragraph('Notify the team in #deployments that a production deploy is starting')]
      ),
      heading(3, 'Step 2: Database Migration (if required)'),
      bulletList(
        [paragraph('Back up the production database before any migration')],
        [
          paragraph(
            'Run migrations against a staging copy first to verify they complete without errors'
          ),
        ],
        [
          paragraph(
            'For large tables, ensure index creation uses CONCURRENTLY (see INC-2026-042 post-mortem)'
          ),
        ],
        [paragraph('Verify migration completion before proceeding to application deployment')]
      ),
      heading(3, 'Step 3: Deploy Application'),
      bulletList(
        [paragraph('Pull the new image: ', italic('docker compose pull server web'))],
        [paragraph('Restart services: ', italic('docker compose up -d server web'))],
        [paragraph('Monitor container health checks for 5 minutes')],
        [paragraph('Verify the /health and /version endpoints return the expected version')]
      ),
      heading(3, 'Step 4: Post-deployment Verification'),
      taskList(
        [false, 'Health endpoint returns 200 with correct version'],
        [false, 'Log in as a test user and verify core flows (create page, edit, save)'],
        [false, 'Check error tracking (Sentry) for new errors in the first 15 minutes'],
        [false, 'Monitor application metrics: response times, error rate, CPU/memory'],
        [false, 'Confirm WebSocket connections are re-established (check Hocuspocus logs)']
      ),
      heading(3, 'Step 5: Communicate'),
      bulletList(
        [paragraph('Post in #deployments: version deployed, any notable changes')],
        [paragraph('If customer-facing changes exist, notify customer success team')],
        [paragraph('Update the status page if a maintenance window was announced')]
      ),
      heading(2, 'Rollback Procedure'),
      paragraph('If critical issues are detected within 30 minutes of deployment:'),
      bulletList(
        [
          paragraph(
            bold('1. '),
            'Revert to the previous image tag: ',
            italic('docker compose pull server:previous-tag && docker compose up -d server')
          ),
        ],
        [paragraph(bold('2. '), 'If a database migration was applied, run the rollback migration')],
        [
          paragraph(
            bold('3. '),
            'Notify the team in #deployments and open an incident if user impact occurred'
          ),
        ],
        [paragraph(bold('4. '), 'Write an incident report within 48 hours')]
      ),
      heading(2, 'Revision History'),
      bulletList(
        [
          paragraph(
            bold('v2.1 '),
            '(20/03/2026) — Added CONCURRENTLY requirement for index migrations'
          ),
        ],
        [paragraph(bold('v2.0 '), '(01/02/2026) — Updated for Docker Compose deployment')],
        [paragraph(bold('v1.0 '), '(15/11/2025) — Initial version')]
      )
    ),
  },
];
