import { createHmac } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 5 * 60 * 1000, 30 * 60 * 1000]; // immediate, 5min, 30min

export function generateSignature(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export async function triggerWebhooks(orgId: string, event: string, data: Record<string, unknown>) {
  // Find all active webhooks for this org that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  // Create delivery records and execute them
  for (const webhook of webhooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        status: 'PENDING',
        attempts: 0,
      },
    });

    // Execute immediately (fire-and-forget)
    executeDelivery(delivery.id).catch(() => {});
  }
}

export async function executeDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });

  if (!delivery || !delivery.webhook) return;

  const payloadStr = JSON.stringify(delivery.payload);
  const signature = generateSignature(payloadStr, delivery.webhook.secret);

  const attempt = delivery.attempts + 1;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LibreDiary-Signature': signature,
        'X-LibreDiary-Event': delivery.event,
        'X-LibreDiary-Delivery': delivery.id,
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000), // Limit stored response
          attempts: attempt,
          completedAt: new Date(),
          nextRetryAt: null,
        },
      });
    } else {
      await handleFailure(deliveryId, attempt, response.status, responseBody);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await handleFailure(deliveryId, attempt, null, message);
  }
}

async function handleFailure(
  deliveryId: string,
  attempt: number,
  statusCode: number | null,
  responseBody: string
) {
  const shouldRetry = attempt < MAX_ATTEMPTS;
  const nextRetryAt = shouldRetry ? new Date(Date.now() + RETRY_DELAYS_MS[attempt]) : null;

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: shouldRetry ? 'PENDING' : 'FAILED',
      statusCode,
      responseBody: responseBody.substring(0, 1000),
      attempts: attempt,
      ...(shouldRetry ? { nextRetryAt } : { completedAt: new Date(), nextRetryAt: null }),
    },
  });

  // Schedule retry with in-process timeout
  if (shouldRetry && nextRetryAt) {
    const delay = nextRetryAt.getTime() - Date.now();
    setTimeout(() => {
      executeDelivery(deliveryId).catch(() => {});
    }, delay);
  }
}

export async function retryFailedDeliveries() {
  const pendingRetries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: { lte: new Date() },
      attempts: { gt: 0 },
    },
  });

  let retried = 0;
  for (const delivery of pendingRetries) {
    executeDelivery(delivery.id).catch(() => {});
    retried++;
  }

  return retried;
}

export async function listDeliveries(webhookId: string, orgId: string, limit = 50, offset = 0) {
  // Verify webhook belongs to org
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.webhookDelivery.count({ where: { webhookId } }),
  ]);

  return { deliveries, total };
}

export async function testWebhook(webhookId: string, orgId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, organizationId: orgId },
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const payload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test delivery from LibreDiary',
      webhookId: webhook.id,
    },
  };

  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: 'webhook.test',
      payload,
      status: 'PENDING',
      attempts: 0,
    },
  });

  // Execute synchronously for test deliveries
  await executeDelivery(delivery.id);

  // Return updated delivery
  return prisma.webhookDelivery.findUnique({
    where: { id: delivery.id },
  });
}
