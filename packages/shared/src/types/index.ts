/**
 * Shared TypeScript types
 */

// ===========================================
// ENUMS & CONSTANTS
// ===========================================

export type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type PermissionLevel = 'VIEW' | 'EDIT' | 'FULL_ACCESS';
export type PagePermissionLevel = PermissionLevel; // Alias for clarity
export type StorageType = 'LOCAL' | 'MINIO' | 'S3';
export type NotificationType =
  | 'MENTION'
  | 'COMMENT_REPLY'
  | 'PAGE_SHARED'
  | 'COMMENT_RESOLVED'
  | 'INVITATION'
  | 'TASK_DUE';

export type PropertyType =
  | 'TEXT'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'CHECKBOX'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'PERSON'
  | 'FILES'
  | 'RELATION'
  | 'ROLLUP'
  | 'FORMULA'
  | 'CREATED_TIME'
  | 'CREATED_BY'
  | 'UPDATED_TIME'
  | 'UPDATED_BY'
  | 'DURATION'
  | 'RECURRENCE';

export type RecurrenceStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type AutomationTriggerType = 'ROW_CREATED' | 'PROPERTY_UPDATED' | 'DATE_REACHED';
export type AutomationActionType = 'UPDATE_PROPERTY' | 'SEND_NOTIFICATION' | 'CREATE_PAGE';
export type AutomationLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type ViewType = 'TABLE' | 'KANBAN' | 'CALENDAR' | 'GALLERY';

// ===========================================
// API RESPONSE
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ===========================================
// USER & AUTH
// ===========================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

// OAuth providers
export type OAuthProvider = 'github' | 'google';

export interface LinkedAccount {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  createdAt: string;
}

export interface OAuthProviderConfig {
  provider: OAuthProvider;
  name: string;
  icon: string;
  configured: boolean;
}

// ===========================================
// ORGANIZATION
// ===========================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  accentColor: string | null;
  allowedDomains: string[];
  aiEnabled: boolean;
  isEncrypted: boolean;
  encryptionDisabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export interface OrganizationMembership extends OrganizationMember {
  organization: Organization;
  user?: User;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

// ===========================================
// PAGE & CONTENT
// ===========================================

export type PageType = 'document' | 'canvas';

export interface Page {
  id: string;
  organizationId: string;
  parentId: string | null;
  position: number;
  type: PageType;
  title: string;
  icon: string | null;
  coverUrl: string | null;
  htmlContent: string | null;
  isPublic: boolean;
  publicSlug: string | null;
  trashedAt: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageWithChildren extends Page {
  children: PageWithChildren[];
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  createdById: string;
  createdAt: string;
}

export interface PagePermission {
  id: string;
  pageId: string;
  userId: string | null;
  level: PermissionLevel;
  shareToken: string | null;
  expiresAt: string | null;
  grantedById: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  grantedBy?: User;
}

export interface Favorite {
  id: string;
  userId: string;
  pageId: string;
  position: number;
  page?: Page;
}

// ===========================================
// COMMENTS & MENTIONS
// ===========================================

export interface Comment {
  id: string;
  pageId: string;
  userId: string;
  blockId: string | null;
  content: string;
  parentId: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  replies?: Comment[];
}

export interface Mention {
  id: string;
  commentId: string;
  userId: string;
  createdAt: string;
}

// ===========================================
// DATABASE (Tables)
// ===========================================

export interface Database {
  id: string;
  organizationId: string;
  pageId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseProperty {
  id: string;
  databaseId: string;
  name: string;
  type: PropertyType;
  position: number;
  config: Record<string, unknown> | null;
}

export interface DatabaseView {
  id: string;
  databaseId: string;
  name: string;
  type: ViewType;
  position: number;
  config: Record<string, unknown> | null;
}

export interface DatabaseRow {
  id: string;
  databaseId: string;
  position: number;
  cells: Record<string, unknown>;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  recurrenceRule: string | null;
  recurrenceStatus: RecurrenceStatus | null;
  nextOccurrenceAt: string | null;
  recurrenceParentId: string | null;
}

export interface DatabaseWithRelations extends Database {
  properties: DatabaseProperty[];
  views: DatabaseView[];
  rows: DatabaseRow[];
}

// ===========================================
// AUTOMATIONS
// ===========================================

export interface Automation {
  id: string;
  organizationId: string;
  databaseId: string;
  name: string;
  isEnabled: boolean;
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown> | null;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown> | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLog {
  id: string;
  automationId: string;
  triggerRowId: string | null;
  status: AutomationLogStatus;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

// ===========================================
// FILES & STORAGE
// ===========================================

export interface FileInfo {
  id: string;
  organizationId: string;
  pageId: string | null;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageType: StorageType;
  storagePath: string;
  url: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface FilesCellItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface StorageInfo {
  type: StorageType;
  totalFiles: number;
  totalSize: number;
}

export interface StorageConnectionResult {
  success: boolean;
  message: string;
}

// ===========================================
// NOTIFICATIONS
// ===========================================

export interface NotificationData {
  pageId?: string;
  pageTitle?: string;
  commentId?: string;
  organizationId?: string;
  organizationName?: string;
  actorId?: string;
  actorName?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: NotificationData | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

// ===========================================
// SEARCH
// ===========================================

export interface SearchResult {
  id: string;
  title: string;
  titleHighlight: string;
  contentHighlight: string;
  icon: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  rank: number;
}

export interface SearchFilters {
  q: string;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

// ===========================================
// WEBHOOKS & API
// ===========================================

export type WebhookEvent =
  | 'page.created'
  | 'page.updated'
  | 'page.deleted'
  | 'database.created'
  | 'database.updated'
  | 'database.deleted'
  | 'comment.created'
  | 'comment.resolved'
  | 'member.added'
  | 'member.removed'
  | 'backup.completed';

export type WebhookDeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  secret: string; // Masked when returned from API (e.g. "whsec_****abcd")
  events: string[];
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  statusCode: number | null;
  responseBody: string | null;
  attempts: number;
  nextRetryAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  tokenPrefix: string; // First 8 chars for display
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiTokenCreateResponse extends ApiToken {
  rawToken: string; // Full token, shown only once
}

// ===========================================
// TEMPLATES
// ===========================================

export type TemplateCategory = 'Meeting' | 'Project' | 'Personal' | 'Team' | 'Other';

export interface Template {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  isBuiltIn: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// AUDIT & ADMIN
// ===========================================

export interface AuditLog {
  id: string;
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: User;
}

// ===========================================
// DEVELOPER INFO
// ===========================================

export interface DeveloperInfo {
  name: string;
  website: string;
}

export const DEVELOPER_INFO: DeveloperInfo = {
  name: 'Akaal Creatives',
  website: 'https://www.akaalcreatives.com',
};

// ===========================================
// BACKUPS
// ===========================================

export type BackupType = 'ORGANISATION' | 'SYSTEM';
export type BackupStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type BackupStorageType = 'LOCAL' | 'S3';

export interface Backup {
  id: string;
  type: BackupType;
  status: BackupStatus;
  organizationId: string | null;
  fileName: string | null;
  fileSize: number | null;
  storagePath: string | null;
  storageType: string | null;
  isEncrypted: boolean;
  errorMessage: string | null;
  triggeredById: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface BackupSettings {
  enabled: boolean;
  storageType: BackupStorageType;
  schedule: string;
  retentionDays: number;
  maxSizeMb: number;
  pgDumpAvailable: boolean;
}
