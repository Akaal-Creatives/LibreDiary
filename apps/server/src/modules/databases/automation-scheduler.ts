import cron from 'node-cron';
import { prisma } from '../../lib/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { runAutomations } from './automation-engine.js';
import { logger } from '../../lib/logger.js';

// Runs every hour — scans for DATE_REACHED automations whose target date has passed
const SCHEDULE = '0 * * * *';

let task: ReturnType<typeof cron.schedule> | null = null;

export function startAutomationScheduler() {
  if (task) return;
  task = cron.schedule(SCHEDULE, () => {
    void runDateReachedAutomations();
  });
  logger.info('Automation scheduler started');
}

export function stopAutomationScheduler() {
  task?.stop();
  task = null;
}

// ===========================================
// DATE_REACHED SCAN
// ===========================================

async function runDateReachedAutomations(): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({
      where: { isEnabled: true, triggerType: 'DATE_REACHED', triggerConfig: { not: Prisma.JsonNull } },
    });

    for (const automation of automations) {
      await processDateReachedAutomation(automation.id);
    }
  } catch (err) {
    logger.error({ err }, 'DATE_REACHED automation scan failed');
  }
}

async function processDateReachedAutomation(automationId: string): Promise<void> {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation) return;

  const tc = automation.triggerConfig as Record<string, unknown> | null;
  if (!tc?.propertyId) return;

  const propertyId = tc.propertyId as string;
  const daysBeforeDate = typeof tc.daysBeforeDate === 'number' ? tc.daysBeforeDate : 0;
  const targetCutoff = new Date(Date.now() + daysBeforeDate * 24 * 60 * 60 * 1000);

  // Fetch all rows in the database that have a date cell value <= targetCutoff
  const rows = await prisma.databaseRow.findMany({
    where: { databaseId: automation.databaseId },
    select: { id: true, cells: true },
  });

  for (const row of rows) {
    const cells = row.cells as Record<string, unknown>;
    const cellValue = cells[propertyId];
    if (!cellValue || typeof cellValue !== 'string') continue;

    const cellDate = new Date(cellValue);
    if (isNaN(cellDate.getTime())) continue;
    if (cellDate > targetCutoff) continue;

    // Skip if we already fired for this automation + row in the last 24 hours
    const recentFire = await prisma.automationLog.findFirst({
      where: {
        automationId,
        triggerRowId: row.id,
        status: 'SUCCESS',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentFire) continue;

    await runAutomations(automation.databaseId, 'DATE_REACHED', row.id);
  }
}
