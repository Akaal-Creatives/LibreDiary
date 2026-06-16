import { prisma } from '../../lib/prisma.js';
import type { AutomationTriggerType, Automation, DatabaseRow, Prisma } from '../../generated/prisma/client.js';
import { createNotification } from '../notifications/notifications.service.js';
import { createPage } from '../pages/pages.service.js';
import { logAudit } from '../audit/audit.service.js';
import { writeAutomationLog } from './automation.service.js';
import { logger } from '../../lib/logger.js';

// ===========================================
// CONSTANTS
// ===========================================

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const MAX_DEPTH = 5;

interface RunContext {
  depth: number;
}

// ===========================================
// MAIN ENTRY POINT
// ===========================================

/**
 * Find and execute all enabled automations for a database matching the given trigger.
 * Safe to call inline after any database write — never throws to the caller.
 *
 * @param changedPropertyId  For PROPERTY_UPDATED only: the property that changed.
 */
export async function runAutomations(
  databaseId: string,
  triggerType: AutomationTriggerType,
  rowId: string,
  changedPropertyId?: string,
  ctx: RunContext = { depth: 0 }
): Promise<void> {
  if (ctx.depth >= MAX_DEPTH) return;

  try {
    // Per-database rate cap: prevent runaway loops
    const recentCount = await prisma.automationLog.count({
      where: {
        automation: { databaseId },
        createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
        status: { not: 'SKIPPED' },
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      logger.warn({ databaseId }, 'Automation rate limit reached, skipping');
      return;
    }

    const automations = await prisma.automation.findMany({
      where: { databaseId, isEnabled: true, triggerType },
    });

    for (const automation of automations) {
      if (triggerType === 'PROPERTY_UPDATED' && changedPropertyId) {
        const tc = automation.triggerConfig as Record<string, unknown> | null;
        if (tc?.propertyId && tc.propertyId !== changedPropertyId) continue;
      }
      await executeAutomation(automation, rowId, ctx);
    }
  } catch (err) {
    logger.error({ databaseId, triggerType, rowId, err }, 'runAutomations failed');
  }
}

// ===========================================
// EXECUTE ONE AUTOMATION
// ===========================================

async function executeAutomation(
  automation: Automation,
  rowId: string,
  ctx: RunContext
): Promise<void> {
  const start = Date.now();

  const row = await prisma.databaseRow.findUnique({ where: { id: rowId } });
  if (!row) return;

  // For PROPERTY_UPDATED: check matchValue condition
  if (automation.triggerType === 'PROPERTY_UPDATED') {
    const tc = automation.triggerConfig as Record<string, unknown> | null;
    if (tc?.propertyId && tc.matchValue !== undefined) {
      const cells = row.cells as Record<string, unknown>;
      if (cells[tc.propertyId as string] !== tc.matchValue) return;
    }
  }

  try {
    await executeAction(automation, row, ctx);
    await writeAutomationLog(automation.id, rowId, 'SUCCESS', Date.now() - start);
    logAudit({
      action: 'AUTOMATION_TRIGGERED',
      organizationId: automation.organizationId,
      resourceType: 'automation',
      resourceId: automation.id,
      metadata: { rowId, databaseId: automation.databaseId },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await writeAutomationLog(automation.id, rowId, 'FAILED', Date.now() - start, msg);
    logger.warn({ automationId: automation.id, rowId, err }, 'Automation action failed');
  }
}

// ===========================================
// EXECUTE ACTION
// ===========================================

async function executeAction(
  automation: Automation,
  row: DatabaseRow,
  ctx: RunContext
): Promise<void> {
  const ac = automation.actionConfig as Record<string, unknown> | null;

  switch (automation.actionType) {
    case 'UPDATE_PROPERTY': {
      if (!ac?.propertyId) throw new Error('UPDATE_PROPERTY requires propertyId in actionConfig');
      const propId = ac.propertyId as string;
      const cells = { ...(row.cells as Record<string, unknown>), [propId]: ac.value ?? null };
      await prisma.databaseRow.update({
        where: { id: row.id },
        data: { cells: cells as Prisma.InputJsonValue },
      });
      // Re-evaluate PROPERTY_UPDATED automations with depth + 1 (loop guard)
      await runAutomations(row.databaseId, 'PROPERTY_UPDATED', row.id, propId, {
        depth: ctx.depth + 1,
      });
      break;
    }

    case 'SEND_NOTIFICATION': {
      await createNotification({
        userId: row.createdById,
        type: 'AUTOMATION',
        title: automation.name,
        message: (ac?.message as string | undefined) ?? null,
        data: { databaseId: row.databaseId, rowId: row.id, automationId: automation.id },
      });
      break;
    }

    case 'CREATE_PAGE': {
      const db = await prisma.database.findUnique({ where: { id: row.databaseId } });
      if (!db) throw new Error('DATABASE_NOT_FOUND');
      await createPage(db.organizationId, row.createdById, {
        title: (ac?.pageTitle as string | undefined) ?? 'Automated Page',
      });
      break;
    }

    default:
      throw new Error(`Unknown action type: ${automation.actionType}`);
  }
}
