import { api } from './api';
import type { Template, Page } from '@librediary/shared';

// ===========================================
// TYPES
// ===========================================

export interface CreateTemplateInput {
  name: string;
  description?: string;
  icon?: string;
  category?: string;
}

export interface CreateTemplateFromPageInput {
  pageId: string;
  name?: string;
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

export interface UseTemplateInput {
  title?: string;
  parentId?: string | null;
}

// ===========================================
// SERVICE
// ===========================================

export const templatesService = {
  async getTemplates(
    orgId: string,
    options?: GetTemplatesOptions
  ): Promise<{ templates: Template[] }> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.search) params.set('search', options.search);
    const query = params.toString();
    const url = `/organizations/${orgId}/templates${query ? `?${query}` : ''}`;
    return api.get<{ templates: Template[] }>(url);
  },

  async getTemplate(orgId: string, templateId: string): Promise<{ template: Template }> {
    return api.get<{ template: Template }>(`/organizations/${orgId}/templates/${templateId}`);
  },

  async createTemplate(orgId: string, input: CreateTemplateInput): Promise<{ template: Template }> {
    return api.post<{ template: Template }>(`/organizations/${orgId}/templates`, input);
  },

  async createTemplateFromPage(
    orgId: string,
    input: CreateTemplateFromPageInput
  ): Promise<{ template: Template }> {
    return api.post<{ template: Template }>(`/organizations/${orgId}/templates/from-page`, input);
  },

  async updateTemplate(
    orgId: string,
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<{ template: Template }> {
    return api.patch<{ template: Template }>(
      `/organizations/${orgId}/templates/${templateId}`,
      input
    );
  },

  async deleteTemplate(orgId: string, templateId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/templates/${templateId}`);
  },

  async seedBuiltInTemplates(orgId: string): Promise<{ created: number }> {
    return api.post<{ created: number }>(`/organizations/${orgId}/templates/seed`, {});
  },

  async createPageFromTemplate(
    orgId: string,
    templateId: string,
    input?: UseTemplateInput
  ): Promise<{ page: Page }> {
    return api.post<{ page: Page }>(
      `/organizations/${orgId}/templates/${templateId}/use`,
      input ?? {}
    );
  },
};
