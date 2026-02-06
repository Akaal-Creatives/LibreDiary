import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';

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

  console.log('');
  console.log('========================================');
  console.log('🎉 Development seed completed!');
  console.log('');
  console.log('Organization:');
  console.log(`  Name: ${organization.name}`);
  console.log(`  Slug: ${organization.slug}`);
  console.log('');
  console.log('Users created (10):');
  console.log('  Email format: user[0-9]@akaal.biz');
  console.log('  Password: Password123');
  console.log('');
  console.log('Pages created: 10 parent pages + 30 subpages');
  console.log('  - Each page has rich HTML content');
  console.log('  - Pages are interlinked for navigation');
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
