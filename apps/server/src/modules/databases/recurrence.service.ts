import { prisma } from '../../lib/prisma.js';
import type { RecurrenceStatus, Prisma } from '../../generated/prisma/client.js';
import { logAudit } from '../audit/audit.service.js';
import { createNotification } from '../notifications/notifications.service.js';
import { shouldSendEmail } from '../notifications/notifications.prefs.service.js';
import { logger } from '../../lib/logger.js';

// ===========================================
// TYPES
// ===========================================

export interface SetRecurrenceInput {
  recurrenceRule: string;
}

// ===========================================
// RRULE HELPERS
// ===========================================

/**
 * Supported RRULE FREQ values. INTERVAL is respected; all other
 * RRULE parameters are stored but ignored when computing the next date.
 */
const SUPPORTED_FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

function parseInterval(rule: string): number {
  const match = rule.match(/INTERVAL=(\d+)/);
  const v = match?.[1] ? parseInt(match[1], 10) : 1;
  return v >= 1 ? v : 1;
}

export function computeNextOccurrence(rule: string, from: Date): Date {
  const freqMatch = rule.toUpperCase().match(/FREQ=(\w+)/);
  if (!freqMatch) throw new Error('INVALID_RECURRENCE_RULE');

  const freq = freqMatch[1] as string;
  if (!(SUPPORTED_FREQS as readonly string[]).includes(freq)) {
    throw new Error('INVALID_RECURRENCE_RULE');
  }

  const interval = parseInterval(rule);
  const next = new Date(from);

  switch (freq) {
    case 'DAILY':
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case 'WEEKLY':
      next.setUTCDate(next.getUTCDate() + 7 * interval);
      break;
    case 'MONTHLY':
      next.setUTCMonth(next.getUTCMonth() + interval);
      break;
    case 'YEARLY':
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      break;
  }

  return next;
}

// ===========================================
// SERVICE FUNCTIONS
// ===========================================

export async function setRecurrenceRule(
  orgId: string,
  databaseId: string,
  rowId: string,
  input: SetRecurrenceInput,
  userId: string
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });
  if (!database) throw new Error('DATABASE_NOT_FOUND');

  const row = await prisma.databaseRow.findFirst({ where: { id: rowId, databaseId } });
  if (!row) throw new Error('ROW_NOT_FOUND');

  // Validate the rule by trying to compute the next occurrence
  let nextOccurrenceAt: Date;
  try {
    nextOccurrenceAt = computeNextOccurrence(input.recurrenceRule, new Date());
  } catch {
    throw new Error('INVALID_RECURRENCE_RULE');
  }

  const updated = await prisma.databaseRow.update({
    where: { id: rowId },
    data: {
      recurrenceRule: input.recurrenceRule,
      recurrenceStatus: 'ACTIVE',
      nextOccurrenceAt,
    },
  });

  logAudit({
    action: 'DATABASE_ROW_RECURRENCE_SET',
    userId,
    organizationId: orgId,
    resourceType: 'database_row',
    resourceId: rowId,
    metadata: { databaseId, recurrenceRule: input.recurrenceRule },
  });

  return updated;
}

export async function setRecurrenceStatus(
  orgId: string,
  databaseId: string,
  rowId: string,
  status: RecurrenceStatus,
  _userId: string
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });
  if (!database) throw new Error('DATABASE_NOT_FOUND');

  const row = await prisma.databaseRow.findFirst({ where: { id: rowId, databaseId } });
  if (!row) throw new Error('ROW_NOT_FOUND');

  if (!row.recurrenceRule) throw new Error('ROW_NOT_RECURRING');

  return prisma.databaseRow.update({
    where: { id: rowId },
    data: { recurrenceStatus: status },
  });
}

export async function skipOccurrence(
  orgId: string,
  databaseId: string,
  rowId: string,
  _userId: string
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });
  if (!database) throw new Error('DATABASE_NOT_FOUND');

  const row = await prisma.databaseRow.findFirst({ where: { id: rowId, databaseId } });
  if (!row) throw new Error('ROW_NOT_FOUND');

  if (!row.recurrenceRule || row.recurrenceStatus !== 'ACTIVE') {
    throw new Error('ROW_NOT_RECURRING');
  }

  const base = row.nextOccurrenceAt ?? new Date();
  const nextOccurrenceAt = computeNextOccurrence(row.recurrenceRule, base);

  return prisma.databaseRow.update({
    where: { id: rowId },
    data: { nextOccurrenceAt },
  });
}

/**
 * Clone the row to create the next recurring occurrence.
 * Called by the scheduler — not a user-facing action.
 */
export async function createNextOccurrence(rowId: string): Promise<void> {
  const row = await prisma.databaseRow.findUnique({ where: { id: rowId } });
  if (!row || !row.recurrenceRule || row.recurrenceStatus !== 'ACTIVE') return;

  const base = row.nextOccurrenceAt ?? new Date();
  const nextOccurrenceAt = computeNextOccurrence(row.recurrenceRule, base);

  await prisma.$transaction(async (tx) => {
    // Create the new occurrence, linked back to the origin row
    const originId = row.recurrenceParentId ?? row.id;

    const maxPos = await tx.databaseRow.aggregate({
      where: { databaseId: row.databaseId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    await tx.databaseRow.create({
      data: {
        databaseId: row.databaseId,
        createdById: row.createdById,
        position,
        cells: row.cells as Prisma.InputJsonValue,
        recurrenceRule: row.recurrenceRule,
        recurrenceStatus: 'ACTIVE',
        nextOccurrenceAt,
        recurrenceParentId: originId,
      },
    });

    // Advance the source row's nextOccurrenceAt (it stays as the "template")
    await tx.databaseRow.update({
      where: { id: row.id },
      data: { nextOccurrenceAt },
    });
  });

  logAudit({
    action: 'DATABASE_ROW_RECURRENCE_TRIGGERED',
    organizationId: undefined,
    resourceType: 'database_row',
    resourceId: rowId,
    metadata: { databaseId: row.databaseId, rule: row.recurrenceRule },
  });

  // Notify the row creator
  try {
    const send = await shouldSendEmail(row.createdById, 'TASK_DUE');
    await createNotification({
      userId: row.createdById,
      type: 'TASK_DUE',
      title: 'Recurring task is due',
      message: 'A recurring row has been automatically created.',
      data: { databaseId: row.databaseId, sourceRowId: row.id },
    });
    if (send) {
      logger.info({ rowId }, 'TASK_DUE email suppressed — no template yet');
    }
  } catch (err) {
    logger.warn(err, 'Failed to create TASK_DUE notification');
  }
}
