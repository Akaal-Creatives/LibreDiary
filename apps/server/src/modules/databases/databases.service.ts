import { prisma } from '../../lib/prisma.js';
import type { PropertyType, ViewType } from '../../generated/prisma/client.js';

// ===========================================
// TYPES
// ===========================================

export interface CreateDatabaseInput {
  name: string;
  pageId?: string;
}

export interface UpdateDatabaseInput {
  name?: string;
  pageId?: string | null;
}

export interface CreatePropertyInput {
  name: string;
  type: PropertyType;
  config?: Record<string, unknown>;
}

export interface UpdatePropertyInput {
  name?: string;
  type?: PropertyType;
  config?: Record<string, unknown> | null;
}

export interface CreateRowInput {
  cells?: Record<string, unknown>;
}

export interface UpdateRowInput {
  cells?: Record<string, unknown>;
}

export interface CreateViewInput {
  name: string;
  type: ViewType;
  config?: Record<string, unknown>;
}

export interface UpdateViewInput {
  name?: string;
  type?: ViewType;
  config?: Record<string, unknown> | null;
}

// ===========================================
// HELPER
// ===========================================

async function getNextPropertyPosition(databaseId: string): Promise<number> {
  const max = await prisma.databaseProperty.aggregate({
    where: { databaseId },
    _max: { position: true },
  });
  return (max._max.position ?? -1) + 1;
}

async function getNextRowPosition(databaseId: string): Promise<number> {
  const max = await prisma.databaseRow.aggregate({
    where: { databaseId },
    _max: { position: true },
  });
  return (max._max.position ?? -1) + 1;
}

async function getNextViewPosition(databaseId: string): Promise<number> {
  const max = await prisma.databaseView.aggregate({
    where: { databaseId },
    _max: { position: true },
  });
  return (max._max.position ?? -1) + 1;
}

// ===========================================
// DATABASE CRUD
// ===========================================

export async function createDatabase(orgId: string, userId: string, input: CreateDatabaseInput) {
  return prisma.$transaction(async (tx) => {
    const database = await tx.database.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: input.name,
        pageId: input.pageId ?? null,
      },
    });

    // Auto-create default "Title" TEXT property at position 0
    await tx.databaseProperty.create({
      data: {
        databaseId: database.id,
        name: 'Title',
        type: 'TEXT',
        position: 0,
      },
    });

    // Auto-create default "Table view" TABLE view at position 0
    await tx.databaseView.create({
      data: {
        databaseId: database.id,
        name: 'Table view',
        type: 'TABLE',
        position: 0,
      },
    });

    // Return with relations
    return tx.database.findUniqueOrThrow({
      where: { id: database.id },
      include: {
        properties: { orderBy: { position: 'asc' } },
        views: { orderBy: { position: 'asc' } },
        rows: { orderBy: { position: 'asc' } },
      },
    });
  });
}

export async function getDatabase(orgId: string, databaseId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
    include: {
      properties: { orderBy: { position: 'asc' } },
      views: { orderBy: { position: 'asc' } },
      rows: { orderBy: { position: 'asc' } },
    },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  return database;
}

export async function listDatabases(orgId: string) {
  return prisma.database.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateDatabase(
  orgId: string,
  databaseId: string,
  input: UpdateDatabaseInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  return prisma.database.update({
    where: { id: databaseId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.pageId !== undefined && { pageId: input.pageId }),
    },
  });
}

export async function deleteDatabase(orgId: string, databaseId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  await prisma.database.delete({ where: { id: databaseId } });
}

// ===========================================
// PROPERTY MANAGEMENT
// ===========================================

export async function createProperty(
  orgId: string,
  databaseId: string,
  input: CreatePropertyInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const position = await getNextPropertyPosition(databaseId);

  return prisma.databaseProperty.create({
    data: {
      databaseId,
      name: input.name,
      type: input.type,
      position,
      config: input.config ?? undefined,
    },
  });
}

export async function updateProperty(
  orgId: string,
  databaseId: string,
  propertyId: string,
  input: UpdatePropertyInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const property = await prisma.databaseProperty.findFirst({
    where: { id: propertyId, databaseId },
  });

  if (!property) {
    throw new Error('PROPERTY_NOT_FOUND');
  }

  return prisma.databaseProperty.update({
    where: { id: propertyId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.config !== undefined && { config: input.config }),
    },
  });
}

export async function deleteProperty(orgId: string, databaseId: string, propertyId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const property = await prisma.databaseProperty.findFirst({
    where: { id: propertyId, databaseId },
  });

  if (!property) {
    throw new Error('PROPERTY_NOT_FOUND');
  }

  // Cannot delete the first (position 0) "Title" property
  if (property.position === 0) {
    throw new Error('CANNOT_DELETE_TITLE_PROPERTY');
  }

  // Delete property and strip its key from all row cells
  await prisma.$transaction(async (tx) => {
    // Get all rows and strip the property key from cells
    const rows = await tx.databaseRow.findMany({
      where: { databaseId },
      select: { id: true, cells: true },
    });

    for (const row of rows) {
      const cells = (row.cells as Record<string, unknown>) ?? {};
      if (propertyId in cells) {
        const { [propertyId]: _, ...remainingCells } = cells;
        await tx.databaseRow.update({
          where: { id: row.id },
          data: { cells: remainingCells },
        });
      }
    }

    await tx.databaseProperty.delete({ where: { id: propertyId } });
  });
}

export async function reorderProperties(orgId: string, databaseId: string, orderedIds: string[]) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const properties = await prisma.databaseProperty.findMany({
    where: { databaseId },
    select: { id: true },
  });

  const propertyIdSet = new Set(properties.map((p) => p.id));
  for (const id of orderedIds) {
    if (!propertyIdSet.has(id)) {
      throw new Error('PROPERTY_NOT_FOUND');
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.databaseProperty.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}

// ===========================================
// ROW CRUD
// ===========================================

export async function createRow(
  orgId: string,
  databaseId: string,
  userId: string,
  input: CreateRowInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const position = await getNextRowPosition(databaseId);

  return prisma.databaseRow.create({
    data: {
      databaseId,
      createdById: userId,
      position,
      cells: input.cells ?? {},
    },
  });
}

export async function getRow(orgId: string, databaseId: string, rowId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const row = await prisma.databaseRow.findFirst({
    where: { id: rowId, databaseId },
  });

  if (!row) {
    throw new Error('ROW_NOT_FOUND');
  }

  return row;
}

export async function updateRow(
  orgId: string,
  databaseId: string,
  rowId: string,
  input: UpdateRowInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const row = await prisma.databaseRow.findFirst({
    where: { id: rowId, databaseId },
  });

  if (!row) {
    throw new Error('ROW_NOT_FOUND');
  }

  // Merge cells: spread new values over existing
  const existingCells = (row.cells as Record<string, unknown>) ?? {};
  const mergedCells = { ...existingCells, ...(input.cells ?? {}) };

  return prisma.databaseRow.update({
    where: { id: rowId },
    data: { cells: mergedCells },
  });
}

export async function deleteRow(orgId: string, databaseId: string, rowId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const row = await prisma.databaseRow.findFirst({
    where: { id: rowId, databaseId },
  });

  if (!row) {
    throw new Error('ROW_NOT_FOUND');
  }

  await prisma.databaseRow.delete({ where: { id: rowId } });
}

export async function reorderRows(orgId: string, databaseId: string, orderedIds: string[]) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const rows = await prisma.databaseRow.findMany({
    where: { databaseId },
    select: { id: true },
  });

  const rowIdSet = new Set(rows.map((r) => r.id));
  for (const id of orderedIds) {
    if (!rowIdSet.has(id)) {
      throw new Error('ROW_NOT_FOUND');
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.databaseRow.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}

export async function bulkDeleteRows(orgId: string, databaseId: string, rowIds: string[]) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const result = await prisma.databaseRow.deleteMany({
    where: {
      id: { in: rowIds },
      databaseId,
    },
  });

  return result.count;
}

// ===========================================
// VIEW MANAGEMENT
// ===========================================

export async function createView(orgId: string, databaseId: string, input: CreateViewInput) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const position = await getNextViewPosition(databaseId);

  return prisma.databaseView.create({
    data: {
      databaseId,
      name: input.name,
      type: input.type,
      position,
      config: input.config ?? undefined,
    },
  });
}

export async function updateView(
  orgId: string,
  databaseId: string,
  viewId: string,
  input: UpdateViewInput
) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const view = await prisma.databaseView.findFirst({
    where: { id: viewId, databaseId },
  });

  if (!view) {
    throw new Error('VIEW_NOT_FOUND');
  }

  return prisma.databaseView.update({
    where: { id: viewId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.config !== undefined && { config: input.config }),
    },
  });
}

export async function deleteView(orgId: string, databaseId: string, viewId: string) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const view = await prisma.databaseView.findFirst({
    where: { id: viewId, databaseId },
  });

  if (!view) {
    throw new Error('VIEW_NOT_FOUND');
  }

  // Cannot delete the last remaining view
  const viewCount = await prisma.databaseView.count({ where: { databaseId } });
  if (viewCount <= 1) {
    throw new Error('CANNOT_DELETE_LAST_VIEW');
  }

  await prisma.databaseView.delete({ where: { id: viewId } });
}

export async function reorderViews(orgId: string, databaseId: string, orderedIds: string[]) {
  const database = await prisma.database.findFirst({
    where: { id: databaseId, organizationId: orgId },
  });

  if (!database) {
    throw new Error('DATABASE_NOT_FOUND');
  }

  const views = await prisma.databaseView.findMany({
    where: { databaseId },
    select: { id: true },
  });

  const viewIdSet = new Set(views.map((v) => v.id));
  for (const id of orderedIds) {
    if (!viewIdSet.has(id)) {
      throw new Error('VIEW_NOT_FOUND');
    }
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.databaseView.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}
