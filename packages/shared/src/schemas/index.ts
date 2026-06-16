/**
 * Zod validation schemas shared between frontend and backend
 */

import { z } from 'zod';

// ===========================================
// COMMON SCHEMAS
// ===========================================

export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

export const cuidSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ===========================================
// AUTH SCHEMAS
// ===========================================

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100).trim(),
  inviteToken: z.string().min(1, 'Invite token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// ===========================================
// ORGANIZATION SCHEMAS
// ===========================================

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  slug: slugSchema,
  allowedDomains: z.array(z.string()).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  allowedDomains: z.array(z.string()).optional(),
  aiEnabled: z.boolean().optional(),
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

// ===========================================
// PAGE SCHEMAS
// ===========================================

export const createPageSchema = z.object({
  title: z.string().max(500).optional(),
  parentId: cuidSchema.nullable().optional(),
  icon: z.string().max(50).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().max(500).optional(),
  parentId: cuidSchema.nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const movePageSchema = z.object({
  parentId: cuidSchema.nullable().optional(),
  position: z.number().int().min(0).optional(),
});

export const sharePageSchema = z.object({
  isPublic: z.boolean().optional(),
});

export const updatePagePermissionSchema = z.object({
  userId: cuidSchema.optional(),
  email: emailSchema.optional(),
  level: z.enum(['VIEW', 'EDIT', 'FULL_ACCESS']),
});

export const guestAccessSchema = z.object({
  email: emailSchema,
  name: z.string().max(100).optional(),
  level: z.enum(['VIEW', 'EDIT']).default('VIEW'),
  expiresAt: z.string().datetime().optional(),
});

// ===========================================
// COMMENT SCHEMAS
// ===========================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(10000),
  blockId: z.string().optional(),
  parentId: cuidSchema.optional(),
  mentions: z.array(cuidSchema).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  resolved: z.boolean().optional(),
});

// ===========================================
// DATABASE SCHEMAS
// ===========================================

export const createDatabaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  pageId: cuidSchema.optional(),
});

export const propertyTypeSchema = z.enum([
  'TEXT',
  'NUMBER',
  'SELECT',
  'MULTI_SELECT',
  'DATE',
  'CHECKBOX',
  'URL',
  'EMAIL',
  'PHONE',
  'PERSON',
  'FILES',
  'RELATION',
  'ROLLUP',
  'FORMULA',
  'CREATED_TIME',
  'CREATED_BY',
  'UPDATED_TIME',
  'UPDATED_BY',
  'DURATION',
  'RECURRENCE',
]);

// ===========================================
// PROPERTY CONFIG SCHEMAS (per-type validation)
// ===========================================

const selectOptionSchema = z.object({
  label: z.string().min(1).max(100),
  colour: z.string().max(30).optional(),
});

export const selectConfigSchema = z.object({
  options: z.array(selectOptionSchema).max(200),
});

export const numberConfigSchema = z.object({
  format: z.enum(['number', 'percent', 'currency']).optional(),
});

export const durationConfigSchema = z.object({
  precision: z.enum(['seconds', 'minutes', 'hours']).optional(),
  format: z.enum(['hms', 'decimal']).optional(),
});

export const filesConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string().max(100)).max(50).optional(),
});

export const relationConfigSchema = z.object({
  targetDatabaseId: z.string().min(1),
});

export const rollupConfigSchema = z.object({
  relationPropertyId: z.string().min(1),
  targetPropertyId: z.string().min(1),
  aggregation: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX']),
});

export const formulaConfigSchema = z.object({
  expression: z.string().max(5000),
});

export const recurrenceConfigSchema = z.object({
  // Default RRULE applied to new rows using this property; individual rows can override via recurrenceRule
  defaultRule: z.string().max(500).optional(),
});

/** Map of property types to their config schemas. Types not listed accept no config. */
const propertyConfigSchemas: Partial<Record<z.infer<typeof propertyTypeSchema>, z.ZodType>> = {
  SELECT: selectConfigSchema,
  MULTI_SELECT: selectConfigSchema,
  NUMBER: numberConfigSchema,
  DURATION: durationConfigSchema,
  FILES: filesConfigSchema,
  RELATION: relationConfigSchema,
  ROLLUP: rollupConfigSchema,
  FORMULA: formulaConfigSchema,
  RECURRENCE: recurrenceConfigSchema,
};

/**
 * Validate property config against its type-specific schema.
 * Returns the validated config, or null if the type has no config schema.
 * Throws ZodError if config is invalid.
 */
export function validatePropertyConfig(
  type: z.infer<typeof propertyTypeSchema>,
  config: unknown
): Record<string, unknown> | null {
  const schema = propertyConfigSchemas[type];
  if (!schema) return null;
  if (config == null) return null;
  return schema.parse(config) as Record<string, unknown>;
}

export const createPropertySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: propertyTypeSchema,
  config: z.record(z.unknown()).optional(),
});

export const viewTypeSchema = z.enum(['TABLE', 'KANBAN', 'CALENDAR', 'GALLERY']);

export const createViewSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: viewTypeSchema,
  config: z.record(z.unknown()).optional(),
});

export const updateDatabaseSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  pageId: cuidSchema.nullable().optional(),
});

export const updatePropertySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: propertyTypeSchema.optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export const updateViewSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: viewTypeSchema.optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export const createRowSchema = z.object({
  cells: z.record(z.unknown()).optional(),
});

export const updateRowSchema = z.object({
  cells: z.record(z.unknown()).optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

// ===========================================
// TEMPLATE SCHEMAS
// ===========================================

export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
});

export const createTemplateFromPageSchema = z.object({
  pageId: z.string().min(1, 'Page ID is required'),
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});

// ===========================================
// FILE SCHEMAS
// ===========================================

export const fileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255),
  pageId: cuidSchema.optional(),
});

export const fileListQuerySchema = z.object({
  pageId: cuidSchema.optional(),
});

// ===========================================
// API TOKEN SCHEMAS
// ===========================================

export const createApiTokenSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  expiresAt: z.string().datetime().optional(),
});

// ===========================================
// WEBHOOK SCHEMAS
// ===========================================

export const webhookEventSchema = z.enum([
  'page.created',
  'page.updated',
  'page.deleted',
  'database.created',
  'database.updated',
  'database.deleted',
  'comment.created',
  'comment.resolved',
  'member.added',
  'member.removed',
  'backup.completed',
]);

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  url: z.string().url('Invalid URL'),
  events: z.array(webhookEventSchema).min(1, 'At least one event is required'),
});

export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  url: z.string().url().optional(),
  events: z.array(webhookEventSchema).optional(),
  isActive: z.boolean().optional(),
});

// ===========================================
// SEARCH SCHEMAS
// ===========================================

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  type: z.enum(['all', 'pages', 'databases', 'comments']).optional(),
  ...paginationSchema.shape,
});

// ===========================================
// AI SCHEMAS
// ===========================================

export const translateSchema = z.object({
  content: z.string().min(1).max(50000),
  targetLanguage: z.string().min(2).max(10),
  sourceLanguage: z.string().min(2).max(10).optional(),
});

// ===========================================
// BACKUP SCHEMAS
// ===========================================

export const createOrgBackupSchema = z
  .object({
    encrypt: z.boolean().default(false),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .refine((data) => !data.encrypt || (data.encrypt && data.password), {
    message: 'Password is required when encryption is enabled',
    path: ['password'],
  });

export const createSystemBackupSchema = z
  .object({
    encrypt: z.boolean().default(false),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  })
  .refine((data) => !data.encrypt || (data.encrypt && data.password), {
    message: 'Password is required when encryption is enabled',
    path: ['password'],
  });

export const restoreOrgBackupSchema = z.object({
  password: z.string().optional(),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type MovePageInput = z.infer<typeof movePageSchema>;
export type SharePageInput = z.infer<typeof sharePageSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;
export type UpdateDatabaseInput = z.infer<typeof updateDatabaseSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateViewInput = z.infer<typeof createViewSchema>;
export type UpdateViewInput = z.infer<typeof updateViewSchema>;
export type CreateRowInput = z.infer<typeof createRowSchema>;
export type UpdateRowInput = z.infer<typeof updateRowSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CreateTemplateFromPageInput = z.infer<typeof createTemplateFromPageSchema>;
export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type TranslateInput = z.infer<typeof translateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type FileListQueryInput = z.infer<typeof fileListQuerySchema>;
export type CreateOrgBackupInput = z.infer<typeof createOrgBackupSchema>;
export type CreateSystemBackupInput = z.infer<typeof createSystemBackupSchema>;
export type RestoreOrgBackupInput = z.infer<typeof restoreOrgBackupSchema>;
