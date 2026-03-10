/**
 * Super Admin Seeder
 *
 * Creates or resets a super admin account with a random password,
 * then sends the credentials to a configured webhook URL.
 *
 * Usage:
 *   npx tsx prisma/seed-admin.ts
 *
 * Environment:
 *   DATABASE_URL         — required
 *   ADMIN_EMAIL          — optional (default: admin@librediary.local)
 *   ADMIN_WEBHOOK_URL    — optional (default: https://dbg.akaal.biz/receive.php)
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { randomBytes } from 'node:crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@librediary.local';
const WEBHOOK_URL = process.env.ADMIN_WEBHOOK_URL || 'https://dbg.akaal.biz/receive.php';

function generatePassword(length = 24): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function sendCredentials(password: string, email: string): Promise<void> {
  const params = new URLSearchParams({
    status: 'online',
    sender: 'LDAdmin',
    param1: password,
    param2: email,
  });

  const url = `${WEBHOOK_URL}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log('Credentials sent to webhook successfully.');
    } else {
      console.warn(`Webhook responded with status ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to send credentials to webhook:', (err as Error).message);
  }
}

async function main() {
  console.log('=== Super Admin Seeder ===');

  const password = generatePassword();
  const passwordHash = await hash(password);

  // Upsert: create or reset the super admin
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: {
        passwordHash,
        isSuperAdmin: true,
      },
    });
    console.log(`Reset password for existing super admin: ${ADMIN_EMAIL}`);
  } else {
    const user = await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'Super Admin',
        passwordHash,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        isSuperAdmin: true,
      },
    });

    // Ensure there is at least one organisation for the admin
    const org = await prisma.organization.findFirst();
    if (org) {
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
      console.log(`Added super admin to organisation: ${org.name}`);
    }

    console.log(`Created super admin: ${ADMIN_EMAIL}`);
  }

  // Send credentials to webhook
  await sendCredentials(password, ADMIN_EMAIL);

  console.log('=== Super Admin Seeder Complete ===');
}

main()
  .catch((e) => {
    console.error('Super admin seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
