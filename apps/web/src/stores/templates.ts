import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Template, Page } from '@librediary/shared';
import { templatesService } from '@/services/templates.service';
import type {
  CreateTemplateInput,
  CreateTemplateFromPageInput,
  UpdateTemplateInput,
  UseTemplateInput,
} from '@/services/templates.service';
import { useAuthStore } from './auth';

export const useTemplatesStore = defineStore('templates', () => {
  // ===========================================
  // STATE
  // ===========================================

  const templates = ref<Template[]>([]);
  const loading = ref(false);
  const categoryFilter = ref<string | null>(null);
  const searchQuery = ref('');

  // ===========================================
  // GETTERS
  // ===========================================

  const filteredTemplates = computed(() => {
    let result = templates.value;

    if (categoryFilter.value) {
      result = result.filter((t) => t.category === categoryFilter.value);
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    return result;
  });

  const categories = computed(() => {
    const cats = new Set<string>();
    for (const t of templates.value) {
      if (t.category) cats.add(t.category);
    }
    return Array.from(cats).sort();
  });

  const builtInTemplates = computed(() => templates.value.filter((t) => t.isBuiltIn));

  const userTemplates = computed(() => templates.value.filter((t) => !t.isBuiltIn));

  // ===========================================
  // HELPERS
  // ===========================================

  function getOrgId(): string {
    const authStore = useAuthStore();
    if (!authStore.currentOrganizationId) {
      throw new Error('No organisation selected');
    }
    return authStore.currentOrganizationId;
  }

  // ===========================================
  // ACTIONS
  // ===========================================

  async function fetchTemplates(): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await templatesService.getTemplates(orgId);
      templates.value = data.templates;
    } finally {
      loading.value = false;
    }
  }

  async function createTemplate(input: CreateTemplateInput): Promise<Template> {
    const orgId = getOrgId();
    const data = await templatesService.createTemplate(orgId, input);
    templates.value.push(data.template);
    return data.template;
  }

  async function createTemplateFromPage(input: CreateTemplateFromPageInput): Promise<Template> {
    const orgId = getOrgId();
    const data = await templatesService.createTemplateFromPage(orgId, input);
    templates.value.push(data.template);
    return data.template;
  }

  async function updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<Template> {
    const orgId = getOrgId();
    const data = await templatesService.updateTemplate(orgId, templateId, input);
    const index = templates.value.findIndex((t) => t.id === templateId);
    if (index !== -1) {
      templates.value[index] = data.template;
    }
    return data.template;
  }

  async function deleteTemplate(templateId: string): Promise<void> {
    const orgId = getOrgId();
    await templatesService.deleteTemplate(orgId, templateId);
    templates.value = templates.value.filter((t) => t.id !== templateId);
  }

  async function createPageFromTemplate(
    templateId: string,
    input?: UseTemplateInput
  ): Promise<Page> {
    const orgId = getOrgId();
    const data = await templatesService.createPageFromTemplate(orgId, templateId, input);
    return data.page;
  }

  function reset() {
    templates.value = [];
    loading.value = false;
    categoryFilter.value = null;
    searchQuery.value = '';
  }

  return {
    // State
    templates,
    loading,
    categoryFilter,
    searchQuery,
    // Getters
    filteredTemplates,
    categories,
    builtInTemplates,
    userTemplates,
    // Actions
    fetchTemplates,
    createTemplate,
    createTemplateFromPage,
    updateTemplate,
    deleteTemplate,
    createPageFromTemplate,
    reset,
  };
});
