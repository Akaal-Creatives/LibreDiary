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
  | 'INVITATION';

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
  | 'UPDATED_BY';

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

export interface Page {
  id: string;
  organizationId: string;
  parentId: string | null;
  position: number;
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
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// FILES & STORAGE
// ===========================================

export interface FileInfo {
  id: string;
  organizationId: string;
  pageId: string | null;
  name: string;
  mimeType: string;
  size: number;
  storageType: StorageType;
  url: string;
  createdAt: string;
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

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiToken {
  id: string;
  userId: string;
  name: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

// ===========================================
// TEMPLATES
// ===========================================

export interface Template {
  id: string;
  organizationId: string | null;
  userId: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  isPublic: boolean;
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
