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

  // Create 10 pages with subpages
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

      // Create subpages
      const subpages = SUBPAGE_DATA[i];
      for (let j = 0; j < subpages.length; j++) {
        const subpageCreatorIndex = (i + j) % users.length;
        const subpageCreator = users[subpageCreatorIndex];

        await prisma.page.create({
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
    } else {
      console.log(`ℹ️  Page already exists: ${PAGE_ICONS[i]} ${PAGE_TITLES[i]}`);
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
