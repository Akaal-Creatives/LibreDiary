import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { hash } from 'argon2';

/**
 * Reseeds demo data by clearing all user-generated data and recreating
 * the demo user with fresh seed data.
 */
export async function reseedDemoData(): Promise<void> {
  logger.info('Starting demo data reseed...');

  await prisma.$transaction(async (tx) => {
    // Delete in order respecting FK constraints (children first)
    await tx.webhookDelivery.deleteMany();
    await tx.webhook.deleteMany();
    await tx.apiToken.deleteMany();
    await tx.dataExport.deleteMany();
    await tx.backup.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.notification.deleteMany();
    await tx.mention.deleteMany();
    await tx.comment.deleteMany();
    await tx.favorite.deleteMany();
    await tx.pagePermission.deleteMany();
    await tx.pageVersion.deleteMany();
    await tx.databaseRow.deleteMany();
    await tx.databaseView.deleteMany();
    await tx.databaseProperty.deleteMany();
    await tx.database.deleteMany();
    await tx.file.deleteMany();
    await tx.page.deleteMany();
    await tx.template.deleteMany();
    await tx.invite.deleteMany();
    await tx.organizationMember.deleteMany();
    await tx.organization.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.verificationToken.deleteMany();
    await tx.user.deleteMany();
    await tx.systemSettings.deleteMany();
  });

  logger.info('All data cleared, recreating demo user...');

  // Recreate the demo user and organisation
  const passwordHash = await hash('password');

  const organization = await prisma.organization.create({
    data: {
      name: 'Demo Organisation',
      slug: 'demo',
      accentColor: '#7c9a8c',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'demo@librediary.org',
      name: 'Demo User',
      passwordHash,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  logger.info('Demo data reseed completed');
}
