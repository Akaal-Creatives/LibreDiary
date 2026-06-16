import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../audit/audit.service.js';
import { logger } from '../../lib/logger.js';
import type { CreateAutomationInput, UpdateAutomationInput } from '@librediary/shared/schemas';
import type { Prisma } from '../../generated/prisma/client.js';

const AUTOMATION_LIMIT = 50;

// ===========================================
// LIST
// ===========================================

export async function listAutomations(orgId: string, databaseId: string) {
  const db = await prisma.database.findFirst({ where: { id: databaseId, organizationId: orgId } });
  if (!db) throw new Error('DATABASE_NOT_FOUND');

  return prisma.automation.findMany({
    where: { databaseId },
    orderBy: { createdAt: 'asc' },
  });
}

// ===========================================
// CREATE
// ===========================================

export async function createAutomation(
  orgId: string,
  databaseId: string,
  input: CreateAutomationInput,
  userId: string
) {
  const db = await prisma.database.findFirst({ where: { id: databaseId, organizationId: orgId } });
  if (!db) throw new Error('DATABASE_NOT_FOUND');

  const count = await prisma.automation.count({ where: { databaseId } });
  if (count >= AUTOMATION_LIMIT) throw new Error('AUTOMATION_LIMIT_REACHED');

  const automation = await prisma.automation.create({
    data: {
      organizationId: orgId,
      databaseId,
      name: input.name,
      triggerType: input.triggerType,
      triggerConfig: (input.triggerConfig as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      actionType: input.actionType,
      actionConfig: (input.actionConfig as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      createdById: userId,
    },
  });

  logAudit({
    action: 'AUTOMATION_CREATED',
    userId,
    organizationId: orgId,
    resourceType: 'automation',
    resourceId: automation.id,
    metadata: { databaseId, triggerType: input.triggerType, actionType: input.actionType },
  });

  return automation;
}

// ===========================================
// UPDATE
// ===========================================

export async function updateAutomation(
  orgId: string,
  automationId: string,
  input: UpdateAutomationInput,
  userId: string
) {
  const automation = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: orgId },
  });
  if (!automation) throw new Error('AUTOMATION_NOT_FOUND');

  const updated = await prisma.automation.update({
    where: { id: automationId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
      ...(input.triggerType !== undefined && { triggerType: input.triggerType }),
      ...(input.triggerConfig !== undefined && {
        triggerConfig: (input.triggerConfig as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      }),
      ...(input.actionType !== undefined && { actionType: input.actionType }),
      ...(input.actionConfig !== undefined && {
        actionConfig: (input.actionConfig as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
      }),
    },
  });

  logAudit({
    action: 'AUTOMATION_UPDATED',
    userId,
    organizationId: orgId,
    resourceType: 'automation',
    resourceId: automationId,
  });

  return updated;
}

// ===========================================
// DELETE
// ===========================================

export async function deleteAutomation(orgId: string, automationId: string, userId: string) {
  const automation = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: orgId },
  });
  if (!automation) throw new Error('AUTOMATION_NOT_FOUND');

  await prisma.automation.delete({ where: { id: automationId } });

  logAudit({
    action: 'AUTOMATION_DELETED',
    userId,
    organizationId: orgId,
    resourceType: 'automation',
    resourceId: automationId,
  });
}

// ===========================================
// LOGS
// ===========================================

export async function getAutomationLogs(orgId: string, automationId: string, limit = 50) {
  const automation = await prisma.automation.findFirst({
    where: { id: automationId, organizationId: orgId },
  });
  if (!automation) throw new Error('AUTOMATION_NOT_FOUND');

  return prisma.automationLog.findMany({
    where: { automationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ===========================================
// INTERNAL: write a log entry (used by engine)
// ===========================================

export async function writeAutomationLog(
  automationId: string,
  triggerRowId: string | null,
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
  durationMs: number,
  errorMessage?: string
) {
  try {
    await prisma.automationLog.create({
      data: { automationId, triggerRowId, status, durationMs, errorMessage },
    });
  } catch (err) {
    logger.warn({ automationId, err }, 'Failed to write automation log');
  }
}
