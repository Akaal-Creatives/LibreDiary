import { api } from './api';
import type {
  Database,
  DatabaseProperty,
  DatabaseView,
  DatabaseRow,
  DatabaseWithRelations,
  PropertyType,
  ViewType,
} from '@librediary/shared';

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
// SERVICE
// ===========================================

export const databasesService = {
  // --- Database CRUD ---

  async createDatabase(
    orgId: string,
    input: CreateDatabaseInput
  ): Promise<{ database: DatabaseWithRelations }> {
    return api.post<{ database: DatabaseWithRelations }>(
      `/organizations/${orgId}/databases`,
      input
    );
  },

  async listDatabases(orgId: string): Promise<{ databases: Database[] }> {
    return api.get<{ databases: Database[] }>(`/organizations/${orgId}/databases`);
  },

  async getDatabase(
    orgId: string,
    databaseId: string
  ): Promise<{ database: DatabaseWithRelations }> {
    return api.get<{ database: DatabaseWithRelations }>(
      `/organizations/${orgId}/databases/${databaseId}`
    );
  },

  async updateDatabase(
    orgId: string,
    databaseId: string,
    input: UpdateDatabaseInput
  ): Promise<{ database: Database }> {
    return api.patch<{ database: Database }>(
      `/organizations/${orgId}/databases/${databaseId}`,
      input
    );
  },

  async deleteDatabase(orgId: string, databaseId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/databases/${databaseId}`);
  },

  // --- Property Management ---

  async createProperty(
    orgId: string,
    databaseId: string,
    input: CreatePropertyInput
  ): Promise<{ property: DatabaseProperty }> {
    return api.post<{ property: DatabaseProperty }>(
      `/organizations/${orgId}/databases/${databaseId}/properties`,
      input
    );
  },

  async updateProperty(
    orgId: string,
    databaseId: string,
    propertyId: string,
    input: UpdatePropertyInput
  ): Promise<{ property: DatabaseProperty }> {
    return api.patch<{ property: DatabaseProperty }>(
      `/organizations/${orgId}/databases/${databaseId}/properties/${propertyId}`,
      input
    );
  },

  async deleteProperty(
    orgId: string,
    databaseId: string,
    propertyId: string
  ): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/properties/${propertyId}`
    );
  },

  async reorderProperties(
    orgId: string,
    databaseId: string,
    orderedIds: string[]
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/properties/reorder`,
      { orderedIds }
    );
  },

  // --- Row CRUD ---

  async createRow(
    orgId: string,
    databaseId: string,
    input: CreateRowInput
  ): Promise<{ row: DatabaseRow }> {
    return api.post<{ row: DatabaseRow }>(
      `/organizations/${orgId}/databases/${databaseId}/rows`,
      input
    );
  },

  async updateRow(
    orgId: string,
    databaseId: string,
    rowId: string,
    input: UpdateRowInput
  ): Promise<{ row: DatabaseRow }> {
    return api.patch<{ row: DatabaseRow }>(
      `/organizations/${orgId}/databases/${databaseId}/rows/${rowId}`,
      input
    );
  },

  async deleteRow(orgId: string, databaseId: string, rowId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/rows/${rowId}`
    );
  },

  async reorderRows(
    orgId: string,
    databaseId: string,
    orderedIds: string[]
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/rows/reorder`,
      { orderedIds }
    );
  },

  async bulkDeleteRows(
    orgId: string,
    databaseId: string,
    rowIds: string[]
  ): Promise<{ count: number; message: string }> {
    return api.post<{ count: number; message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/rows/bulk-delete`,
      { rowIds }
    );
  },

  // --- View Management ---

  async createView(
    orgId: string,
    databaseId: string,
    input: CreateViewInput
  ): Promise<{ view: DatabaseView }> {
    return api.post<{ view: DatabaseView }>(
      `/organizations/${orgId}/databases/${databaseId}/views`,
      input
    );
  },

  async updateView(
    orgId: string,
    databaseId: string,
    viewId: string,
    input: UpdateViewInput
  ): Promise<{ view: DatabaseView }> {
    return api.patch<{ view: DatabaseView }>(
      `/organizations/${orgId}/databases/${databaseId}/views/${viewId}`,
      input
    );
  },

  async deleteView(
    orgId: string,
    databaseId: string,
    viewId: string
  ): Promise<{ message: string }> {
    return api.delete<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/views/${viewId}`
    );
  },

  async reorderViews(
    orgId: string,
    databaseId: string,
    orderedIds: string[]
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/organizations/${orgId}/databases/${databaseId}/views/reorder`,
      { orderedIds }
    );
  },
};
