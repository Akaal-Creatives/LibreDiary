import { api } from './api';

// Types
export interface AdminStats {
  users: {
    total: number;
    verified: number;
    superAdmins: number;
  };
  organizations: {
    total: number;
    active: number;
  };
  pages: number;
  databases: number;
  files: {
    total: number;
    totalSize: number;
  };
  templates: number;
  backups: number;
}

export interface SystemHealth {
  database: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  storage: {
    status: 'connected' | 'disconnected';
    error?: string;
  };
  collaboration: {
    status: 'connected' | 'disconnected';
  };
  server: {
    uptime: number;
    nodeVersion: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
  organizationCount: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  memberships: {
    id: string;
    role: string;
    createdAt: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  createdAt: string;
  deletedAt: string | null;
  memberCount: number;
}

export interface AdminOrgDetail {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  allowedDomains: string[];
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  members: {
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }[];
}

// API Functions
export async function getStats(): Promise<AdminStats> {
  const response = await api.get<{ stats: AdminStats }>('/admin/stats');
  return response.stats;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await api.get<{ health: SystemHealth }>('/admin/health');
  return response.health;
}

// Users
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: AdminUser[]; pagination: Pagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/users?${query}` : '/admin/users';

  return api.get<{ users: AdminUser[]; pagination: Pagination }>(endpoint);
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  const response = await api.get<{ user: AdminUserDetail }>(`/admin/users/${userId}`);
  return response.user;
}

export async function updateUser(
  userId: string,
  data: { name?: string; isSuperAdmin?: boolean }
): Promise<AdminUser> {
  const response = await api.patch<{ user: AdminUser }>(`/admin/users/${userId}`, data);
  return response.user;
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

export async function restoreUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/restore`);
}

// Organizations
export async function getOrganizations(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ organizations: AdminOrganization[]; pagination: Pagination }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/organizations?${query}` : '/admin/organizations';

  return api.get<{ organizations: AdminOrganization[]; pagination: Pagination }>(endpoint);
}

export async function getOrganization(orgId: string): Promise<AdminOrgDetail> {
  const response = await api.get<{ organization: AdminOrgDetail }>(`/admin/organizations/${orgId}`);
  return response.organization;
}

export async function updateOrganization(
  orgId: string,
  data: { name?: string; slug?: string; aiEnabled?: boolean }
): Promise<AdminOrganization> {
  const response = await api.patch<{ organization: AdminOrganization }>(
    `/admin/organizations/${orgId}`,
    data
  );
  return response.organization;
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await api.delete(`/admin/organizations/${orgId}`);
}

export async function restoreOrganization(orgId: string): Promise<void> {
  await api.post(`/admin/organizations/${orgId}/restore`);
}

// Audit Logs
export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  organizationId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
  organization: { name: string; slug: string } | null;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  organizationId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(
  filters?: AuditLogFilters
): Promise<{ logs: AuditLogEntry[]; pagination: Pagination }> {
  const searchParams = new URLSearchParams();
  if (filters?.page) searchParams.set('page', filters.page.toString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.action) searchParams.set('action', filters.action);
  if (filters?.userId) searchParams.set('userId', filters.userId);
  if (filters?.organizationId) searchParams.set('organizationId', filters.organizationId);
  if (filters?.resourceType) searchParams.set('resourceType', filters.resourceType);
  if (filters?.startDate) searchParams.set('startDate', filters.startDate);
  if (filters?.endDate) searchParams.set('endDate', filters.endDate);

  const query = searchParams.toString();
  const endpoint = query ? `/admin/audit-logs?${query}` : '/admin/audit-logs';

  const response = await api.get<{
    data: { logs: AuditLogEntry[]; pagination: Pagination };
  }>(endpoint);
  return response.data;
}

export async function getAuditLogActions(): Promise<string[]> {
  const response = await api.get<{ data: { actions: string[] } }>('/admin/audit-logs/actions');
  return response.data.actions;
}

// System Settings
export interface SystemSettings {
  siteName: string;
  allowSignups: boolean;
  requireEmailVerification: boolean;
  sessionMaxAge: number;
  maxOrganisationsPerUser: number;
  defaultUserLocale: string;
  aiEnabled: boolean;
  openrouterApiKey: string | null;
  openrouterModel: string;
  updatedAt: string;
}

export interface UpdateSystemSettingsData {
  siteName?: string;
  allowSignups?: boolean;
  requireEmailVerification?: boolean;
  sessionMaxAge?: number;
  maxOrganisationsPerUser?: number;
  defaultUserLocale?: string;
  aiEnabled?: boolean;
  openrouterApiKey?: string | null;
  openrouterModel?: string;
}

export interface AiTestResult {
  success: boolean;
  message: string;
  model?: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await api.get<{ settings: SystemSettings }>('/admin/settings');
  return response.settings;
}

export async function updateSystemSettings(
  data: UpdateSystemSettingsData
): Promise<SystemSettings> {
  const response = await api.patch<{ settings: SystemSettings }>('/admin/settings', data);
  return response.settings;
}

export async function testAiConnection(): Promise<AiTestResult> {
  const response = await api.post<{ result: AiTestResult }>('/admin/ai/test');
  return response.result;
}
