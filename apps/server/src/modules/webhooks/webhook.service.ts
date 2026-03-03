import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import type { CreateWebhookInput, UpdateWebhookInput } from '@librediary/shared';
import { logAudit } from '../audit/audit.service.js';
import { validateWebhookUrl } from '../../utils/url-validation.js';

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

function maskSecret(secret: string): string {
  if (secret.length <= 10) return '****';
  return `${secret.substring(0, 6)}****${secret.substring(secret.length - 4)}`;
}

export async function createWebhook(orgId: string, userId: string, input: CreateWebhookInput) {
  // Validate URL to prevent SSRF
  const urlCheck = await validateWebhookUrl(input.url);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.reason ?? 'Invalid webhook URL');
  }

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

  logAudit({
    action: 'WEBHOOK_CREATED',
    userId,
    organizationId: orgId,
    resourceType: 'webhook',
    resourceId: webhook.id,
    metadata: { name: input.name, url: input.url },
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

  // Validate URL if being updated
  if (input.url !== undefined) {
    const urlCheck = await validateWebhookUrl(input.url);
    if (!urlCheck.valid) {
      throw new Error(urlCheck.reason ?? 'Invalid webhook URL');
    }
  }

  const updated = await prisma.webhook.update({
    where: { id: webhookId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.events !== undefined && { events: input.events }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  logAudit({
    action: 'WEBHOOK_UPDATED',
    organizationId: orgId,
    resourceType: 'webhook',
    resourceId: webhookId,
  });

  return updated;
}

export async function deleteWebhook(webhookId: string, orgId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  await prisma.webhook.delete({ where: { id: webhookId } });

  logAudit({
    action: 'WEBHOOK_DELETED',
    organizationId: orgId,
    resourceType: 'webhook',
    resourceId: webhookId,
    metadata: { name: webhook.name },
  });
}
