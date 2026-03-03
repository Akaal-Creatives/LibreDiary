import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const PAGE_ICONS = ['📝', '📚', '🎯', '💡', '🚀', '📊', '🔧', '🎨', '📋', '🌟'];
const PAGE_TITLES = [
  'Getting Started',
  'Project Documentation',
  'Meeting Notes',
  'Ideas & Brainstorming',
  'Product Roadmap',
  'Analytics Dashboard',
  'Technical Specs',
  'Design Guidelines',
  'Task Tracker',
  'Team Resources',
];

const SUBPAGE_DATA = [
  ['Quick Start Guide', 'Installation', 'Configuration'],
  ['API Reference', 'Architecture', 'Database Schema'],
  ['Weekly Standup', 'Sprint Retrospective', 'Planning Sessions'],
  ['Feature Ideas', 'User Feedback', 'Research Notes'],
  ['Q1 Goals', 'Q2 Goals', 'Milestones'],
  ['Traffic Reports', 'User Metrics', 'Conversion Rates'],
  ['Backend Services', 'Frontend Components', 'Infrastructure'],
  ['Color Palette', 'Typography', 'Component Library'],
  ['Todo List', 'In Progress', 'Completed'],
  ['Onboarding', 'Tools & Resources', 'Best Practices'],
];

// Page content templates - will be populated with links after pages are created
// Use {{PAGE:title}} as placeholder for page links
const PAGE_CONTENT_TEMPLATES: Record<string, string> = {
  'Getting Started': `
<h2>Welcome to LibreDiary</h2>
<p>This is your workspace for capturing ideas, documenting projects, and collaborating with your team. Here's how to get started:</p>

<h3>Quick Navigation</h3>
<ul>
  <li>Check out the {{PAGE:Project Documentation}} for API details and architecture</li>
  <li>Review our {{PAGE:Design Guidelines}} for UI/UX standards</li>
  <li>Track progress in the {{PAGE:Task Tracker}}</li>
</ul>

<h3>Key Features</h3>
<ol>
  <li><strong>Real-time collaboration</strong> - Work together with your team simultaneously</li>
  <li><strong>Rich text editing</strong> - Format your content with headings, lists, and more</li>
  <li><strong>Page hierarchy</strong> - Organize content with nested pages</li>
  <li><strong>Version history</strong> - Track changes and restore previous versions</li>
</ol>

<blockquote>
  <p>Pro tip: Use the sidebar to navigate between pages and create new ones with the "New Page" button.</p>
</blockquote>

<p>Need help? Check out the {{PAGE:Team Resources}} page for onboarding materials and best practices.</p>
`,

  'Project Documentation': `
<h2>Project Documentation</h2>
<p>This section contains all technical documentation for the LibreDiary project.</p>

<h3>Architecture Overview</h3>
<p>LibreDiary is built with a modern stack:</p>
<ul>
  <li><strong>Frontend:</strong> Vue 3 + TypeScript + Vite</li>
  <li><strong>Backend:</strong> Fastify + Prisma + PostgreSQL</li>
  <li><strong>Real-time:</strong> Hocuspocus + Yjs for collaboration</li>
</ul>

<h3>Related Pages</h3>
<p>For implementation details, see:</p>
<ul>
  <li>{{PAGE:Technical Specs}} - Backend services and infrastructure</li>
  <li>{{PAGE:Design Guidelines}} - Frontend component library</li>
  <li>{{PAGE:Product Roadmap}} - Planned features and milestones</li>
</ul>

<h3>Getting Help</h3>
<p>If you're new to the project, start with {{PAGE:Getting Started}} for an introduction.</p>

<pre><code>// Example API call
const response = await fetch('/api/v1/pages');
const pages = await response.json();
</code></pre>
`,

  'Meeting Notes': `
<h2>Meeting Notes</h2>
<p>This page tracks all team meetings and decisions.</p>

<h3>Recent Meetings</h3>
<ul>
  <li><strong>Weekly Standup</strong> - Every Monday at 10:00 AM</li>
  <li><strong>Sprint Planning</strong> - Bi-weekly on Thursdays</li>
  <li><strong>Retrospective</strong> - End of each sprint</li>
</ul>

<h3>Action Items</h3>
<p>Current action items from recent meetings:</p>
<ol>
  <li>Review {{PAGE:Product Roadmap}} for Q2 priorities</li>
  <li>Update {{PAGE:Technical Specs}} with new API endpoints</li>
  <li>Document findings in {{PAGE:Ideas & Brainstorming}}</li>
</ol>

<blockquote>
  <p>Remember to check {{PAGE:Task Tracker}} for assigned tasks from meetings.</p>
</blockquote>
`,

  'Ideas & Brainstorming': `
<h2>Ideas & Brainstorming</h2>
<p>A space for capturing new ideas and exploring possibilities.</p>

<h3>Current Focus Areas</h3>
<ul>
  <li>Improving real-time collaboration performance</li>
  <li>Adding new formatting options to the editor</li>
  <li>Enhancing the mobile experience</li>
</ul>

<h3>Feature Ideas</h3>
<p>Ideas to be evaluated for the {{PAGE:Product Roadmap}}:</p>
<ol>
  <li><strong>Comments & Mentions</strong> - Tag team members in discussions</li>
  <li><strong>Templates</strong> - Pre-built page templates for common use cases</li>
  <li><strong>Export Options</strong> - PDF, Markdown, HTML exports</li>
  <li><strong>AI Assistance</strong> - Writing suggestions and summaries</li>
</ol>

<h3>Research Notes</h3>
<p>See {{PAGE:Analytics Dashboard}} for user feedback data that informs these ideas.</p>

<blockquote>
  <p>All ideas should align with our {{PAGE:Design Guidelines}} and {{PAGE:Technical Specs}}.</p>
</blockquote>
`,

  'Product Roadmap': `
<h2>Product Roadmap</h2>
<p>Strategic planning and milestone tracking for LibreDiary.</p>

<h3>Q1 Goals (Completed)</h3>
<ul>
  <li>✅ Core editor functionality</li>
  <li>✅ User authentication</li>
  <li>✅ Basic page hierarchy</li>
</ul>

<h3>Q2 Goals (In Progress)</h3>
<ul>
  <li>🔄 Real-time collaboration - See {{PAGE:Technical Specs}}</li>
  <li>🔄 Comments and mentions</li>
  <li>📋 Mobile responsive design - See {{PAGE:Design Guidelines}}</li>
</ul>

<h3>Q3 Goals (Planned)</h3>
<ul>
  <li>📋 API integrations</li>
  <li>📋 Advanced permissions</li>
  <li>📋 Analytics dashboard enhancements</li>
</ul>

<p>Track implementation progress in {{PAGE:Task Tracker}} and review metrics in {{PAGE:Analytics Dashboard}}.</p>

<h3>Resources</h3>
<p>Meeting notes and decisions are documented in {{PAGE:Meeting Notes}}.</p>
`,

  'Analytics Dashboard': `
<h2>Analytics Dashboard</h2>
<p>Key metrics and insights for the LibreDiary platform.</p>

<h3>Usage Metrics</h3>
<ul>
  <li><strong>Active Users:</strong> 1,247 (↑ 12% from last month)</li>
  <li><strong>Pages Created:</strong> 8,432</li>
  <li><strong>Collaboration Sessions:</strong> 2,156</li>
</ul>

<h3>User Feedback Summary</h3>
<p>Top requested features (informing {{PAGE:Ideas & Brainstorming}}):</p>
<ol>
  <li>Better mobile experience (42%)</li>
  <li>Offline support (28%)</li>
  <li>More export options (18%)</li>
  <li>API access (12%)</li>
</ol>

<h3>Performance Metrics</h3>
<p>Related to {{PAGE:Technical Specs}} improvements:</p>
<ul>
  <li>Average page load: 1.2s</li>
  <li>Sync latency: 45ms</li>
  <li>Uptime: 99.9%</li>
</ul>

<blockquote>
  <p>For detailed traffic reports, see the subpages below.</p>
</blockquote>
`,

  'Technical Specs': `
<h2>Technical Specifications</h2>
<p>Detailed technical documentation for developers.</p>

<h3>Backend Architecture</h3>
<p>The server is built with Fastify and uses Prisma for database access:</p>
<pre><code>// Server entry point
import Fastify from 'fastify';
const app = Fastify({ logger: true });
</code></pre>

<h3>API Endpoints</h3>
<p>Full API documentation in {{PAGE:Project Documentation}}.</p>
<ul>
  <li><code>GET /api/v1/pages</code> - List pages</li>
  <li><code>POST /api/v1/pages</code> - Create page</li>
  <li><code>PUT /api/v1/pages/:id</code> - Update page</li>
  <li><code>DELETE /api/v1/pages/:id</code> - Delete page</li>
</ul>

<h3>Database Schema</h3>
<p>Key entities:</p>
<ul>
  <li><strong>User</strong> - Authentication and profile</li>
  <li><strong>Organization</strong> - Workspace container</li>
  <li><strong>Page</strong> - Content with hierarchy</li>
</ul>

<h3>Related Pages</h3>
<p>See {{PAGE:Design Guidelines}} for frontend component specs and {{PAGE:Product Roadmap}} for planned enhancements.</p>
`,

  'Design Guidelines': `
<h2>Design Guidelines</h2>
<p>UI/UX standards and component specifications for LibreDiary.</p>

<h3>Color Palette</h3>
<ul>
  <li><strong>Primary (Sage Green):</strong> #7c9a8c</li>
  <li><strong>Background:</strong> #fdfcfa</li>
  <li><strong>Text Primary:</strong> #2d3b35</li>
  <li><strong>Border:</strong> #e5e2dd</li>
</ul>

<h3>Typography</h3>
<ul>
  <li><strong>Headings:</strong> Inter, 600-700 weight</li>
  <li><strong>Body:</strong> Inter, 400 weight</li>
  <li><strong>Code:</strong> JetBrains Mono</li>
</ul>

<h3>Components</h3>
<p>See {{PAGE:Technical Specs}} for implementation details:</p>
<ul>
  <li>Buttons - Primary, Secondary, Ghost variants</li>
  <li>Forms - Input, Select, Checkbox, Radio</li>
  <li>Modals - Confirmation, Alert, Form dialogs</li>
</ul>

<h3>Accessibility</h3>
<p>All components must meet WCAG 2.1 AA standards. Track compliance in {{PAGE:Task Tracker}}.</p>

<blockquote>
  <p>Design decisions are discussed in {{PAGE:Meeting Notes}} and ideas captured in {{PAGE:Ideas & Brainstorming}}.</p>
</blockquote>
`,

  'Task Tracker': `
<h2>Task Tracker</h2>
<p>Track work items and project progress.</p>

<h3>In Progress</h3>
<ul>
  <li>🔄 <strong>Collaboration cursor fix</strong> - Related to {{PAGE:Technical Specs}}</li>
  <li>🔄 <strong>Mobile responsive layout</strong> - See {{PAGE:Design Guidelines}}</li>
  <li>🔄 <strong>Comment system</strong> - From {{PAGE:Ideas & Brainstorming}}</li>
</ul>

<h3>Todo</h3>
<ul>
  <li>📋 Export to PDF feature</li>
  <li>📋 Page templates</li>
  <li>📋 Enhanced search</li>
</ul>

<h3>Completed</h3>
<ul>
  <li>✅ Real-time sync</li>
  <li>✅ Page versioning</li>
  <li>✅ User authentication</li>
</ul>

<p>Review priorities in {{PAGE:Product Roadmap}} and discuss in {{PAGE:Meeting Notes}}.</p>
`,

  'Team Resources': `
<h2>Team Resources</h2>
<p>Onboarding materials, tools, and best practices for the team.</p>

<h3>Getting Started</h3>
<p>New to the team? Start here:</p>
<ol>
  <li>Read {{PAGE:Getting Started}} for platform overview</li>
  <li>Review {{PAGE:Project Documentation}} for technical context</li>
  <li>Check {{PAGE:Design Guidelines}} for UI standards</li>
  <li>See {{PAGE:Task Tracker}} for current priorities</li>
</ol>

<h3>Development Setup</h3>
<pre><code># Clone the repository
git clone https://github.com/example/librediary.git

# Install dependencies
pnpm install

# Start development server
pnpm dev
</code></pre>

<h3>Tools We Use</h3>
<ul>
  <li><strong>IDE:</strong> VS Code with ESLint, Prettier</li>
  <li><strong>Version Control:</strong> Git + GitHub</li>
  <li><strong>CI/CD:</strong> GitHub Actions</li>
  <li><strong>Monitoring:</strong> See {{PAGE:Analytics Dashboard}}</li>
</ul>

<h3>Best Practices</h3>
<ul>
  <li>Follow {{PAGE:Design Guidelines}} for all UI work</li>
  <li>Document decisions in {{PAGE:Meeting Notes}}</li>
  <li>Capture ideas in {{PAGE:Ideas & Brainstorming}}</li>
</ul>
`,
};

// Subpage content templates
const SUBPAGE_CONTENT_TEMPLATES: Record<string, Record<string, string>> = {
  'Getting Started': {
    'Quick Start Guide': `
<h2>Quick Start Guide</h2>
<p>Get up and running with LibreDiary in 5 minutes.</p>

<h3>Step 1: Create Your First Page</h3>
<p>Click the "New Page" button in the sidebar to create your first page.</p>

<h3>Step 2: Start Writing</h3>
<p>Use the editor to add content. Try formatting with:</p>
<ul>
  <li><strong>Bold</strong> - Ctrl/Cmd + B</li>
  <li><em>Italic</em> - Ctrl/Cmd + I</li>
  <li>Headings - Type # at the start of a line</li>
</ul>

<h3>Step 3: Organize</h3>
<p>Drag pages in the sidebar to reorganize or nest them under other pages.</p>
`,
    Installation: `
<h2>Installation Guide</h2>
<p>System requirements and installation steps.</p>

<h3>Requirements</h3>
<ul>
  <li>Node.js 18 or higher</li>
  <li>PostgreSQL 14 or higher</li>
  <li>pnpm package manager</li>
</ul>

<h3>Steps</h3>
<pre><code># Clone repository
git clone https://github.com/example/librediary.git
cd librediary

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Run migrations
pnpm db:migrate

# Start server
pnpm dev</code></pre>
`,
    Configuration: `
<h2>Configuration</h2>
<p>Environment variables and configuration options.</p>

<h3>Required Variables</h3>
<pre><code>DATABASE_URL=postgresql://user:pass@localhost:5432/librediary
SESSION_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173</code></pre>

<h3>Optional Variables</h3>
<ul>
  <li><code>PORT</code> - Server port (default: 3000)</li>
  <li><code>LOG_LEVEL</code> - Logging verbosity</li>
  <li><code>SMTP_*</code> - Email configuration</li>
</ul>
`,
  },
  'Project Documentation': {
    'API Reference': `
<h2>API Reference</h2>
<p>Complete REST API documentation.</p>

<h3>Authentication</h3>
<p>All API requests require a session cookie or Bearer token.</p>

<h3>Endpoints</h3>
<h4>Pages</h4>
<ul>
  <li><code>GET /api/v1/pages</code> - List all pages</li>
  <li><code>GET /api/v1/pages/:id</code> - Get page by ID</li>
  <li><code>POST /api/v1/pages</code> - Create new page</li>
  <li><code>PUT /api/v1/pages/:id</code> - Update page</li>
  <li><code>DELETE /api/v1/pages/:id</code> - Soft delete page</li>
</ul>

<h4>Users</h4>
<ul>
  <li><code>GET /api/v1/users/me</code> - Current user</li>
  <li><code>PUT /api/v1/users/me</code> - Update profile</li>
</ul>
`,
    Architecture: `
<h2>System Architecture</h2>
<p>Overview of LibreDiary's technical architecture.</p>

<h3>Components</h3>
<ul>
  <li><strong>Web Client</strong> - Vue 3 SPA</li>
  <li><strong>API Server</strong> - Fastify REST API</li>
  <li><strong>Collaboration Server</strong> - Hocuspocus WebSocket</li>
  <li><strong>Database</strong> - PostgreSQL with Prisma ORM</li>
</ul>

<h3>Data Flow</h3>
<ol>
  <li>Client requests page via REST API</li>
  <li>Server authenticates and fetches data</li>
  <li>Client connects to WebSocket for real-time sync</li>
  <li>Changes propagate via Yjs CRDT</li>
</ol>
`,
    'Database Schema': `
<h2>Database Schema</h2>
<p>Core entities and relationships.</p>

<h3>User</h3>
<pre><code>model User {
  id            String
  email         String  @unique
  name          String
  passwordHash  String?
}</code></pre>

<h3>Organization</h3>
<pre><code>model Organization {
  id          String
  name        String
  slug        String  @unique
  members     OrganizationMember[]
}</code></pre>

<h3>Page</h3>
<pre><code>model Page {
  id             String
  organizationId String
  parentId       String?
  title          String
  htmlContent    String?
}</code></pre>
`,
  },
};

// Helper to create page content with links resolved
function resolvePageLinks(content: string, pageMap: Map<string, string>): string {
  return content.replace(/\{\{PAGE:([^}]+)\}\}/g, (_, title) => {
    const pageId = pageMap.get(title);
    if (pageId) {
      return `<a href="/app/page/${pageId}" data-page-link="${pageId}">${title}</a>`;
    }
    return title; // Fallback to plain text if page not found
  });
}

async function main() {
  console.log('🌱 Starting development seed...\n');

  // Find or create the development organization
  let organization = await prisma.organization.findFirst({
    where: { slug: 'akaal-dev' },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'Akaal Development',
        slug: 'akaal-dev',
        accentColor: '#7c9a8c', // Sage green
      },
    });
    console.log(`✅ Created organization: ${organization.name}`);
  } else {
    console.log(`ℹ️  Organization already exists: ${organization.name}`);
  }

  // Create 10 users
  const passwordHash = await hash('Password123');
  const users: Array<{ id: string; email: string; name: string }> = [];

  for (let i = 0; i < 10; i++) {
    const email = `user${i}@akaal.biz`;
    const name = `Test User ${i}`;

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      console.log(`✅ Created user: ${email}`);

      // Add user to organization
      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: i === 0 ? 'OWNER' : 'MEMBER',
        },
      });
    } else {
      console.log(`ℹ️  User already exists: ${email}`);

      // Make sure user is a member of the organization
      const existingMembership = await prisma.organizationMember.findFirst({
        where: {
          organizationId: organization.id,
          userId: user.id,
        },
      });

      if (!existingMembership) {
        await prisma.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: i === 0 ? 'OWNER' : 'MEMBER',
          },
        });
        console.log(`  ↳ Added to organization`);
      }
    }

    users.push({ id: user.id, email: user.email, name: user.name });
  }

  console.log('');

  // Map to store page title -> page ID for link resolution
  const pageMap = new Map<string, string>();
  const createdPages: Array<{
    id: string;
    title: string;
    isSubpage: boolean;
    parentTitle?: string;
  }> = [];

  // Phase 1: Create all pages (without content) to get their IDs
  console.log('📄 Phase 1: Creating page structure...\n');

  for (let i = 0; i < 10; i++) {
    const creatorIndex = i % users.length;
    const creator = users[creatorIndex];

    // Check if page already exists
    let page = await prisma.page.findFirst({
      where: {
        organizationId: organization.id,
        title: PAGE_TITLES[i],
        parentId: null,
      },
    });

    if (!page) {
      page = await prisma.page.create({
        data: {
          organizationId: organization.id,
          title: PAGE_TITLES[i],
          icon: PAGE_ICONS[i],
          createdById: creator.id,
          position: i,
        },
      });
      console.log(`✅ Created page: ${PAGE_ICONS[i]} ${PAGE_TITLES[i]}`);
    } else {
      console.log(`ℹ️  Page already exists: ${PAGE_ICONS[i]} ${PAGE_TITLES[i]}`);
    }

    pageMap.set(PAGE_TITLES[i], page.id);
    createdPages.push({ id: page.id, title: PAGE_TITLES[i], isSubpage: false });

    // Create subpages
    const subpages = SUBPAGE_DATA[i];
    for (let j = 0; j < subpages.length; j++) {
      const subpageCreatorIndex = (i + j) % users.length;
      const subpageCreator = users[subpageCreatorIndex];

      let subpage = await prisma.page.findFirst({
        where: {
          organizationId: organization.id,
          title: subpages[j],
          parentId: page.id,
        },
      });

      if (!subpage) {
        subpage = await prisma.page.create({
          data: {
            organizationId: organization.id,
            title: subpages[j],
            icon: ['📄', '📑', '📃'][j],
            parentId: page.id,
            createdById: subpageCreator.id,
            position: j,
          },
        });
        console.log(`   ↳ Created subpage: ${subpages[j]}`);
      }

      pageMap.set(subpages[j], subpage.id);
      createdPages.push({
        id: subpage.id,
        title: subpages[j],
        isSubpage: true,
        parentTitle: PAGE_TITLES[i],
      });
    }
  }

  // Phase 2: Update pages with content (with resolved links)
  console.log('\n📝 Phase 2: Adding page content with interlinks...\n');

  for (const pageInfo of createdPages) {
    let contentTemplate: string | undefined;

    if (pageInfo.isSubpage && pageInfo.parentTitle) {
      // Get subpage content
      contentTemplate = SUBPAGE_CONTENT_TEMPLATES[pageInfo.parentTitle]?.[pageInfo.title];
    } else {
      // Get main page content
      contentTemplate = PAGE_CONTENT_TEMPLATES[pageInfo.title];
    }

    if (contentTemplate) {
      // Resolve page links in content
      const resolvedContent = resolvePageLinks(contentTemplate.trim(), pageMap);

      // Update htmlContent and clear yjsState so the content gets loaded fresh
      // The Hocuspocus server will convert htmlContent to Yjs state on first sync
      await prisma.page.update({
        where: { id: pageInfo.id },
        data: {
          htmlContent: resolvedContent,
          yjsState: null, // Clear Yjs state to force reload from htmlContent
        },
      });

      const linkCount = (resolvedContent.match(/data-page-link/g) || []).length;
      if (linkCount > 0) {
        console.log(`✅ Added content to "${pageInfo.title}" (${linkCount} links)`);
      } else {
        console.log(`✅ Added content to "${pageInfo.title}"`);
      }
    }
  }

  // =============================================
  // Phase 3: Make user0 a super admin
  // =============================================
  console.log('\n👑 Phase 3: Promoting user0 to super admin...\n');

  await prisma.user.update({
    where: { id: users[0].id },
    data: { isSuperAdmin: true },
  });
  console.log(`✅ user0 is now a super admin`);

  // =============================================
  // Phase 4: Create databases with properties, views, and rows
  // =============================================
  console.log('\n🗄️  Phase 4: Creating databases...\n');

  // Helper to get a date relative to today
  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  // --- Task Tracker Database ---
  const taskTrackerPage = createdPages.find((p) => p.title === 'Task Tracker');
  let taskTrackerDb = await prisma.database.findFirst({
    where: { organizationId: organization.id, name: 'Task Tracker' },
  });

  if (!taskTrackerDb) {
    taskTrackerDb = await prisma.database.create({
      data: {
        organizationId: organization.id,
        pageId: taskTrackerPage?.id ?? null,
        name: 'Task Tracker',
        createdById: users[0].id,
      },
    });

    // Properties
    const ttProps = [
      { name: 'Title', type: 'TEXT' as const, position: 0 },
      {
        name: 'Status',
        type: 'SELECT' as const,
        position: 1,
        config: { options: ['Todo', 'In Progress', 'Done', 'Blocked'] },
      },
      {
        name: 'Priority',
        type: 'SELECT' as const,
        position: 2,
        config: { options: ['Low', 'Medium', 'High', 'Critical'] },
      },
      { name: 'Assignee', type: 'PERSON' as const, position: 3 },
      { name: 'Due Date', type: 'DATE' as const, position: 4 },
      {
        name: 'Tags',
        type: 'MULTI_SELECT' as const,
        position: 5,
        config: { options: ['Frontend', 'Backend', 'Design', 'DevOps', 'Bug', 'Feature'] },
      },
      { name: 'Created', type: 'CREATED_TIME' as const, position: 6 },
    ];

    for (const prop of ttProps) {
      await prisma.databaseProperty.create({
        data: {
          databaseId: taskTrackerDb.id,
          name: prop.name,
          type: prop.type,
          position: prop.position,
          config: 'config' in prop ? prop.config : undefined,
        },
      });
    }

    // Views
    const ttViews = [
      { name: 'All Tasks', type: 'TABLE' as const, position: 0 },
      {
        name: 'By Status',
        type: 'KANBAN' as const,
        position: 1,
        config: { groupByProperty: 'Status' },
      },
      {
        name: 'Timeline',
        type: 'CALENDAR' as const,
        position: 2,
        config: { dateProperty: 'Due Date' },
      },
      { name: 'Gallery', type: 'GALLERY' as const, position: 3 },
    ];

    for (const view of ttViews) {
      await prisma.databaseView.create({
        data: {
          databaseId: taskTrackerDb.id,
          name: view.name,
          type: view.type,
          position: view.position,
          config: 'config' in view ? view.config : undefined,
        },
      });
    }

    // Rows
    const taskRows = [
      {
        Title: 'Implement dark mode toggle',
        Status: 'Done',
        Priority: 'High',
        assigneeIdx: 1,
        dueDays: -5,
        Tags: ['Frontend', 'Feature'],
      },
      {
        Title: 'Fix sidebar collapse on mobile',
        Status: 'Done',
        Priority: 'Medium',
        assigneeIdx: 2,
        dueDays: -3,
        Tags: ['Frontend', 'Bug'],
      },
      {
        Title: 'Add export to PDF',
        Status: 'In Progress',
        Priority: 'High',
        assigneeIdx: 3,
        dueDays: 7,
        Tags: ['Backend', 'Feature'],
      },
      {
        Title: 'Database calendar view',
        Status: 'In Progress',
        Priority: 'Medium',
        assigneeIdx: 4,
        dueDays: 10,
        Tags: ['Frontend', 'Feature'],
      },
      {
        Title: 'Optimise search indexing',
        Status: 'In Progress',
        Priority: 'Critical',
        assigneeIdx: 0,
        dueDays: 3,
        Tags: ['Backend', 'DevOps'],
      },
      {
        Title: 'Add webhook retry logic',
        Status: 'Todo',
        Priority: 'Medium',
        assigneeIdx: 5,
        dueDays: 14,
        Tags: ['Backend', 'Feature'],
      },
      {
        Title: 'Write API documentation',
        Status: 'Todo',
        Priority: 'Low',
        assigneeIdx: 6,
        dueDays: 21,
        Tags: ['Backend'],
      },
      {
        Title: 'Design template gallery UI',
        Status: 'Todo',
        Priority: 'Medium',
        assigneeIdx: 7,
        dueDays: 12,
        Tags: ['Design', 'Feature'],
      },
      {
        Title: 'Set up CI/CD pipeline',
        Status: 'Done',
        Priority: 'High',
        assigneeIdx: 8,
        dueDays: -10,
        Tags: ['DevOps'],
      },
      {
        Title: 'Implement page versioning',
        Status: 'Done',
        Priority: 'Critical',
        assigneeIdx: 0,
        dueDays: -14,
        Tags: ['Backend', 'Feature'],
      },
      {
        Title: 'Add keyboard shortcuts',
        Status: 'Blocked',
        Priority: 'Low',
        assigneeIdx: 9,
        dueDays: 5,
        Tags: ['Frontend'],
      },
      {
        Title: 'Migrate to new auth provider',
        Status: 'Blocked',
        Priority: 'High',
        assigneeIdx: 1,
        dueDays: 8,
        Tags: ['Backend', 'DevOps'],
      },
      {
        Title: 'Implement comment threading',
        Status: 'In Progress',
        Priority: 'High',
        assigneeIdx: 2,
        dueDays: 6,
        Tags: ['Frontend', 'Backend', 'Feature'],
      },
      {
        Title: 'Add drag-and-drop page reorder',
        Status: 'Todo',
        Priority: 'Medium',
        assigneeIdx: 3,
        dueDays: 18,
        Tags: ['Frontend', 'Feature'],
      },
      {
        Title: 'Performance audit and fixes',
        Status: 'Todo',
        Priority: 'High',
        assigneeIdx: 0,
        dueDays: 20,
        Tags: ['Frontend', 'Backend'],
      },
    ];

    for (let i = 0; i < taskRows.length; i++) {
      const row = taskRows[i];
      await prisma.databaseRow.create({
        data: {
          databaseId: taskTrackerDb.id,
          position: i,
          createdById: users[row.assigneeIdx].id,
          cells: {
            Title: row.Title,
            Status: row.Status,
            Priority: row.Priority,
            Assignee: users[row.assigneeIdx].id,
            'Due Date': daysFromNow(row.dueDays),
            Tags: row.Tags,
          },
        },
      });
    }

    console.log(`✅ Created database: Task Tracker (${taskRows.length} rows, 4 views)`);
  } else {
    console.log('ℹ️  Task Tracker database already exists');
  }

  // --- Content Calendar Database ---
  let contentCalendarDb = await prisma.database.findFirst({
    where: { organizationId: organization.id, name: 'Content Calendar' },
  });

  if (!contentCalendarDb) {
    contentCalendarDb = await prisma.database.create({
      data: {
        organizationId: organization.id,
        name: 'Content Calendar',
        createdById: users[0].id,
      },
    });

    const ccProps = [
      { name: 'Title', type: 'TEXT' as const, position: 0 },
      { name: 'Publish Date', type: 'DATE' as const, position: 1 },
      { name: 'Author', type: 'PERSON' as const, position: 2 },
      {
        name: 'Status',
        type: 'SELECT' as const,
        position: 3,
        config: { options: ['Draft', 'Review', 'Scheduled', 'Published'] },
      },
      {
        name: 'Category',
        type: 'SELECT' as const,
        position: 4,
        config: { options: ['Blog', 'Tutorial', 'Changelog', 'Guide'] },
      },
      { name: 'URL', type: 'URL' as const, position: 5 },
    ];

    for (const prop of ccProps) {
      await prisma.databaseProperty.create({
        data: {
          databaseId: contentCalendarDb.id,
          name: prop.name,
          type: prop.type,
          position: prop.position,
          config: 'config' in prop ? prop.config : undefined,
        },
      });
    }

    const ccViews = [
      { name: 'All Content', type: 'TABLE' as const, position: 0 },
      {
        name: 'Schedule',
        type: 'CALENDAR' as const,
        position: 1,
        config: { dateProperty: 'Publish Date' },
      },
      {
        name: 'Pipeline',
        type: 'KANBAN' as const,
        position: 2,
        config: { groupByProperty: 'Status' },
      },
    ];

    for (const view of ccViews) {
      await prisma.databaseView.create({
        data: {
          databaseId: contentCalendarDb.id,
          name: view.name,
          type: view.type,
          position: view.position,
          config: 'config' in view ? view.config : undefined,
        },
      });
    }

    const contentRows = [
      {
        Title: 'Introducing LibreDiary 1.0',
        pubDays: -30,
        authorIdx: 0,
        Status: 'Published',
        Category: 'Blog',
        URL: 'https://blog.example.com/introducing-librediary',
      },
      {
        Title: 'Getting Started with Databases',
        pubDays: -20,
        authorIdx: 1,
        Status: 'Published',
        Category: 'Tutorial',
        URL: 'https://blog.example.com/getting-started-databases',
      },
      {
        Title: 'v0.9 Release Notes',
        pubDays: -15,
        authorIdx: 0,
        Status: 'Published',
        Category: 'Changelog',
        URL: 'https://blog.example.com/v09-release',
      },
      {
        Title: 'Advanced Page Permissions Guide',
        pubDays: -7,
        authorIdx: 2,
        Status: 'Published',
        Category: 'Guide',
        URL: 'https://blog.example.com/permissions-guide',
      },
      {
        Title: 'Building Custom Templates',
        pubDays: 3,
        authorIdx: 3,
        Status: 'Scheduled',
        Category: 'Tutorial',
        URL: '',
      },
      {
        Title: 'v1.1 Release Notes',
        pubDays: 5,
        authorIdx: 0,
        Status: 'Review',
        Category: 'Changelog',
        URL: '',
      },
      {
        Title: 'Collaboration Best Practices',
        pubDays: 10,
        authorIdx: 4,
        Status: 'Draft',
        Category: 'Blog',
        URL: '',
      },
      {
        Title: 'Self-Hosting LibreDiary',
        pubDays: 14,
        authorIdx: 5,
        Status: 'Draft',
        Category: 'Guide',
        URL: '',
      },
      {
        Title: 'API Integration Walkthrough',
        pubDays: 18,
        authorIdx: 6,
        Status: 'Draft',
        Category: 'Tutorial',
        URL: '',
      },
      {
        Title: 'Year in Review: LibreDiary 2025',
        pubDays: 25,
        authorIdx: 0,
        Status: 'Draft',
        Category: 'Blog',
        URL: '',
      },
    ];

    for (let i = 0; i < contentRows.length; i++) {
      const row = contentRows[i];
      await prisma.databaseRow.create({
        data: {
          databaseId: contentCalendarDb.id,
          position: i,
          createdById: users[row.authorIdx].id,
          cells: {
            Title: row.Title,
            'Publish Date': daysFromNow(row.pubDays),
            Author: users[row.authorIdx].id,
            Status: row.Status,
            Category: row.Category,
            URL: row.URL,
          },
        },
      });
    }

    console.log(`✅ Created database: Content Calendar (${contentRows.length} rows, 3 views)`);
  } else {
    console.log('ℹ️  Content Calendar database already exists');
  }

  // --- Team Directory Database ---
  let teamDirectoryDb = await prisma.database.findFirst({
    where: { organizationId: organization.id, name: 'Team Directory' },
  });

  if (!teamDirectoryDb) {
    teamDirectoryDb = await prisma.database.create({
      data: {
        organizationId: organization.id,
        name: 'Team Directory',
        createdById: users[0].id,
      },
    });

    const tdProps = [
      { name: 'Name', type: 'TEXT' as const, position: 0 },
      { name: 'Email', type: 'EMAIL' as const, position: 1 },
      {
        name: 'Role',
        type: 'SELECT' as const,
        position: 2,
        config: { options: ['Engineer', 'Designer', 'PM', 'QA'] },
      },
      {
        name: 'Department',
        type: 'SELECT' as const,
        position: 3,
        config: { options: ['Engineering', 'Design', 'Product', 'Marketing'] },
      },
      { name: 'Phone', type: 'PHONE' as const, position: 4 },
      { name: 'Start Date', type: 'DATE' as const, position: 5 },
    ];

    for (const prop of tdProps) {
      await prisma.databaseProperty.create({
        data: {
          databaseId: teamDirectoryDb.id,
          name: prop.name,
          type: prop.type,
          position: prop.position,
          config: 'config' in prop ? prop.config : undefined,
        },
      });
    }

    const tdViews = [
      { name: 'All Members', type: 'TABLE' as const, position: 0 },
      { name: 'Cards', type: 'GALLERY' as const, position: 1 },
    ];

    for (const view of tdViews) {
      await prisma.databaseView.create({
        data: {
          databaseId: teamDirectoryDb.id,
          name: view.name,
          type: view.type,
          position: view.position,
        },
      });
    }

    const teamMembers = [
      {
        name: 'Harpreet Singh',
        role: 'Engineer',
        dept: 'Engineering',
        phone: '+44 7700 900001',
        startDays: -365,
      },
      {
        name: 'Amara Okafor',
        role: 'Designer',
        dept: 'Design',
        phone: '+44 7700 900002',
        startDays: -300,
      },
      {
        name: 'James Chen',
        role: 'PM',
        dept: 'Product',
        phone: '+44 7700 900003',
        startDays: -250,
      },
      {
        name: 'Priya Sharma',
        role: 'Engineer',
        dept: 'Engineering',
        phone: '+44 7700 900004',
        startDays: -200,
      },
      {
        name: 'Liam Murphy',
        role: 'QA',
        dept: 'Engineering',
        phone: '+44 7700 900005',
        startDays: -180,
      },
      {
        name: 'Sophie Martin',
        role: 'Designer',
        dept: 'Design',
        phone: '+44 7700 900006',
        startDays: -150,
      },
      {
        name: 'Raj Patel',
        role: 'Engineer',
        dept: 'Engineering',
        phone: '+44 7700 900007',
        startDays: -120,
      },
      {
        name: 'Emma Wilson',
        role: 'PM',
        dept: 'Marketing',
        phone: '+44 7700 900008',
        startDays: -90,
      },
      {
        name: 'Noah Garcia',
        role: 'Engineer',
        dept: 'Engineering',
        phone: '+44 7700 900009',
        startDays: -60,
      },
      { name: 'Aisha Khan', role: 'QA', dept: 'Product', phone: '+44 7700 900010', startDays: -30 },
    ];

    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      await prisma.databaseRow.create({
        data: {
          databaseId: teamDirectoryDb.id,
          position: i,
          createdById: users[i].id,
          cells: {
            Name: member.name,
            Email: users[i].email,
            Role: member.role,
            Department: member.dept,
            Phone: member.phone,
            'Start Date': daysFromNow(member.startDays),
          },
        },
      });
    }

    console.log(`✅ Created database: Team Directory (${teamMembers.length} rows, 2 views)`);
  } else {
    console.log('ℹ️  Team Directory database already exists');
  }

  // =============================================
  // Phase 5: Create built-in templates
  // =============================================
  console.log('\n📋 Phase 5: Creating templates...\n');

  const templates = [
    {
      name: 'Meeting Notes',
      icon: '📝',
      category: 'Productivity',
      description: 'Capture meeting agendas, notes, and action items with a structured format.',
    },
    {
      name: 'Project Brief',
      icon: '📋',
      category: 'Project Management',
      description: 'Define project scope, objectives, timeline, and stakeholders.',
    },
    {
      name: 'Weekly Report',
      icon: '📊',
      category: 'Reporting',
      description: 'Summarise weekly progress, blockers, and plans for the coming week.',
    },
    {
      name: 'Design Spec',
      icon: '🎨',
      category: 'Design',
      description: 'Document design decisions, component specs, and visual guidelines.',
    },
    {
      name: 'Bug Report',
      icon: '🐛',
      category: 'Engineering',
      description:
        'Report bugs with reproduction steps, expected behaviour, and environment details.',
    },
  ];

  for (const tmpl of templates) {
    const exists = await prisma.template.findFirst({
      where: { organizationId: organization.id, name: tmpl.name },
    });

    if (!exists) {
      await prisma.template.create({
        data: {
          organizationId: organization.id,
          name: tmpl.name,
          description: tmpl.description,
          icon: tmpl.icon,
          category: tmpl.category,
          isBuiltIn: true,
          createdById: users[0].id,
        },
      });
      console.log(`✅ Created template: ${tmpl.icon} ${tmpl.name}`);
    } else {
      console.log(`ℹ️  Template already exists: ${tmpl.name}`);
    }
  }

  // =============================================
  // Phase 6: Create comments on pages
  // =============================================
  console.log('\n💬 Phase 6: Creating comments...\n');

  const gettingStartedPageId = pageMap.get('Getting Started');
  const productRoadmapPageId = pageMap.get('Product Roadmap');

  if (gettingStartedPageId) {
    const existingComments = await prisma.comment.count({
      where: { pageId: gettingStartedPageId },
    });

    if (existingComments === 0) {
      // Thread 1: General feedback
      const c1 = await prisma.comment.create({
        data: {
          pageId: gettingStartedPageId,
          content: 'This guide is really helpful! Could we add a section about keyboard shortcuts?',
          createdById: users[1].id,
        },
      });
      await prisma.comment.create({
        data: {
          pageId: gettingStartedPageId,
          parentId: c1.id,
          content:
            "Great idea! I'll draft something this week. We should reference the editor shortcuts from the docs.",
          createdById: users[0].id,
        },
      });
      await prisma.comment.create({
        data: {
          pageId: gettingStartedPageId,
          parentId: c1.id,
          content:
            'I can help with the Markdown shortcuts section — I documented them last sprint.',
          createdById: users[3].id,
        },
      });

      // Thread 2: Standalone comment
      await prisma.comment.create({
        data: {
          pageId: gettingStartedPageId,
          content: 'The installation steps work perfectly on macOS. Has anyone tested on Windows?',
          createdById: users[4].id,
        },
      });

      // Thread 3: Quick note
      await prisma.comment.create({
        data: {
          pageId: gettingStartedPageId,
          content: 'We should add a video walkthrough link at the top for visual learners.',
          createdById: users[2].id,
        },
      });

      console.log('✅ Created 5 comments on "Getting Started"');
    } else {
      console.log('ℹ️  Comments already exist on "Getting Started"');
    }
  }

  if (productRoadmapPageId) {
    const existingComments = await prisma.comment.count({
      where: { pageId: productRoadmapPageId },
    });

    if (existingComments === 0) {
      await prisma.comment.create({
        data: {
          pageId: productRoadmapPageId,
          content: 'Q2 priorities look solid. Should we add API rate limiting to the list?',
          createdById: users[5].id,
        },
      });
      await prisma.comment.create({
        data: {
          pageId: productRoadmapPageId,
          content:
            'Can we move the mobile responsive design task up? Users have been requesting it.',
          createdById: users[6].id,
        },
      });
      // Resolved comment
      await prisma.comment.create({
        data: {
          pageId: productRoadmapPageId,
          content: 'The Q1 goals section needs updating — all items are now complete.',
          createdById: users[7].id,
          isResolved: true,
          resolvedAt: new Date(),
          resolvedById: users[0].id,
        },
      });

      console.log('✅ Created 3 comments on "Product Roadmap" (1 resolved)');
    } else {
      console.log('ℹ️  Comments already exist on "Product Roadmap"');
    }
  }

  // =============================================
  // Phase 7: Create notifications for user0
  // =============================================
  console.log('\n🔔 Phase 7: Creating notifications...\n');

  const existingNotifications = await prisma.notification.count({
    where: { userId: users[0].id },
  });

  if (existingNotifications === 0) {
    const notifications = [
      {
        type: 'MENTION' as const,
        title: 'Amara mentioned you',
        message: 'Amara Okafor mentioned you in a comment on "Getting Started"',
        isRead: false,
        data: { pageId: gettingStartedPageId },
      },
      {
        type: 'COMMENT_REPLY' as const,
        title: 'Priya replied to your comment',
        message: 'Priya Sharma replied to your comment on "Task Tracker"',
        isRead: false,
        data: { pageId: pageMap.get('Task Tracker') },
      },
      {
        type: 'PAGE_SHARED' as const,
        title: 'Page shared with you',
        message: 'James Chen shared "Design Guidelines" with you',
        isRead: true,
        readAt: new Date(Date.now() - 3600000),
        data: { pageId: pageMap.get('Design Guidelines') },
      },
      {
        type: 'INVITATION' as const,
        title: 'New team member joined',
        message: 'Aisha Khan accepted the invitation to join Akaal Development',
        isRead: true,
        readAt: new Date(Date.now() - 86400000),
        data: {},
      },
      {
        type: 'COMMENT_REPLY' as const,
        title: 'Liam replied to your comment',
        message: 'Liam Murphy replied to your comment on "Product Roadmap"',
        isRead: false,
        data: { pageId: productRoadmapPageId },
      },
      {
        type: 'MENTION' as const,
        title: 'Sophie mentioned you',
        message: 'Sophie Martin mentioned you in "Meeting Notes"',
        isRead: false,
        data: { pageId: pageMap.get('Meeting Notes') },
      },
    ];

    for (const notif of notifications) {
      await prisma.notification.create({
        data: {
          userId: users[0].id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          isRead: notif.isRead,
          readAt: 'readAt' in notif ? notif.readAt : undefined,
          data: notif.data,
        },
      });
    }

    console.log(`✅ Created ${notifications.length} notifications for user0 (4 unread, 2 read)`);
  } else {
    console.log('ℹ️  Notifications already exist for user0');
  }

  // =============================================
  // Phase 8: Add favourites for user0
  // =============================================
  console.log('\n⭐ Phase 8: Creating favourites...\n');

  const favouritePages = ['Getting Started', 'Product Roadmap', 'Task Tracker'];
  let favCount = 0;

  for (let i = 0; i < favouritePages.length; i++) {
    const fpId = pageMap.get(favouritePages[i]);
    if (!fpId) continue;

    const exists = await prisma.favorite.findFirst({
      where: { userId: users[0].id, pageId: fpId },
    });

    if (!exists) {
      await prisma.favorite.create({
        data: {
          userId: users[0].id,
          pageId: fpId,
          position: i,
        },
      });
      favCount++;
    }
  }

  if (favCount > 0) {
    console.log(`✅ Added ${favCount} favourites for user0`);
  } else {
    console.log('ℹ️  Favourites already exist for user0');
  }

  // =============================================
  // Phase 9: Create a webhook
  // =============================================
  console.log('\n🔗 Phase 9: Creating webhook...\n');

  const existingWebhook = await prisma.webhook.findFirst({
    where: { organizationId: organization.id, name: 'Slack Notifications' },
  });

  if (!existingWebhook) {
    await prisma.webhook.create({
      data: {
        organizationId: organization.id,
        name: 'Slack Notifications',
        url: 'https://hooks.slack.example.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        secret: randomBytes(32).toString('hex'),
        events: ['page.created', 'page.updated', 'comment.created'],
        isActive: true,
        createdById: users[0].id,
      },
    });
    console.log('✅ Created webhook: Slack Notifications');
  } else {
    console.log('ℹ️  Webhook already exists: Slack Notifications');
  }

  // =============================================
  // Phase 10: Create an API token for user0
  // =============================================
  console.log('\n🔑 Phase 10: Creating API token...\n');

  const existingToken = await prisma.apiToken.findFirst({
    where: { userId: users[0].id, name: 'CI/CD Pipeline Token' },
  });

  if (!existingToken) {
    const dummyToken = 'ld_xxxx' + randomBytes(28).toString('hex');
    const tokenHash = createHash('sha256').update(dummyToken).digest('hex');

    await prisma.apiToken.create({
      data: {
        userId: users[0].id,
        name: 'CI/CD Pipeline Token',
        tokenHash,
        tokenPrefix: dummyToken.slice(0, 8),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
    console.log('✅ Created API token: CI/CD Pipeline Token');
  } else {
    console.log('ℹ️  API token already exists: CI/CD Pipeline Token');
  }

  // =============================================
  // Phase 11: Trash a page
  // =============================================
  console.log('\n🗑️  Phase 11: Moving a page to trash...\n');

  // Trash the "Completed" subpage under "Task Tracker"
  const completedPageId = pageMap.get('Completed');
  if (completedPageId) {
    const completedPage = await prisma.page.findUnique({
      where: { id: completedPageId },
    });

    if (completedPage && !completedPage.trashedAt) {
      await prisma.page.update({
        where: { id: completedPageId },
        data: { trashedAt: new Date() },
      });
      console.log('✅ Moved "Completed" page to trash');
    } else {
      console.log('ℹ️  "Completed" page is already trashed or not found');
    }
  }

  // =============================================
  // Summary
  // =============================================
  console.log('');
  console.log('========================================');
  console.log('🎉 Development seed completed!');
  console.log('');
  console.log('Organisation:');
  console.log(`  Name: ${organization.name}`);
  console.log(`  Slug: ${organization.slug}`);
  console.log('');
  console.log('Users created (10):');
  console.log('  Email format: user[0-9]@akaal.biz');
  console.log('  Password: Password123');
  console.log('  user0 is super admin');
  console.log('');
  console.log('Pages: 10 parent pages + 30 subpages');
  console.log('Databases: 3 (Task Tracker, Content Calendar, Team Directory)');
  console.log('Templates: 5 built-in');
  console.log('Comments: 8 (threaded, 1 resolved)');
  console.log('Notifications: 6 (4 unread)');
  console.log('Favourites: 3');
  console.log('Webhooks: 1');
  console.log('API Tokens: 1');
  console.log('Trashed: 1 page');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
