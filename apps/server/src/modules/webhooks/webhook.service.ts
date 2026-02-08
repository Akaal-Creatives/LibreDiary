import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import type { CreateWebhookInput, UpdateWebhookInput } from '@librediary/shared';

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

function maskSecret(secret: string): string {
  if (secret.length <= 10) return '****';
  return `${secret.substring(0, 6)}****${secret.substring(secret.length - 4)}`;
}

export async function createWebhook(orgId: string, userId: string, input: CreateWebhookInput) {
  const secret = generateSecret();

  const webhook = await prisma.webhook.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name: input.name,
      url: input.url,
      events: input.events,
      secret,
    },
  });

  // Return with unmasked secret on creation only
  return webhook;
}

export async function listWebhooks(orgId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  // Mask secrets
  return webhooks.map((w) => ({
    ...w,
    secret: maskSecret(w.secret),
  }));
}

export async function getWebhook(webhookId: string, orgId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  return {
    ...webhook,
    secret: maskSecret(webhook.secret),
  };
}

export async function updateWebhook(webhookId: string, orgId: string, input: UpdateWebhookInput) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  return prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteWebhook(webhookId: string, orgId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  await prisma.webhook.delete({ where: { id: webhookId } });
}
