import { prisma } from '../../lib/prisma.js';

// ===========================================
// TYPES
// ===========================================

export interface CreateTemplateInput {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
}

export interface GetTemplatesOptions {
  category?: string;
  search?: string;
}

export interface CreatePageFromTemplateInput {
  title?: string;
  parentId?: string | null;
}

// ===========================================
// TEMPLATE CRUD
// ===========================================

/**
 * Create a new template
 */
export async function createTemplate(orgId: string, userId: string, input: CreateTemplateInput) {
  return prisma.template.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name: input.name,
      description: input.description,
      icon: input.icon,
      category: input.category,
    },
  });
}

/**
 * Create a template from an existing page
 */
export async function createTemplateFromPage(
  orgId: string,
  userId: string,
  pageId: string,
  input?: Partial<CreateTemplateInput>
) {
  const page = await prisma.page.findFirst({
    where: {
      id: pageId,
      organizationId: orgId,
    },
  });

  if (!page) {
    throw new Error('PAGE_NOT_FOUND');
  }

  return prisma.template.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      name: input?.name ?? page.title,
      description: input?.description,
      icon: input?.icon ?? page.icon,
      category: input?.category,
      yjsState: page.yjsState,
    },
  });
}

/**
 * Get all templates for an organisation (excludes yjsState for performance)
 */
export async function getTemplates(orgId: string, options?: GetTemplatesOptions) {
  const where: Record<string, unknown> = { organizationId: orgId };

  if (options?.category) {
    where.category = options.category;
  }

  if (options?.search) {
    where.name = { contains: options.search, mode: 'insensitive' };
  }

  return prisma.template.findMany({
    where,
    select: {
      id: true,
      organizationId: true,
      name: true,
      description: true,
      icon: true,
      category: true,
      isBuiltIn: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isBuiltIn: 'desc' }, { name: 'asc' }],
  });
}

/**
 * Get a single template by ID
 */
export async function getTemplate(orgId: string, templateId: string) {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId: orgId,
    },
  });

  if (!template) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  return template;
}

/**
 * Update a template
 */
export async function updateTemplate(
  orgId: string,
  templateId: string,
  input: UpdateTemplateInput
) {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId: orgId,
    },
  });

  if (!template) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  return prisma.template.update({
    where: { id: templateId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.category !== undefined && { category: input.category }),
    },
  });
}

/**
 * Delete a template (blocks built-in deletion)
 */
export async function deleteTemplate(orgId: string, templateId: string) {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId: orgId,
    },
  });

  if (!template) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  if (template.isBuiltIn) {
    throw new Error('CANNOT_DELETE_BUILTIN');
  }

  await prisma.template.delete({
    where: { id: templateId },
  });
}

/**
 * Create a page from a template
 */
export async function createPageFromTemplate(
  orgId: string,
  userId: string,
  templateId: string,
  input?: CreatePageFromTemplateInput
) {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId: orgId,
    },
  });

  if (!template) {
    throw new Error('TEMPLATE_NOT_FOUND');
  }

  return prisma.page.create({
    data: {
      organizationId: orgId,
      createdById: userId,
      title: input?.title ?? template.name,
      icon: template.icon,
      parentId: input?.parentId ?? null,
      yjsState: template.yjsState,
    },
  });
}
