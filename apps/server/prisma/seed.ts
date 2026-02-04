import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if super admin exists
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
  });

  if (existingSuperAdmin) {
    console.log('Super admin already exists, skipping seed.');
    return;
  }

  // Create super admin user
  const passwordHash = await hash('changeme123');

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@librediary.local',
      name: 'Super Admin',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      isSuperAdmin: true,
    },
  });

  console.log(`Created super admin: ${superAdmin.email}`);

  // Create default organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default',
      accentColor: '#6366f1',
    },
  });

  console.log(`Created organization: ${organization.name}`);

  // Add super admin as owner of default organization
  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: superAdmin.id,
      role: 'OWNER',
    },
  });

  console.log('Added super admin as organization owner');

  // Create a welcome page
  await prisma.page.create({
    data: {
      organizationId: organization.id,
      title: 'Welcome to LibreDiary',
      icon: '👋',
      createdById: superAdmin.id,
    },
  });

  console.log('Created welcome page');
  console.log('');
  console.log('========================================');
  console.log('Seed completed successfully!');
  console.log('');
  console.log('Default credentials:');
  console.log('  Email: admin@librediary.local');
  console.log('  Password: changeme123');
  console.log('');
  console.log('IMPORTANT: Change this password after first login!');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
