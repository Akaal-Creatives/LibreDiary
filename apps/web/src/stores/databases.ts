import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Database,
  DatabaseProperty,
  DatabaseView,
  DatabaseRow,
  DatabaseWithRelations,
} from '@librediary/shared';
import { databasesService } from '@/services';
import type {
  CreateDatabaseServiceInput,
  UpdateDatabaseServiceInput,
  CreatePropertyServiceInput,
  UpdatePropertyServiceInput,
  CreateRowServiceInput,
  UpdateRowServiceInput,
  CreateViewServiceInput,
  UpdateViewServiceInput,
} from '@/services';
import { useAuthStore } from './auth';

export const useDatabasesStore = defineStore('databases', () => {
  // ===========================================
  // STATE
  // ===========================================

  const databases = ref<Map<string, Database>>(new Map());
  const currentDatabaseId = ref<string | null>(null);
  const properties = ref<DatabaseProperty[]>([]);
  const views = ref<DatabaseView[]>([]);
  const rows = ref<DatabaseRow[]>([]);
  const activeViewId = ref<string | null>(null);
  const loading = ref(false);

  // ===========================================
  // GETTERS
  // ===========================================

  const currentDatabase = computed(() =>
    currentDatabaseId.value ? (databases.value.get(currentDatabaseId.value) ?? null) : null
  );

  const databaseList = computed(() => Array.from(databases.value.values()));

  const sortedProperties = computed(() =>
    [...properties.value].sort((a, b) => a.position - b.position)
  );

  const sortedRows = computed(() => [...rows.value].sort((a, b) => a.position - b.position));

  const activeView = computed(() => {
    if (!activeViewId.value) return views.value[0] ?? null;
    return views.value.find((v) => v.id === activeViewId.value) ?? views.value[0] ?? null;
  });

  const filteredAndSortedRows = computed(() => {
    const view = activeView.value;
    let result = sortedRows.value;

    if (!view?.config) return result;

    const config = view.config as Record<string, unknown>;

    // Apply filters
    const filters = config.filters as
      | Array<{ propertyId: string; operator: string; value: unknown }>
      | undefined;
    if (filters && filters.length > 0) {
      result = result.filter((row) => {
        return filters.every((filter) => {
          const cellValue = (row.cells as Record<string, unknown>)[filter.propertyId];
          return applyFilter(cellValue, filter.operator, filter.value);
        });
      });
    }

    // Apply sorts
    const sorts = config.sorts as
      | Array<{ propertyId: string; direction: 'asc' | 'desc' }>
      | undefined;
    if (sorts && sorts.length > 0) {
      result = [...result].sort((a, b) => {
        for (const sort of sorts) {
          const aVal = (a.cells as Record<string, unknown>)[sort.propertyId];
          const bVal = (b.cells as Record<string, unknown>)[sort.propertyId];
          const cmp = compareValues(aVal, bVal);
          if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    return result;
  });

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================

  function getOrgId(): string {
    const authStore = useAuthStore();
    if (!authStore.currentOrganizationId) {
      throw new Error('No organisation selected');
    }
    return authStore.currentOrganizationId;
  }

  function applyFilter(cellValue: unknown, operator: string, filterValue: unknown): boolean {
    const str = String(cellValue ?? '').toLowerCase();
    const filterStr = String(filterValue ?? '').toLowerCase();

    switch (operator) {
      case 'contains':
        return str.includes(filterStr);
      case 'equals':
        return str === filterStr;
      case 'not_equals':
        return str !== filterStr;
      case 'is_empty':
        return !cellValue;
      case 'is_not_empty':
        return !!cellValue;
      case 'gt':
        return Number(cellValue) > Number(filterValue);
      case 'lt':
        return Number(cellValue) < Number(filterValue);
      case 'gte':
        return Number(cellValue) >= Number(filterValue);
      case 'lte':
        return Number(cellValue) <= Number(filterValue);
      case 'is':
        return cellValue === filterValue;
      case 'is_not':
        return cellValue !== filterValue;
      case 'before':
        return String(cellValue ?? '') < String(filterValue ?? '');
      case 'after':
        return String(cellValue ?? '') > String(filterValue ?? '');
      case 'is_checked':
        return cellValue === true;
      case 'is_unchecked':
        return cellValue !== true;
      default:
        return true;
    }
  }

  function compareValues(a: unknown, b: unknown): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }

    return String(a).localeCompare(String(b));
  }

  function setDatabaseData(db: DatabaseWithRelations) {
    databases.value.set(db.id, db);
    currentDatabaseId.value = db.id;
    properties.value = db.properties;
    views.value = db.views;
    rows.value = db.rows;
    if (!activeViewId.value && db.views.length > 0) {
      activeViewId.value = db.views[0].id;
    }
  }

  // ===========================================
  // API ACTIONS - DATABASE CRUD
  // ===========================================

  async function fetchDatabases(): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await databasesService.listDatabases(orgId);
      databases.value.clear();
      for (const db of data.databases) {
        databases.value.set(db.id, db);
      }
    } finally {
      loading.value = false;
    }
  }

  async function fetchDatabase(databaseId: string): Promise<DatabaseWithRelations> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await databasesService.getDatabase(orgId, databaseId);
      setDatabaseData(data.database);
      return data.database;
    } finally {
      loading.value = false;
    }
  }

  async function createDatabase(input: CreateDatabaseServiceInput): Promise<DatabaseWithRelations> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await databasesService.createDatabase(orgId, input);
      setDatabaseData(data.database);
      return data.database;
    } finally {
      loading.value = false;
    }
  }

  async function updateDatabase(
    databaseId: string,
    input: UpdateDatabaseServiceInput
  ): Promise<Database> {
    const orgId = getOrgId();
    const data = await databasesService.updateDatabase(orgId, databaseId, input);
    databases.value.set(databaseId, data.database);
    return data.database;
  }

  async function deleteDatabase(databaseId: string): Promise<void> {
    const orgId = getOrgId();
    await databasesService.deleteDatabase(orgId, databaseId);
    databases.value.delete(databaseId);
    if (currentDatabaseId.value === databaseId) {
      currentDatabaseId.value = null;
      properties.value = [];
      views.value = [];
      rows.value = [];
      activeViewId.value = null;
    }
  }

  // ===========================================
  // API ACTIONS - PROPERTY MANAGEMENT
  // ===========================================

  async function createProperty(input: CreatePropertyServiceInput): Promise<DatabaseProperty> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.createProperty(orgId, dbId, input);
    properties.value.push(data.property);
    return data.property;
  }

  async function updateProperty(
    propertyId: string,
    input: UpdatePropertyServiceInput
  ): Promise<DatabaseProperty> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.updateProperty(orgId, dbId, propertyId, input);
    const idx = properties.value.findIndex((p) => p.id === propertyId);
    if (idx !== -1) {
      properties.value[idx] = data.property;
    }
    return data.property;
  }

  async function deleteProperty(propertyId: string): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.deleteProperty(orgId, dbId, propertyId);
    properties.value = properties.value.filter((p) => p.id !== propertyId);
    // Strip property from row cells
    for (const row of rows.value) {
      const cells = row.cells as Record<string, unknown>;
      if (propertyId in cells) {
        const { [propertyId]: _, ...rest } = cells;
        row.cells = rest;
      }
    }
  }

  async function reorderProperties(orderedIds: string[]): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.reorderProperties(orgId, dbId, orderedIds);
    // Update local positions
    properties.value = orderedIds
      .map((id, idx) => {
        const prop = properties.value.find((p) => p.id === id);
        return prop ? { ...prop, position: idx } : null;
      })
      .filter((p): p is DatabaseProperty => p !== null);
  }

  // ===========================================
  // API ACTIONS - ROW CRUD
  // ===========================================

  async function createRow(input?: CreateRowServiceInput): Promise<DatabaseRow> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.createRow(orgId, dbId, input ?? {});
    rows.value.push(data.row);
    return data.row;
  }

  async function updateRow(rowId: string, input: UpdateRowServiceInput): Promise<DatabaseRow> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.updateRow(orgId, dbId, rowId, input);
    const idx = rows.value.findIndex((r) => r.id === rowId);
    if (idx !== -1) {
      rows.value[idx] = data.row;
    }
    return data.row;
  }

  async function updateRowCell(
    rowId: string,
    propertyId: string,
    value: unknown
  ): Promise<DatabaseRow> {
    return updateRow(rowId, { cells: { [propertyId]: value } });
  }

  async function deleteRow(rowId: string): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.deleteRow(orgId, dbId, rowId);
    rows.value = rows.value.filter((r) => r.id !== rowId);
  }

  async function reorderRows(orderedIds: string[]): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.reorderRows(orgId, dbId, orderedIds);
    rows.value = orderedIds
      .map((id, idx) => {
        const row = rows.value.find((r) => r.id === id);
        return row ? { ...row, position: idx } : null;
      })
      .filter((r): r is DatabaseRow => r !== null);
  }

  async function bulkDeleteRows(rowIds: string[]): Promise<number> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.bulkDeleteRows(orgId, dbId, rowIds);
    const deleteSet = new Set(rowIds);
    rows.value = rows.value.filter((r) => !deleteSet.has(r.id));
    return data.count;
  }

  // ===========================================
  // API ACTIONS - VIEW MANAGEMENT
  // ===========================================

  async function createView(input: CreateViewServiceInput): Promise<DatabaseView> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.createView(orgId, dbId, input);
    views.value.push(data.view);
    return data.view;
  }

  async function updateView(viewId: string, input: UpdateViewServiceInput): Promise<DatabaseView> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    const data = await databasesService.updateView(orgId, dbId, viewId, input);
    const idx = views.value.findIndex((v) => v.id === viewId);
    if (idx !== -1) {
      views.value[idx] = data.view;
    }
    return data.view;
  }

  async function deleteView(viewId: string): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.deleteView(orgId, dbId, viewId);
    views.value = views.value.filter((v) => v.id !== viewId);
    if (activeViewId.value === viewId) {
      activeViewId.value = views.value[0]?.id ?? null;
    }
  }

  async function reorderViews(orderedIds: string[]): Promise<void> {
    const orgId = getOrgId();
    const dbId = currentDatabaseId.value!;
    await databasesService.reorderViews(orgId, dbId, orderedIds);
    views.value = orderedIds
      .map((id, idx) => {
        const view = views.value.find((v) => v.id === id);
        return view ? { ...view, position: idx } : null;
      })
      .filter((v): v is DatabaseView => v !== null);
  }

  function setActiveView(viewId: string) {
    activeViewId.value = viewId;
  }

  // ===========================================
  // RESET
  // ===========================================

  function reset() {
    databases.value.clear();
    currentDatabaseId.value = null;
    properties.value = [];
    views.value = [];
    rows.value = [];
    activeViewId.value = null;
  }

  return {
    // State
    databases,
    currentDatabaseId,
    properties,
    views,
    rows,
    activeViewId,
    loading,
    // Getters
    currentDatabase,
    databaseList,
    sortedProperties,
    sortedRows,
    activeView,
    filteredAndSortedRows,
    // API Actions - Database
    fetchDatabases,
    fetchDatabase,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    // API Actions - Properties
    createProperty,
    updateProperty,
    deleteProperty,
    reorderProperties,
    // API Actions - Rows
    createRow,
    updateRow,
    updateRowCell,
    deleteRow,
    reorderRows,
    bulkDeleteRows,
    // API Actions - Views
    createView,
    updateView,
    deleteView,
    reorderViews,
    setActiveView,
    // Reset
    reset,
  };
});
